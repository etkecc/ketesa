# Registration tokens

Registration tokens are invite codes. With open registration turned off, a new account can only be created by someone who types a valid token, so you get an invite-only server without hand-creating every account yourself. Hand a token to a group, cap how many times it can be used, give it an expiry, and let people register themselves.

Ketesa manages tokens for both backends, Synapse and the Matrix Authentication Service (MAS), but the two don't give you the same controls, and that's the thing that trips people up. The short version: **Synapse lets you delete a token, MAS lets you revoke one.** MAS also tracks a few extra timestamps Synapse doesn't. Everything else behaves the same.

Which backend is active comes from your homeserver configuration; see [External auth provider](./external-auth-provider.md).

## What a token carries

| Field | Editable | What it is |
|---|---|---|
| `token` | No | The string a user enters during registration. Fixed once the token exists. Allowed characters are `A-Z a-z 0-9 . _ ~ -`, up to 64 of them. |
| `uses_allowed` | Yes | How many times the token may be used. Empty means unlimited. |
| `expiry_time` | Yes | When the token stops working. Empty means it never expires. |
| `pending` | No | Registrations that started on this token but haven't finished. |
| `completed` | No | Registrations that finished on this token. |
| `created_at` | No | MAS only. When the token was created. |
| `last_used_at` | No | MAS only. When it was last used to register. |
| `revoked_at` | No | MAS only. When it was revoked, empty if it hasn't been. |

Only `uses_allowed` and `expiry_time` can change after creation. The counters and timestamps maintain themselves as people register. On mobile the list trims to `token`, `uses_allowed`, `completed`, and `expiry_time`; open a token to see the rest.

## Creating a token

Go to **Registration Tokens** and click **Create**. Every field is optional: save an empty form and the server hands back a random token with unlimited uses and no expiry. Or fill in what you need:

- **`token`**: supply your own string (same character rules as above), or leave it empty to have one generated.
- **`length`**: how long the generated token should be, up to 64. Only matters when you didn't supply your own `token`; otherwise it's ignored.
- **`uses_allowed`**: the usage cap. Empty for unlimited.
- **`expiry_time`**: when it should expire. Empty for never.

## Managing an existing token

Click a token to open it. You can change `uses_allowed` and `expiry_time`; everything else is read-only.

How you retire a token depends on the backend:

- **Synapse: Delete.** Permanently removes the token from the server. There's no undo. If you might want it back, don't delete it, neutralize it instead: set `uses_allowed` to `0` or set `expiry_time` to a time in the past. The record stays, the token stops working.
- **MAS: Revoke and Unrevoke.** Revoke stops the token from registering new accounts but keeps it and its history, and stamps `revoked_at`. Unrevoke clears that and the token works again, still bound by its `uses_allowed` and `expiry_time`. Revoke is the better default whenever you want a reversible off-switch or a record of what the token did.

On mobile each row carries a quick action: Delete on Synapse, Revoke on MAS.

## Filtering the list

The list shows valid tokens by default: not expired, not used up, and (on MAS) not revoked. Flip the **Valid** filter to see the invalid ones, or clear it to see every token regardless.

---

See also: [External auth provider / MAS](./external-auth-provider.md) · [Documentation index](./README.md)
