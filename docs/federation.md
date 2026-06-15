# Federation

When federation goes wrong it goes wrong quietly: messages take minutes instead of seconds, one room drifts out of sync while the rest are fine, a remote server stops answering and nobody notices until someone complains. The Federation page is where you find out which server is failing, and how badly.

It lists every remote homeserver yours has talked to, or tried to. In the navigation it's **Federation**; in the Synapse Admin API it's the `destinations` resource.

## The list

Each row is one remote server.

| Column | Meaning |
|---|---|
| Destination | Hostname of the remote server, e.g. `matrix.org`. |
| Failure timestamp | When the current failure streak started. Empty means healthy. |
| Last retry timestamp | When Synapse last tried to reach it after a failure. |
| Retry interval | How long Synapse waits before the next automatic retry. It grows with every failed attempt, so a large value means the server has been down a while. |
| Last successful stream | Position of the last event delivered, so you can see how far behind a destination has fallen. |

The list sorts alphabetically by destination; use the search box to jump to one.

## Spotting a failure

A failing destination gets a red error icon next to its name. On desktop the icon follows the **Last retry timestamp** (`retry_last_ts > 0`); on mobile the row shows the failure timestamp under the server name with the same icon.

One subtlety worth knowing, because it bites: the red icon and the **Reconnect** button don't watch the same field. The icon follows `retry_last_ts`, the button appears whenever `failure_ts` is set. A server that has failed but hasn't been retried yet shows the button with no icon. When you're hunting failures, trust the failure timestamp, not just the red dot.

## Reconnecting

The **Reconnect** button shows up (in the row and in the detail toolbar) only for destinations with an active failure. Clicking it tells Synapse to drop the failure record, which resets the backoff timer and forces an immediate connection attempt instead of waiting out the retry interval.

The part the button won't tell you: reconnect only helps *after* you've fixed the actual problem. Synapse already retries on its own with exponential backoff, so forcing a reconnect against a server that's still unreachable just fails again and re-enters the backoff, with a little extra load for your trouble. Reach for it when you've genuinely changed something on your side:

- fixed a firewall rule or routing problem,
- updated a DNS record and waited out the TTL,
- confirmed the remote server's renewed TLS certificate is actually serving,
- or you just want to test connectivity now instead of waiting.

If none of those are true, leave it alone and let the backoff do its job.

## What's behind a destination

Click any row to open its detail view. The **Status** tab repeats the five fields from the list. The **Rooms** tab is the useful one: every room you share with that remote server, with its ID, stream position, and name.

This is your triage signal. A destination that shares one quiet room can wait. One that shares dozens of active rooms is failing to deliver a lot while it's down, and belongs at the front of the queue. Click any room to jump to its full page.

---

See also: [Room management](./room-management.md) · [Server statistics](./server-statistics.md) · [Documentation index](./README.md)
