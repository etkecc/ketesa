/**
 * React-admin lifecycle callbacks for the Synapse data provider.
 *
 * Wraps the base data provider with beforeUpdate / beforeDelete / afterDelete hooks
 * that dispatch side-effects (MAS auth changes, Synapse profile updates, media cleanup).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { DataProvider, DeleteManyParams, DeleteParams, UpdateParams, withLifecycleCallbacks } from "react-admin";

import { jsonClient } from "../http";
import { SynapseDataProvider } from "../types";
import { isMAS } from "./mas-utils";
import { deleteUserMedia } from "./synapse-actions";
import { invalidateManyRefCache } from "./synapse";

/**
 * Wrap a base SynapseDataProvider with lifecycle callbacks for user and room resources.
 * Returns the wrapped provider, which is the dataProvider used by the app.
 */
export const wrapWithLifecycle = (base: SynapseDataProvider): SynapseDataProvider =>
  withLifecycleCallbacks(base, [
    {
      resource: "rooms",
      afterDelete: async result => {
        // Invalidate the joined_rooms cache after room deletion
        invalidateManyRefCache("joined_rooms");
        return result;
      },
      afterDeleteMany: async result => {
        // Invalidate the joined_rooms cache after room deletion
        invalidateManyRefCache("joined_rooms");
        return result;
      },
    },
    {
      resource: "users",
      beforeUpdate: async (params: UpdateParams<any>, dataProvider: DataProvider) => {
        // In MAS mode: dispatch MAS auth-field changes and skip Synapse-only logic.
        // When the user has no MAS account (Synapse-only, typically appservice/bot users),
        // mas_id is undefined and we fall through to the Synapse-only branch below.
        const masId = params.previousData.mas_id as string | undefined;
        if (isMAS() && masId) {
          const prev = params.previousData;
          const next = params.data;

          // MAS-managed fields: only fire when the field was actually submitted (not disabled/omitted).
          // Disabled BooleanInputs (e.g. admin editing their own account) are excluded from react-hook-form
          // submission, leaving the value as undefined. Guarding with !== undefined prevents spurious API
          // calls that would e.g. strip admin from the current user or unlock an already-unlocked account.
          // Also normalise to strict booleans to guard against undefined/null from incomplete cache data.
          const prevAdmin = prev.admin === true;
          const nextAdmin = next.admin === true;
          if (next.admin !== undefined && prevAdmin !== nextAdmin)
            await (dataProvider as SynapseDataProvider).masSetAdmin(masId, nextAdmin);

          const prevLocked = prev.locked === true;
          const nextLocked = next.locked === true;
          if (next.locked !== undefined && prevLocked !== nextLocked)
            await (dataProvider as SynapseDataProvider).masLockUser(masId, nextLocked);

          const prevDeactivated = prev.deactivated === true;
          const nextDeactivated = next.deactivated === true;
          if (next.deactivated !== undefined && prevDeactivated !== nextDeactivated)
            // masDeactivateUser(id, active): true = reactivate, false = deactivate
            await (dataProvider as SynapseDataProvider).masDeactivateUser(masId, !nextDeactivated);

          // Synapse-managed profile fields (not disabled by MSC3861)
          if (prev.suspended !== next.suspended && next.suspended !== undefined)
            await (dataProvider as SynapseDataProvider).suspendUser(params.id, next.suspended);
          if (prev.shadow_banned !== next.shadow_banned && next.shadow_banned !== undefined)
            await (dataProvider as SynapseDataProvider).shadowBanUser(params.id, next.shadow_banned);

          // Handle avatar upload / erase before the Synapse profile PUT
          const avatarFile = next.avatar_file?.rawFile;
          const avatarErase = next.avatar_erase;
          if (avatarErase) {
            next.avatar_src = null;
          } else if (avatarFile instanceof File) {
            const uploaded = await (dataProvider as SynapseDataProvider).uploadMedia({
              file: avatarFile,
              filename: next.avatar_file.title,
              content_type: avatarFile.type,
            });
            next.avatar_src = uploaded.content_uri;
          }

          // Synapse-managed profile fields sent via main PUT /_synapse/admin/v2/users/...
          const synapseProfileChanged =
            prev.displayname !== next.displayname ||
            prev.avatar_src !== next.avatar_src ||
            prev.user_type !== next.user_type;
          if (synapseProfileChanged) {
            const baseUrl = localStorage.getItem("base_url") || "";
            const matrixId = encodeURIComponent(String(params.id));

            const body: Record<string, any> = {};
            if (prev.displayname !== next.displayname) body.displayname = next.displayname ?? "";
            if (prev.avatar_src !== next.avatar_src) body.avatar_url = next.avatar_src ?? "";
            if (prev.user_type !== next.user_type) body.user_type = next.user_type ?? null;
            await jsonClient(`${baseUrl}/_synapse/admin/v2/users/${matrixId}`, {
              method: "PUT",
              body: JSON.stringify(body),
            });
          }

          return params;
        }

        const avatarFile = params.data.avatar_file?.rawFile;
        const avatarErase = params.data.avatar_erase;
        const rates = params.data.rates;
        const suspended = params.data.suspended;
        const previousSuspended = params.previousData?.suspended;
        const shadowBanned = params.data.shadow_banned;
        const previousShadowBanned = params.previousData?.shadow_banned;
        const deactivated = params.data.deactivated;
        const previousDeactivated = params.previousData?.deactivated;
        const erased = params.data.erased;
        const previousErased = params.previousData?.erased;

        if (rates) {
          await dataProvider.setRateLimits(params.id, rates);
          delete params.data.rates;
        }

        if (suspended !== undefined && suspended !== previousSuspended) {
          await (dataProvider as SynapseDataProvider).suspendUser(params.id, suspended);
          delete params.data.suspended;
        }

        if (shadowBanned !== undefined && shadowBanned !== previousShadowBanned) {
          await (dataProvider as SynapseDataProvider).shadowBanUser(params.id, shadowBanned);
          delete params.data.shadow_banned;
        }

        if (
          deactivated === true &&
          erased === true &&
          (deactivated !== previousDeactivated || erased !== previousErased)
        ) {
          const result = await (dataProvider as SynapseDataProvider).eraseUser(params.id);
          if (!result.success) {
            return Promise.reject(new Error(result.error || "Failed to erase user"));
          }
          // Erase is terminal for this save: skip the follow-up profile PUT. PUT /v2/users is
          // create-or-recreate, so letting it run would recreate the profile we just erased.
          // Re-editing an already-erased user does not re-enter this branch (the change check above
          // is false when both flags are unchanged), so recreating an erased user via a normal edit
          // still works. Note: returning here exits beforeUpdate only; react-admin still runs any
          // registered beforeSave on params.data; there is none on "users" today, keep it that way.
          params.meta = { ...params.meta, userErased: true };
          return params;
        }

        if (avatarErase) {
          params.data.avatar_url = "";
          return params;
        }

        if (avatarFile instanceof File) {
          const response = await dataProvider.uploadMedia({
            file: avatarFile,
            filename: params.data.avatar_file.title,
            content_type: params.data.avatar_file.rawFile.type,
          });
          params.data.avatar_url = response.content_uri;
        }
        return params;
      },
      beforeDelete: async (params: DeleteParams<any>, _dataProvider: DataProvider) => {
        if (params.meta?.deleteMedia) await deleteUserMedia(params.id);
        return params;
      },
      beforeDeleteMany: async (params: DeleteManyParams<any>, _dataProvider: DataProvider) => {
        await Promise.all(
          params.ids.map(async id => {
            if (params.meta?.deleteMedia) await deleteUserMedia(id);
          })
        );
        return params;
      },
    },
  ]) as SynapseDataProvider;
