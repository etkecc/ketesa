# Restricting available homeservers

By default the Ketesa login page lets anyone type any Matrix homeserver URL. Setting `restrictBaseUrl` locks that down, which is what you want for a deployment that should only ever talk to its own server, a public instance like `admin.example.com` meant to reach only `matrix.example.com`, or a fixed set of servers you manage and nothing outside it.

How it changes the login page depends on what you set. A single URL removes the homeserver field entirely and fixes the connection to that value. A list turns the field into a dropdown limited to those choices. An empty string or empty list counts as no restriction, the same as leaving it unset.

Either the delegated domain or the actual Synapse URL works. With `wellKnownDiscovery` on (the default), Ketesa resolves a restricted value through `/.well-known/matrix/client` just as it resolves a freely-typed one, and logs in against the resolved address, so for MXIDs like `@user:example.com` with Synapse at `matrix.example.com` you can set either `https://example.com` or `https://matrix.example.com`. The distinction only matters when that lookup can't help: if you've turned `wellKnownDiscovery` off, or the domain serves no well-known file, the value is used exactly as written and has to point straight at Synapse.

The value lives under `restrictBaseUrl` in either configuration source (see [Configuration](./config.md)). To restrict to `example.com` (Synapse at `matrix.example.com`) and `example.net` (Synapse at `synapse.example.net`):

```json
{
  "restrictBaseUrl": [
    "https://matrix.example.com",
    "https://synapse.example.net"
  ]
}
```

In `/.well-known/matrix/client`, the same value goes under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "restrictBaseUrl": ["https://matrix.example.com", "https://synapse.example.net"]
  }
}
```

---

See also: [Configuration](./config.md) · [Documentation index](./README.md)
