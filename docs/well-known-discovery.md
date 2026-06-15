# Well-known discovery

By default, Ketesa resolves whatever homeserver URL you give it through the server's `/.well-known/matrix/client` file, following [the Matrix spec](https://spec.matrix.org/v1.17/client-server-api/#getwell-knownmatrixclient). Type `https://example.com` on the login page and Ketesa fetches its well-known, reads `m.homeserver.base_url`, and connects to the address that points at, usually something like `https://matrix.example.com`. The same resolution runs when you sign in with a full Matrix ID: `@user:example.com` looks up well-known for `example.com` and fills in the homeserver field for you. For almost every deployment this is what you want, which is why it's on by default.

## When to turn it off

There's one setup where automatic resolution gets in the way: when your admin endpoint lives on a domain that well-known doesn't, and shouldn't, advertise. The common case is a VPN-only or otherwise private admin host. You want to connect to that exact address, but well-known resolution would rewrite it to the public Matrix URL and you'd never reach the admin API.

Set `wellKnownDiscovery` to `false` to keep what you type. The login URL is used exactly as entered, and a full Matrix ID resolves straight to `https://<domain>` with no lookup.

One thing this switch does *not* touch: Ketesa still loads its own configuration (`restrictBaseUrl`, `menu`, and the rest) from `/.well-known/matrix/client` either way. The flag governs login-URL resolution only, so turning it off won't stop Ketesa from reading config out of well-known. That's also why the second example below works: Ketesa reads the `wellKnownDiscovery: false` setting from well-known, then stops resolving login URLs through it.

## Configuration

In a standalone `config.json`:

```json
{
  "wellKnownDiscovery": false
}
```

In `/.well-known/matrix/client`, under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "wellKnownDiscovery": false
  }
}
```

---

See also: [Configuration](./config.md) · [Restrict homeserver](./restrict-hs.md) · [Documentation index](./README.md)
