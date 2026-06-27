# Configuration

Ketesa runs with no configuration at all, so everything here is optional. When you do configure it, the settings can come from two places: a `config.json` file served next to the deployment ([example](https://cloud.ketesa.app/config.json)), or a `cc.etke.ketesa` key inside the homeserver's `/.well-known/matrix/client` ([example](https://demo.etke.host/.well-known/matrix/client)). If you're an [etke.cc](https://etke.cc) customer or run [matrix-docker-ansible-deploy](https://github.com/spantaleev/matrix-docker-ansible-deploy) or [etkecc/ansible](https://github.com/etkecc/ansible), the well-known entry is written for you and there's nothing to set up.

The well-known method is the flexible one, because any Ketesa instance reads the config straight from the homeserver. You can point a hosted Ketesa like [cloud.ketesa.app](https://cloud.ketesa.app) at a Synapse server you never deployed Ketesa beside, or manage many servers from one instance by giving each server its own well-known config. You can use both sources together; if a key is set in both, the well-known value wins and overlays `config.json`.

The older `cc.etke.synapse-admin` well-known key still works. Ketesa reads it as a fallback when `cc.etke.ketesa` isn't present, so existing setups need no change and migrating is optional.

## Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `restrictBaseUrl` | string or array of strings | unrestricted | Lock Ketesa to specific homeserver(s). The delegated domain or the homeserver URL both work; delegated values are resolved via well-known unless `wellKnownDiscovery` is off. See [Restrict homeserver](./restrict-hs.md). |
| `externalAuthProvider` | boolean | off | Declare that an external auth provider (OIDC, LDAP, and the like) is in use. See [External auth provider](./external-auth-provider.md). |
| `wellKnownDiscovery` | boolean | `true` | Whether to canonicalize URLs through `/.well-known/matrix/client`. Turn it off when the admin API lives on a separate domain that well-known doesn't advertise. See [Well-known discovery](./well-known-discovery.md). |
| `corsCredentials` | `same-origin`, `include`, or `omit` | `same-origin` | How cookies are sent on admin API requests. See [CORS credentials](./cors-credentials.md). |
| `asManagedUsers` | array of MXID regex patterns | none | Protect appservice and system accounts (bridges, bots) from accidental edits. See [System users](./system-users.md). |
| `menu` | array of menu items | none | Add custom links to the sidebar. See [Custom menu](./custom-menu.md). |

## Examples

The same options go in either source. In a standalone `config.json`:

```json
{
  "restrictBaseUrl": [
    "https://matrix.example.com",
    "https://synapse.example.net"
  ],
  "asManagedUsers": [
    "^@baibot:example\\.com$",
    "^@slackbot:example\\.com$",
    "^@slack_[a-zA-Z0-9\\-]+:example\\.com$"
  ],
  "menu": [
    {
      "label": "Contact support",
      "icon": "SupportAgent",
      "url": "https://github.com/etkecc/ketesa/issues"
    }
  ]
}
```

In `/.well-known/matrix/client`, the same object goes under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "restrictBaseUrl": [
      "https://matrix.example.com",
      "https://synapse.example.net"
    ],
    "asManagedUsers": [
      "^@baibot:example\\.com$",
      "^@slackbot:example\\.com$",
      "^@slack_[a-zA-Z0-9\\-]+:example\\.com$"
    ],
    "menu": [
      {
        "label": "Contact support",
        "icon": "SupportAgent",
        "url": "https://github.com/etkecc/ketesa/issues"
      }
    ]
  }
}
```

---

See also: [Restrict homeserver](./restrict-hs.md) · [External auth provider](./external-auth-provider.md) · [Well-known discovery](./well-known-discovery.md) · [CORS credentials](./cors-credentials.md) · [System users](./system-users.md) · [Custom menu](./custom-menu.md) · [Documentation index](./README.md)
