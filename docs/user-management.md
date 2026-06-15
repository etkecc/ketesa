# User management

The user list and the per-user edit page are where you do the things that affect real accounts: log in as someone to debug their session, freeze an abuser, wipe an account on request. Most of it is routine. A few actions are not, and the interface does not make the dangerous ones look any different from the safe ones, so three things are worth knowing before you touch anything destructive.

Logging in as a user mints an access token with that user's full privileges, and by default that token never expires. Erasing an account purges the user's messages and media from the server, and that does not come back. And the same "Delete" button does different things depending on your auth mode: on native Synapse it erases, under MAS it only deactivates.

Ketesa works in two modes. Native Synapse authentication is the default. When `externalAuthProvider` is configured, Matrix Authentication Service (MAS) handles logins, an extra set of MAS panels appears on the edit page, and a few native controls swap out or disappear. Each section below flags where the mode changes the behaviour.

## Contents

- [The list](#the-list)
- [Logging in as a user](#logging-in-as-a-user)
- [Deactivating, erasing, and deleting](#deactivating-erasing-and-deleting)
- [Shadow ban](#shadow-ban)
- [Rate limits](#rate-limits)
- [Experimental features](#experimental-features)
- [Account data](#account-data)
- [Server notices](#server-notices)
- [MAS mode](#mas-mode)
- [Bulk import](#bulk-import)

## The list

| Light | Dark |
|-------|------|
| ![Users list (light)](./screenshots/light/users-list.webp) | ![Users list (dark)](./screenshots/dark/users-list.webp) |

Search by display name or user ID with the box at the top. Tick the row checkboxes to bring up a bulk-action toolbar at the bottom of the list (send a server notice, or delete). The list toolbar also holds the CSV Import button for creating accounts in bulk, covered in [CSV import](./csv-import.md).

## Logging in as a user

| Light | Dark |
|-------|------|
| ![User edit (light)](./screenshots/light/users-edit.webp) | ![User edit (dark)](./screenshots/dark/users-edit.webp) |

The "Login as user" button sits in the top toolbar of the edit page. It shows up only in native Synapse mode, and only while the account is not deactivated. Clicking it generates an access token tied to that account and signs you in as them, which is how you reproduce a bug that only happens for one user, or check that a permission change looks right from their side.

Be clear about what that token is. It carries the user's full privileges, and it does not expire on its own. There is an optional expiry toggle, but it is off by default, so unless you set it you have created a credential that can act as that person until you revoke it. Revoke it by logging out the moment the support task is done. Do not generate one, finish up, and walk away from the tab.

Under MAS this button is gone, because MAS owns authentication. To act on a MAS user's behalf, reset their password or create a personal session for them (see [MAS mode](#mas-mode)).

## Deactivating, erasing, and deleting

This is the destructive part of the page, and it has more edges than it looks. There is no single "danger zone"; the controls live in two places that behave differently.

On the edit form there are two checkboxes:

- **Deactivated** disables login, invalidates the user's access tokens, and removes them from their rooms. The account record and message history stay intact. This is reversible: uncheck Deactivated and set a new password to bring the account back.
- **Erased** does everything Deactivate does and additionally asks Synapse to purge the user's messages and media. That purge is permanent. The deactivation can be undone; the content removal cannot.

The Erased checkbox only becomes active once Deactivated is checked. If you then uncheck Erased on an account that was already erased, Ketesa also unchecks Deactivated, which reactivates the account record. The messages and media that were already purged do not come back. You get the account back, empty.

The **"Delete" button** is a separate path, and it is the one to be careful with, because what it does depends on your mode. It appears both in the edit-page toolbar and in the list's bulk-action toolbar:

- On native Synapse, "Delete" erases. It deactivates the account and purges its content, the same permanent removal as the Erased checkbox. The confirmation dialog adds two options: also delete the user's media, and redact the user's events first (the redaction runs in the background, then the deletion completes). Do not read this button as "remove a row from a list." It wipes the person.
- Under MAS, "Delete" only deactivates, leaving the media and redaction options hidden.

So the same button, with the same label, is a permanent erase in one mode and a reversible deactivation in the other. Know which mode you are in before you click it.

You cannot deactivate, erase, or delete your own admin account. Ketesa blocks that both on the edit form and in the bulk actions.

## Shadow ban

A shadow-banned user can still send messages, and from their side everything looks normal, but the server quietly drops those messages instead of delivering them. It is the silent alternative to deactivation: useful for a spam or abuse account you want to mute without tipping them off, or to hold a moderation window open while you investigate.

Toggle "Shadow banned" in the moderation section of the edit page and save. Turn it off the same way. Messages sent while the ban was on are not delivered retroactively.

One caveat worth knowing, because it will mislead you otherwise: as of Synapse v1.149.1 the user-list filter for shadow-banned users is broken. It returns all users instead of only the banned ones, so it is disabled in the UI until upstream fixes it. The shadow-ban column in the list is accurate; only the filter is out.

## Rate limits

On the Rate limits tab of the edit page, two fields override the server-wide limits from `homeserver.yaml` for this one user: `messages_per_second`, the sustained send rate, and `burst_count`, how many messages they can send in a burst before the sustained rate applies. This is mostly for a bot or integration account that legitimately sends more than a person would.

To drop the override and put the user back on the server default, clear both fields and save. Leave them blank, not zero. A zero is a real limit of zero messages; blank is what removes the override.

## Experimental features

Per-user toggles for Synapse's experimental MSC features, on the edit page. A toggle takes effect on save, with no server restart. The two that Ketesa labels are `msc3881` (remotely toggling another client's push notifications) and `msc3575` (sliding sync). The panel actually lists whatever MSC flags the server reports for that user, so if your Synapse exposes others they will appear here too, just without a friendly description next to them. Enabling a flag for one user has no effect on anyone else; server-wide MSC enablement is still controlled in `homeserver.yaml`.

## Account data

A read-only JSON view of the account data Synapse holds for the user, the same data exposed by the Matrix `/account_data` client API. Two collapsible sections split it: Global, for account-wide entries like push rules (`m.push_rules`) and client settings, and Rooms, for per-room entries like tags and read markers, keyed by room ID. You cannot edit it here; that needs the Admin API or a client signed in as the user. Reach for it when you are chasing why a user's push notifications or room tags behave oddly.

## Server notices

Server notices are administrative messages delivered to a user as an ordinary Matrix message in a dedicated system room, sent from the server's notices bot. They require `server_notices` to be configured in `homeserver.yaml`; without it the send fails with an error.

Send one to a single user from the "Send server notice" button in the edit-page toolbar, or to several at once by selecting them in the list and using the same button in the bulk toolbar. A bulk send goes to each selected user individually, one message in each person's own notices room. It is a one-way channel: the user cannot reply back to you through it, so for a real conversation reach them in a normal room.

## MAS mode

These features appear only when `externalAuthProvider` is set and [Matrix Authentication Service](./external-auth-provider.md) is configured. MAS keeps its own account-state and session model alongside Synapse's, so a few of these overlap with the native controls and a few replace them.

### Creating a user

The create form has three fields: `username` (the local part only, no `@` and no server suffix), an optional `password` (with a generate button for a strong random one), and `admin` to grant server-administrator status on creation. On save, MAS creates the account, Synapse provisions the matching user record, and you land on the normal edit page to set the displayname, avatar, and the rest.

### Setting a password

The standard reset-password button is replaced by "Set password", which sets the password through the MAS API, the correct path when MAS handles authentication.

### Account state

MAS adds its own Deactivated and Locked states, each shown with a timestamp chip for when it was applied. Deactivated prevents login through MAS; Locked temporarily blocks login without fully deactivating the account. Both are distinct from Synapse-level deactivation, and both can be active at the same time: MAS controls whether the user can authenticate through MAS, while Synapse deactivation is what removes them from rooms and purges their tokens. The moderation controls in MAS mode also include the suspended and shadow-banned toggles.

### Sessions

The Sessions tab (MAS only) splits a user's sessions across four sub-tabs. Any session can be ended from its row; the button is labelled "Terminate", and terminating one immediately invalidates its token and logs out whatever is using it.

| Sub-tab | What it is | What it shows |
|---------|-----------|---------------|
| Personal | Long-lived API tokens, for bots or automation | scope, name, active status, expiry |
| Browser | Interactive browser logins | IP address, user agent, last active time |
| OAuth2 | Sessions from OAuth 2.0 client applications | client ID, granted scopes, name, last active time |
| Compat | Legacy sessions bridging the old Synapse login flow to MAS | device ID, name, last active IP |

You can also create a personal session from the Personal sub-tab, giving it a name, a scope, and an optional expiry. The generated access token is shown once in a dialog; copy it before you close the dialog, because it cannot be retrieved again.

### Emails

The 3PIDs / Emails tab lists the email addresses linked to the user's MAS account, with their registration dates. Add one through its create form (a separate page with a user picker and an email field), and remove one with the button on its row, which unlinks it immediately. These addresses live in MAS, not in Synapse's `threepids` table.

### Upstream OAuth links

The SSO / Upstream OAuth tab lists the user's links to external identity providers (Google, GitHub, a corporate IdP, whatever MAS has configured), showing the provider ID, the subject identifier, and the account name. Remove a link with its delete button. Removing it means the user can no longer sign in through that provider, so make sure they have another way in, a password or another link, before you remove it.

### Policy data

The Policy Data page, reached from the MAS section of the sidebar, shows the current MAS consent policy as formatted JSON with its creation time, or a note that none is set. To replace it, paste a new JSON object into the editor and click Set Policy. The editor parses as you type and keeps the save button disabled until the input is valid JSON. Note that an empty editor also leaves the button disabled, with no error shown, so a greyed-out button on a blank field is expected, not a bug. Setting a new policy replaces the existing one at once, and MAS users may be prompted to accept the new terms on their next login.

## Bulk import

Create many accounts at once from a CSV file, through the CSV Import button in the list toolbar. The file format, the required and optional columns, and how errors are handled are all covered in [CSV import](./csv-import.md).

---

See also: [CSV import](./csv-import.md) · [System users](./system-users.md) · [External auth provider](./external-auth-provider.md) · [User search](./user-search.md) · [Documentation index](./README.md)
