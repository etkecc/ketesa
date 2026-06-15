# Ketesa documentation

The index for Ketesa's guides: configuration, the Synapse and MAS APIs it talks to, and the features it ships. Contributions are welcome; open a PR.

## Configuration

Start with the [full configuration reference](./config.md). Guides for specific topics:

| Guide | What it covers |
|-------|----------------|
| [CORS credentials](./cors-credentials.md) | Tune cross-origin request behavior |
| [Restricting homeservers](./restrict-hs.md) | Limit which homeservers users can connect to |
| [System and appservice-managed users](./system-users.md) | Protect bridge puppets from accidental edits |
| [Custom menu items](./custom-menu.md) | Add your own links to the navigation menu |
| [External auth provider](./external-auth-provider.md) | Behavior when Synapse delegates auth externally |

## APIs

[Supported APIs](./apis.md) lists every Synapse and MAS endpoint Ketesa uses.

## Features

- [User badges](./user-badges.md): role indicators on user avatars
- [Configurable columns](./configurable-columns.md): show, hide, and reorder table columns
- [Prefilling the login form](./prefill-login-form.md): seed login fields from URL parameters

### User management

| Guide | What it covers |
|-------|----------------|
| [User management](./user-management.md) | Login-as-user, shadow ban, rate limits, account data, server notices, MAS users and policy data |
| [User search](./user-search.md) | Substring and reverse (`!`) search over MXID and display name |
| [Bulk CSV import](./csv-import.md) | Import many users at once from a CSV file |
| [Registration tokens](./registration-tokens.md) | Create and manage invite tokens for Synapse and MAS |

### Room management

| Guide | What it covers |
|-------|----------------|
| [Room management](./room-management.md) | Block, purge history, delete, join users, assign admins, the members/state/extremities tabs, the message viewer, space hierarchy |
| [Media management](./media.md) | Quarantine, protect, and delete media by file, user, or room |

### Moderation and federation

- [Event reports](./event-reports.md): review user-submitted abuse reports and look up events
- [Federation](./federation.md): monitor remote server connections and reconnect failed destinations

### Statistics and tasks

- [Server statistics and scheduled tasks](./server-statistics.md): database room sizes, user media usage, background task monitoring

## etke.cc-exclusive features

These run only on [etke.cc](https://etke.cc)-hosted deployments, because they wire into the etke.cc platform: they surface the operations it handles for you (monitoring, updates, backups, scheduled maintenance, support), so you drive a hosted server from this UI instead of over SSH.

- [Server Status icon](../src/components/etke.cc/README.md#server-status-icon)
- [Server Status page](../src/components/etke.cc/README.md#server-status-page)
- [Server Notifications icon](../src/components/etke.cc/README.md#server-notifications-icon)
- [Server Notifications page](../src/components/etke.cc/README.md#server-notifications-page)
- [Server Actions page](../src/components/etke.cc/README.md#server-actions-page)
- [Components page](./components.md)
- [Billing page](../src/components/etke.cc/README.md#billing-page)
- [Support page](../src/components/etke.cc/README.md#support-page)
- [Instance config](../src/components/etke.cc/README.md#instance-config)

## Deployment

- [Availability](./availability.md): where to get Ketesa, including official builds, distro packages, integrations, and mirrors
- [Reverse proxy](./reverse-proxy.md): serving Ketesa behind a reverse proxy
