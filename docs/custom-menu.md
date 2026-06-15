# Custom menu items

Add your own links to Ketesa's sidebar without rebuilding it: set the `menu` option and your entries appear alongside the built-in navigation. Each one opens in a new tab, so they suit external destinations like a runbook or monitoring dashboard rather than in-app routes.

Labels can be translated. Give an item an `i18n` map and anyone running Ketesa in a listed language sees the label in theirs; the plain `label` is the fallback for every other language.

## Configuration

The example below adds a link to [Ketesa issues](https://github.com/etkecc/ketesa/issues). Each `menu` entry takes these fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `url` | Yes | string | Where the link goes. Opens in a new tab. |
| `label` | Yes | string | The text shown in the sidebar, and the fallback when no `i18n` entry matches the active language. |
| `i18n` | | object | Per-language overrides for the label. Keys are [BCP 47 language tags](https://en.wikipedia.org/wiki/IETF_language_tag) that Ketesa ships (see [src/i18n/](../src/i18n)); the matching value replaces the label when the UI is in that language. |
| `icon` | | string | An icon name from [src/utils/icons.ts](../src/utils/icons.ts). An unknown or missing name falls back to a default icon. |

In a standalone `config.json`:

```json
{
  "menu": [
    {
      "label": "Contact support",
      "i18n": {
        "de": "Support kontaktieren",
        "fr": "Contacter le support",
        "zh": "联系支持"
      },
      "icon": "SupportAgent",
      "url": "https://github.com/etkecc/ketesa/issues"
    }
  ]
}
```

In `/.well-known/matrix/client`, under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "menu": [
      {
        "label": "Contact support",
        "i18n": {
          "de": "Support kontaktieren",
          "fr": "Contacter le support",
          "zh": "联系支持"
        },
        "icon": "SupportAgent",
        "url": "https://github.com/etkecc/ketesa/issues"
      }
    ]
  }
}
```

---

See also: [Configuration](./config.md) · [Documentation index](./README.md)
