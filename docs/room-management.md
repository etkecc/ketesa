# Room management

The Rooms section is where you inspect and moderate every room on your server: block an abuser's room, delete it, purge old history, add or promote a user, or dig through a room's raw state and message timeline. Most of it is safe to click around in. The destructive actions are not, and two of them do less than their names suggest, so read those before you reach for them.

Deleting a room does **not** block it by default. Blocking is a checkbox in the delete dialog, off unless you tick it, so a deleted room's ID stays open and can be rejoined or recreated unless you ask for the block. Purging history cannot be undone, and it is a separate action from deleting. The interface does not make the dangerous actions look any different from the safe ones.

Unlike user management, none of this changes with your auth mode. Every room action calls the Synapse admin API directly and behaves identically whether you run native Synapse or Matrix Authentication Service (MAS).

## Contents

- [The room list](#the-room-list)
- [Blocking a room](#blocking-a-room)
- [Publishing to the room directory](#publishing-to-the-room-directory)
- [Deleting a room](#deleting-a-room)
- [Purging history](#purging-history)
- [Adding and promoting users](#adding-and-promoting-users)
- [The detail view](#the-detail-view)
- [Messages](#messages)
- [Hierarchy](#hierarchy)

## The room list

Rooms lists every room your server knows about, blocked or not. Select rows with the checkboxes to act on several at once: the bulk bar carries block, unblock, publish, unpublish, delete media, and delete room. Most single-room actions live in the detail view instead, reached by clicking a row.

One action does not need you to open a room at all: **Block room by ID** in the list toolbar takes a full room ID and blocks it directly, which is the fast path when you have the ID from a report but the room isn't in front of you.

## Blocking a room

Blocking stops new joins. Members already in the room stay where they are; they just can't be joined by anyone new, and blocked rooms remain visible to you in the list. The toolbar button reads **Block** or **Unblock** depending on the room's current state, and unblocking reverses it. Blocking from the bulk bar works the same way across a selection, and there's a matching bulk **Unblock**.

Blocking is not removal. The members are still there and still talking. If you want them out and the room sealed, that's **Delete room**, below.

## Publishing to the room directory

Publishing makes a room visible in your server's public room directory (the list served at `/_matrix/client/v3/publicRooms`); unpublishing hides it again. The toolbar in a room's detail view shows whichever action is relevant for that room, and both are available as bulk actions over a selection.

## Deleting a room

Deleting kicks every member, removes the room from your server, and runs in the background for large rooms (you can close the dialog and let it finish; the action reports when it's done). It is irreversible, and the dialog asks you to confirm.

What it does not do, despite what you might assume: it does not block the room, and it does not purge event history. **Block** is a checkbox in the delete dialog, off by default, so unless you tick it the deleted room's ID is left open and the same room can be recreated or rejoined. Purging is a separate action entirely (below). So when you're removing an abuse room and you want it to stay gone, tick **Block** in the delete dialog, and run **Purge history** first if the content itself needs to be erased.

Delete is also available as a bulk action.

## Purging history

Purging deletes all events in a room from before a chosen moment, which is how you reclaim storage or honour a retention policy without touching the room itself. The room and its membership are untouched; only the event history before the cutoff goes, and it does not come back.

The dialog has two inputs:

| Input | What it does |
|---|---|
| **Purge events before** | The date/time cutoff. Everything before this moment is deleted. |
| **Also delete events sent by local users** | Off by default. When on, events from your own users are purged too, not just events received from other servers. |

Large purges run in the background. The dialog shows progress while it works, and if you close the dialog mid-purge it tells you the purge continues server-side, so closing the window doesn't cancel it.

## Adding and promoting users

Two actions put a user into a room or hand them control of it. Both take a full Matrix ID (`@user:server`) and reject anything that isn't one.

**Add user** force-joins any Matrix user to the room, local or federated, as if they had accepted an invite. It's in the room's detail toolbar; the confirm button reads **Add**.

**Assign admin** gives a user the room's highest power level. It's available both in the detail toolbar and above the Members tab; the confirm button reads **Make admin**. One prerequisite the dialog notes and the API enforces: a local user who is already an admin of the room must exist for this to work, because the server promotes through that existing admin. If the room has no local admin to act through, the call fails.

## The detail view

| Light |
|-------|
| ![Room detail view](./screenshots/light/rooms-view.webp) |

Click a room to open its detail view, a set of tabs that runs from a plain summary down to the room's raw event graph. Regular rooms show six tabs; Space rooms add a seventh.

The first tab, **Basic**, is the at-a-glance summary: avatar and name, room ID and canonical alias, topic, whether the room is encrypted, federatable and published, its version and type, the join rule, guest access and history-visibility settings, member and device counts, and the room's creator (linked to their user page).

**Members** is who's in the room right now, and where you go to inspect a specific member or hand one of them admin. A toggle above the list, **Local members only**, filters out federated members so you see just your own users.

| Column | Meaning |
|---|---|
| Avatar | User avatar |
| User ID | The member's Matrix ID |
| Display name | Current display name |
| Is guest | Whether the account is a guest |
| Deactivated | Whether the account is deactivated |
| Locked | Whether the account is locked (populated under MAS) |
| Erased | Whether the account has been erased |

Click any member to jump to their user page. The **Assign admin** button sits above the list.

**State** is the room's raw state events: the configuration behind its power levels, join rules, history visibility, and everything else about how it behaves. Reach for it when a room is acting strangely and you need to read what's actually set rather than trust the summary.

| Column | Meaning |
|---|---|
| Type | Event type, e.g. `m.room.power_levels`, `m.room.join_rules` |
| Origin server timestamp | When the state event was set |
| Content | Raw JSON content of the event |
| Sender | The user who set this state |

Click a row to look the event up in full.

**Forward extremities** are the leading edges of the room's event graph, the most recent events with no known successors. A healthy room has one or two. Hundreds or thousands means the event graph has fragmented, which degrades performance; purging old history is the usual remedy.

| Column | Meaning |
|---|---|
| ID | Event ID of the extremity (click to look it up) |
| State group | The state group for this extremity |

Two more columns, **Depth** and **Received timestamp**, are hidden by default; add them from the column picker if you need them.

**Media** covers the room's media files, with per-file deletion and bulk quarantine. See [Media management](./media.md) for the full picture.

## Messages

| Light | Dark |
|-------|------|
| ![Room messages (light)](./screenshots/light/rooms-view-messages.webp) | ![Room messages (dark)](./screenshots/dark/rooms-view-messages.webp) |

The **Messages** tab is the room's event timeline, loaded 20 at a time and opening at the most recent end. Each card shows the sender, the timestamp (the event's `origin_server_ts`, in your browser's locale), the event type, and a content preview: the message body, a membership change, a display-name or room-name change, or, for anything without a simple body, the raw JSON in a monospace block. Every card carries its event ID inline as a clickable link.

**Load older** and **Load newer** page 20 events at a time in either direction from where you are.

### Filtering

The **Filters** button opens a panel; when any filter is active, the button shows how many. Basic filtering covers two fields: **Event types** (pick from a long list of common Matrix types, or type your own and press Enter) and **Senders** (Matrix IDs). Under **Advanced filters** you also get **Exclude event types**, **Exclude senders**, and **Contains URL** (Any, with-URL-only, or without-URL-only). Basic and advanced combine, so you can show only `m.room.message` events while excluding one noisy bot.

**Apply** reloads with the current filters; **Clear** resets them and appears once at least one filter is set.

### Jump to date

Inside the same Filters panel, **Jump to date** navigates straight to a point in the room's history. The **Direction** selector decides which event anchors the jump: **Backward** lands on the closest event at or before the timestamp, **Forward** on the closest at or after. The view re-centres on the matching event with it highlighted, and you can page in either direction from there. If nothing exists near the timestamp, the viewer says so and clears the list.

## Hierarchy

| Light | Dark |
|-------|------|
| ![Room hierarchy (light)](./screenshots/light/rooms-view-hierarchy.webp) | ![Room hierarchy (dark)](./screenshots/dark/rooms-view-hierarchy.webp) |

Space rooms (`room_type: m.space`) get one extra tab, **Hierarchy**, which draws the Space's nested tree of child rooms. Regular rooms don't have it.

Each node in the tree shows:

| Field | Meaning |
|---|---|
| Name | Display name, falling back to the raw room ID when none is set |
| Type | A **Space** or **Room** chip, when the room's type is known |
| Member count | Number of joined members; hidden when zero |
| Suggested | A green **Suggested** chip when the parent Space marks the child as suggested |
| Join rule | The room's join rule, e.g. `public`, `invite`, `knock` |

Rooms referenced in the hierarchy that the API doesn't return appear as greyed-out placeholder nodes you can't click into.

The **Max depth** selector controls how many levels are fetched: **Unlimited** (the default) or a fixed 1, 2, 3, 5, or 10. For a large Space, a lower depth loads faster and cuts noise. The first two levels expand on their own; click a node with children to toggle it, click a leaf to open its detail view, and use **Refresh** after server-side changes. If the tree is paginated, a **Load more** button appears at the bottom.

---

See also: [Media management](./media.md) · [User management](./user-management.md) · [Federation](./federation.md) · [Documentation index](./README.md)
