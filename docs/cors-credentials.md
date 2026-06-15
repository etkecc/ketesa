# CORS credentials

`corsCredentials` controls whether Ketesa sends cookies with its calls to the admin API. Most deployments never touch it: the default, `same-origin`, is right when Ketesa and the homeserver share an origin. The one situation that needs it is a cookie-based auth layer in front of the homeserver, such as a reverse proxy doing ForwardAuth with [Authelia](https://github.com/Awesome-Technologies/synapse-admin/issues/655). There you set `include` so the auth cookie rides along with every request. The third value, `omit`, sends no cookies at all, for setups whose security policy forbids them.

The values map straight onto the browser's fetch credentials modes ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials)):

| Value | Cookies sent |
|---|---|
| `same-origin` (default) | Only to the same origin |
| `include` | With every request |
| `omit` | Never |

Set it under `corsCredentials` in either configuration source (see [Configuration](./config.md)):

```json
{
  "corsCredentials": "include"
}
```

In `/.well-known/matrix/client`, under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "corsCredentials": "include"
  }
}
```

---

See also: [Configuration](./config.md) · [Reverse proxy](./reverse-proxy.md) · [Documentation index](./README.md)
