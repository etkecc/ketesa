import { Confirm, SaveButton, setSubmissionErrors, useRecordContext, useSaveContext, useTranslate } from "react-admin";
import { useFormContext } from "react-hook-form";
import { useRef, useState } from "react";

import TypeToConfirmDialog from "./TypeToConfirmDialog";

type DangerDialog = "none" | "erase" | "escalate";

const preLineStyle = { whiteSpace: "pre-line" as const };

/**
 * Save button for the user Edit form that gates dangerous transitions behind a confirmation.
 *
 * The gate lives at the SAVE boundary, not on the checkbox click: we diff the submitted form
 * values against the loaded record (the same prev/next shape lifecycle.ts works from) and chain
 * the right dialog before the real save runs. This survives a future regression in the save path
 * the way a per-toggle confirm would not.
 *
 * Severity wins: at most one dialog per save. An erase escalation shows the strong type-the-MXID
 * dialog (and covers the deactivation it implies); otherwise a deactivate/admin escalation shows a
 * light confirm. Confirmations fire only on escalation (off -> on), never on de-escalation.
 */
const DangerZoneSaveButton = () => {
  const record = useRecordContext();
  const form = useFormContext();
  const saveContext = useSaveContext();
  const translate = useTranslate();
  const save = saveContext?.save;

  const [dialog, setDialog] = useState<DangerDialog>("none");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pending, setPending] = useState<Record<string, any> | null>(null);
  const [escalations, setEscalations] = useState<string[]>([]);
  // In-flight guard: erase is a destructive one-shot, so save() must fire at most once per action
  // even if the operator double-clicks the dialog Confirm before the first await resolves.
  const saving = useRef(false);

  const mxid = String(record?.id ?? "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runSave = async (values: Record<string, any>) => {
    if (!save || saving.current) return;
    saving.current = true;
    try {
      // Mirror react-admin's SaveButton: surface field-level submission errors on the form.
      const errors = await save(values);
      if (errors != null) setSubmissionErrors(errors, form.setError);
    } finally {
      saving.current = false;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onValid = async (values: Record<string, any>) => {
    // Strict-boolean escalation check (off -> on), mirroring lifecycle.ts so undefined/null cache
    // noise can't pop a spurious dialog.
    const escalated = (field: string) => record?.[field] !== true && values[field] === true;
    const eraseEscalated = escalated("erased");
    const deactivateEscalated = escalated("deactivated");
    const adminEscalated = escalated("admin");

    if (eraseEscalated) {
      setPending(values);
      setDialog("erase");
      return;
    }

    if (deactivateEscalated || adminEscalated) {
      const list: string[] = [];
      if (deactivateEscalated) list.push(translate("resources.users.confirm.escalate_deactivate"));
      if (adminEscalated) list.push(translate("resources.users.confirm.escalate_admin"));
      setEscalations(list);
      setPending(values);
      setDialog("escalate");
      return;
    }

    await runSave(values);
  };

  // type="button" means SaveButton won't submit the form itself; we preventDefault so its internal
  // fallback submit (SaveButton handleClick) bails out at `event.defaultPrevented`, then run
  // validation manually and intercept dangerous transitions before saving.
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    form.handleSubmit(onValid)();
  };

  const closeDialog = () => {
    setDialog("none");
    setPending(null);
    setEscalations([]);
  };

  const confirmSave = async () => {
    const values = pending;
    closeDialog();
    if (values) await runSave(values);
  };

  return (
    <>
      <SaveButton type="button" onClick={handleClick} />
      <TypeToConfirmDialog
        isOpen={dialog === "erase"}
        title={translate("resources.users.confirm.erase_title")}
        content={translate("resources.users.confirm.erase_body")}
        expectedValue={mxid}
        inputLabel={translate("resources.users.confirm.erase_type_prompt", { mxid })}
        onConfirm={confirmSave}
        onClose={closeDialog}
      />
      <Confirm
        isOpen={dialog === "escalate"}
        title={translate("resources.users.confirm.escalate_title")}
        content={<span style={preLineStyle}>{escalations.join("\n")}</span>}
        onConfirm={confirmSave}
        onClose={closeDialog}
      />
    </>
  );
};

export default DangerZoneSaveButton;
