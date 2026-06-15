# Media management

Ketesa's media controls let you quarantine, protect, and delete media at the file, user, and room level, and purge or delete media in bulk from the Statistics page. Most of it is reversible. The deletions are not, and a few controls behave less obviously than their labels suggest, so read those before you reach for them.

Quarantine and protect are mutually exclusive, and the interface enforces it by swapping controls rather than disabling them in place: a protected file shows a greyed-out **Protected** where its quarantine button would be, and a quarantined file shows a greyed-out **In quarantine** where its protect button would be. A control that isn't there is telling you the file's state, not hiding a bug.

Two more things do less, or more, than their labels imply. The room **Delete all media** action only ever removes local media from unencrypted events, so media in encrypted rooms and media hosted on other servers is never touched. And the Statistics **Delete media** sweep defaults its cutoff to three months ago, so confirming it unchanged removes every local file nobody has accessed in the last quarter.

None of this changes with your auth mode. Every media action calls the Synapse admin API directly and behaves the same under native Synapse or Matrix Authentication Service (MAS).

## Contents

- [What the operations do](#what-the-operations-do)
- [Per-file actions](#per-file-actions)
- [A user's media](#a-users-media)
- [A room's media](#a-rooms-media)
- [Purging the remote media cache](#purging-the-remote-media-cache)
- [Deleting local media by age and size](#deleting-local-media-by-age-and-size)

## What the operations do

| Operation | What it does | Reversible |
|---|---|---|
| Quarantine | Blocks access to the file for everyone | Yes, with unquarantine |
| Protect | Marks a file safe so it can't be quarantined | Yes, with unprotect |
| Delete | Removes the file from your server's disk | No |
| Purge remote cache | Drops locally cached copies of media from other servers | No, but remote media re-fetches on next use |

## Per-file actions

Per-file actions live on each row of a Media tab, and the tab exists in two places with different reach. The user edit page (Users, open a user, **Edit**, **Media** tab) carries the full set. The room show page (Rooms, open a room, **Show**, **Media** tab) carries only a per-row **Delete**.

A row has at most three controls, and which ones show depends on the file's state. One slot is the quarantine control: it reads **Quarantine**, or **Unquarantine** when the file is already quarantined, or a disabled **Protected** when the file is protected. A second slot is the protection control: **Protect**, or **Unprotect** when already protected, or a disabled **In quarantine** when the file is quarantined. **Delete** is always present and removes that one file for good.

## A user's media

The Media tab on a user's edit page lists every file that user uploaded, each with the per-file controls above. Two bulk buttons sit at the top of the tab.

**Quarantine all media** quarantines every local file the user uploaded, after a confirmation. Media the user sent from another homeserver isn't covered: this endpoint is local-only.

**Delete all media** permanently deletes every file the user uploaded. The deletion runs as a single server-side call, so you can close the dialog and let it finish; the result is reported when the call returns.

To act on several users at once, select them in the Users list and use **Delete all media** in the bulk toolbar. It deletes each selected user's media and reports how many succeeded and how many failed. Quarantine isn't offered in bulk here; quarantining all of a user's media is a single-user action.

## A room's media

The room's Media tab lists every file uploaded into the room, each with a **Delete** button, and two bulk actions sit above the list.

**Quarantine all media** quarantines all local and remote media in the room once you confirm. Reach for it on a room carrying reported illegal or harmful content.

**Delete all media** permanently removes the room's local media, one file at a time with a live progress count. It only ever removes local media from unencrypted events, so encrypted rooms and media hosted on other servers are never affected. On a single room the button appears only for unencrypted rooms, and because it deletes file by file from your browser, its dialog stays in the foreground and asks you not to close it until it finishes: closing stops the run partway. The same action is available over a selection from the Rooms bulk toolbar, which reports how many rooms succeeded and how many failed.

## Purging the remote media cache

Open **Media** in the sidebar, then **Purge remote media** in the toolbar. When your server federates, it caches copies of avatars, images, and files from the homeservers it talks to. This drops those cached copies. It doesn't touch your own server's uploads or the originals on their source servers, and a remote file is simply re-fetched the next time someone needs it.

The one field, **last accessed before**, defaults to the current time, which purges the whole cache. That default is deliberate: when harmful content has federated in from a remote server and you need every cached copy gone now, leave the field alone and confirm. Set an earlier cutoff only for routine cleanup, when you want to drop stale cache but keep media that's still in use.

## Deleting local media by age and size

Open **Media** in the sidebar, then **Delete media** in the same toolbar. This removes local media from your server's disk, including thumbnails and your cached copies of remote media. Media uploaded to an external media repository is left alone.

| Field | What it does |
|---|---|
| Last accessed before | Only delete files not accessed since this time. Defaults to three months ago. |
| Larger than (in bytes) | Only delete files above this size. Steps in 1024-byte increments. |
| Keep profile images | Exclude profile and avatar images from the sweep. On by default. |

The cutoff is last-access time, not upload time, so the three-month default sweeps files nobody has touched in a quarter and leaves anything still in use. Deleted files can't be recovered, so start with a conservative cutoff and size threshold before a broad sweep.

---

See also: [User management](./user-management.md) · [Room management](./room-management.md) · [Server statistics](./server-statistics.md) · [Documentation index](./README.md)
