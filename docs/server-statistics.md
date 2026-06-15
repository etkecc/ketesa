# Server statistics and scheduled tasks

Three read-only views for seeing where storage goes and what Synapse is doing in the background: the largest rooms in the database, the users with the most uploaded media, and the queue of scheduled tasks. Two of them carry caveats worth knowing before you trust the numbers. The database-room sizes are rough estimates that can be far off and leave media out entirely, and that view only ever shows the ten largest rooms, not your whole server. The media view is the one page here with destructive buttons, and they do less, or more, than their labels suggest, so [Media management](./media.md) documents them instead of this page.

You reach all three from the sidebar, each as its own top-level entry: **Database room statistics**, **Media**, and **Scheduled tasks**. There is no "Statistics" submenu grouping them; they sit alongside Users and Rooms.

## The largest rooms

| Light | Dark |
|---|---|
| ![Database room statistics (light)](./screenshots/light/rooms-stats.webp) | ![Database room statistics (dark)](./screenshots/dark/rooms-stats.webp) |

**Database room statistics** lists the ten rooms taking the most space in the Synapse database, largest first. Just the top ten, not your whole server. Click a row to open that room's detail page, where you can purge history, restrict membership, or take it from there.

The size is the catch. Synapse builds it from PostgreSQL's query planner, and its own documentation warns the figure "can vary widely from reality": read it as a rough pointer to where disk is going, not an audit. It counts database rows only, so the room's media isn't in the number at all. The endpoint also doesn't exist on SQLite homeservers.

If the page is empty, that's usually not a bug. Synapse returns an error until its background statistics job has populated the underlying table, and Ketesa renders that as an empty list rather than an error, so a freshly started server simply shows nothing here until the job has run.

The columns are the room's avatar, its ID, canonical alias, name, joined-member count, and estimated size. None are sortable, because the order is Synapse's own, largest first. The toolbar **Export** button downloads the listed rows as CSV and appears only when there's data.

## Users by media usage

The page labelled **Media** in the sidebar lists local users ordered by how much media they've uploaded, heaviest first. Use it to spot a user with an outsized footprint before storage becomes a problem.

The columns are the user's avatar, ID, and display name, then their media count and total media size, then flags for guest, deactivated, locked, and erased accounts. A search box, always visible, filters by the localpart of a user's ID or their display name, matching any part of either. Click a row to open that user's media tab, where the per-file and bulk controls live; those are covered in [Media management](./media.md). An **Export** button sits in the toolbar here too, saving the listed rows to CSV when the list has data.

The toolbar also carries two destructive actions that apply server-wide rather than to any one listed user: **Delete media** and **Purge remote media**. Both are documented under [Media management](./media.md), including the cutoff on **Delete media** that defaults to three months ago, so confirming it unchanged removes every local file nobody has touched in the last quarter.

## Scheduled tasks

| Light | Dark |
|---|---|
| ![Scheduled tasks (light)](./screenshots/light/scheduled-tasks.webp) | ![Scheduled tasks (dark)](./screenshots/dark/scheduled-tasks.webp) |

**Scheduled tasks** shows the background jobs Synapse runs on its own: history purges, media cleanup, federation catch-up, and the like. It's for inspection only. You can't start or cancel a task from here, just watch what Synapse scheduled, newest first. A task that finishes quickly may already be gone by the time you open the page.

Each row carries the task's numeric ID, its action (`purge_history` and the like), its status, the timestamp it was last updated, the resource ID it's working on (a room or user), the structured result it returned once finished, and an error message if it failed.

Status shows as a coloured chip:

| Status | Chip | Meaning |
|---|---|---|
| Scheduled | grey | Queued, waiting to start |
| Active | blue | Running now |
| Complete | green | Finished successfully |
| Cancelled | amber | Stopped before it finished |
| Failed | red | Hit an error and didn't complete |

Four filters narrow the list: **Status** as a dropdown, **Action** and **Resource ID** as free text, and **Before date**, a date-and-time picker that limits the list to tasks last updated at or before the moment you pick. Reach for them to chase a stuck job (status active, running longer than it should), confirm a purge landed (action `purge_history`, status complete, matching resource ID), or read the error on one that failed.

---

See also: [Media management](./media.md) · [Room management](./room-management.md) · [User management](./user-management.md) · [Documentation index](./README.md)
