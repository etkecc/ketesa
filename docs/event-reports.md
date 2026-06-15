# Event reports

Matrix users flag messages through their client's report button, and those reports collect here, under **Reported events** in the sidebar. You read a report, inspect the exact event that was flagged, and dismiss the report once you've dealt with it. Two things matter before you lean on any of it. The severity score attached to a report carries no real signal in practice, for the reason below, so don't triage on it. And dismissing a report only clears it from this list: it does nothing to the user who sent the event or to the event itself. Acting on the content is a separate, manual step.

## The list

Reports arrive newest first, by the time they were reported, which is the only column you can sort on. Each row shows the report's numeric ID, when it was reported, who reported it, the room name, and the score. The reporter's ID and the room name are truncated to fit the row; open a report for the full values.

## Reading a report

Click a row to open it, and the report splits across two tabs. **Basic** holds the metadata and the people involved: the ID, the time, the score, and the reporter's free-text reason, which is often empty. Below those sit avatar entries for the **Reporter**, the **Sender** of the flagged event, and the **Room** it happened in, each linking straight to that user's or room's page so you can act without hunting for it. The flagged event's own ID is shown as plain text.

**Details** shows the raw JSON of the flagged event as your homeserver stored it: its type, content, sender, timestamps, and signatures. It's the fastest way to see exactly what was reported. If the event has since been redacted or is otherwise gone, this tab is empty.

## The severity score

A report can carry a numeric score, and Synapse's admin API reads −100 as most offensive and 0 as inoffensive. In practice it tells you nothing. Client apps send the default value on every report, so the field is always populated and never meaningful. It isn't part of the Matrix specification either; the spec dropped the report score in Matrix 1.18. Treat the score as noise and judge the content in the Details tab.

## Looking up an event

The list's toolbar carries a **Look Up Event** button that fetches any event by its ID, whether or not it was ever reported. It's for the times an event ID reaches you from somewhere else: a user complaint, a log line, another admin tool. Click it, paste the ID, and press **Fetch** or hit Enter, and the raw event JSON appears in the dialog. Event IDs within that JSON are themselves clickable, so you can walk from one event to another without leaving the dialog. If the event can't be found or your account can't see it, the dialog tells you.

## Dismissing a report

Open the report and use **Delete** in its toolbar. You'll be asked to confirm, and it can't be undone. Deleting clears the report from the list and leaves the reported user and the event exactly as they were. So handle any real moderation first, deactivating the account, removing the user from the room, or purging the event through the user and room pages, then delete the report to clear it. There's no bulk dismiss; clear reports one at a time.

---

See also: [User management](./user-management.md) · [Room management](./room-management.md) · [Documentation index](./README.md)
