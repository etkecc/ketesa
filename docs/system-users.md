# System and appservice-managed users

Matrix bridges work by creating a puppet account for every user they bridge: a Telegram bridge spins up one Matrix account per Telegram contact in a bridged room, and the bridge's appservice owns all of them. Edit, deactivate, lock, or reset the password on one of those puppets and you break the bridge for that user, often silently.

`asManagedUsers` is a list of MXID patterns that marks matching accounts as appservice-managed. A marked account is protected from destructive changes while staying open to the harmless cosmetic ones, so you can still fix a display name or avatar without risking the bridge.

Blocked on a managed account:

- Deactivating or erasing it
- Locking, suspending, or shadow-banning
- Resetting the password
- Changing admin status
- Removing devices and sessions

Display name and avatar stay editable, since neither touches the bridge. There's also one deliberate exception to the blocking: if a managed account has already been locked, deactivated, or erased, whether from a client app or any other path, Ketesa still lets you switch it back to active. The protection exists to stop you from breaking a working bridge, not to stop you from repairing one that's already broken.

## Filtering

With `asManagedUsers` set, a System users filter appears in the user list: exclude managed users from the view, or show only them. Matching runs in the browser against the configured patterns, and results are cached so a large user list stays responsive.

## Configuration

The examples below mark the [Telegram bridge (mautrix-telegram)](https://github.com/mautrix/telegram), [Slack bridge (mautrix-slack)](https://github.com/mautrix/slack), and [Baibot](https://github.com/etkecc/baibot) accounts on the `example.com` homeserver as appservice-managed. They show both shapes you'll need: pinning one specific MXID (Baibot) and matching every puppet of a bridge (the Telegram and Slack patterns).

In a standalone `config.json`:

```json
{
  "asManagedUsers": [
    "^@baibot:example\\.com$",
    "^@slackbot:example\\.com$",
    "^@slack_[a-zA-Z0-9\\-]+:example\\.com$",
    "^@telegrambot:example\\.com$",
    "^@telegram_[a-zA-Z0-9]+:example\\.com$"
  ]
}
```

In `/.well-known/matrix/client`, under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "asManagedUsers": [
      "^@baibot:example\\.com$",
      "^@slackbot:example\\.com$",
      "^@slack_[a-zA-Z0-9\\-]+:example\\.com$",
      "^@telegrambot:example\\.com$",
      "^@telegram_[a-zA-Z0-9]+:example\\.com$"
    ]
  }
}
```

---

See also: [Configuration](./config.md) · [User management](./user-management.md) · [Documentation index](./README.md)
