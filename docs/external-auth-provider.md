# External auth provider

When Synapse hands authentication to an external system (OIDC, LDAP, a seamless password provider), the Synapse API doesn't always say so; hidden password providers in particular give no signal. Ketesa needs a hint so it stops asking for things the external provider owns. `externalAuthProvider: true` is that hint.

Today it changes two things:

- Reactivating a user no longer requires a password. Normally, bringing a deactivated account back means setting a new one; with an external provider the password lives there rather than in Synapse, so Ketesa drops the requirement.
- The guests filter disappears from the user list, since external auth providers generally don't issue guest accounts and the filter would only ever come back empty.

You usually won't set this by hand. For OIDC, including next-gen auth through MAS, Ketesa switches it on itself the moment it sees the server authenticating externally. The flag is really for the setups that stay silent about it, like a hidden LDAP or password provider.

## Matrix Authentication Service (MAS)

When a homeserver authenticates through MAS, Ketesa recognizes it and turns on the full MAS integration: registration-token management, the MAS user panel (sessions, emails, upstream OAuth links, policy data), and create/edit workflows adapted to MAS-managed accounts. The [MAS user management guide](./user-management.md#mas-mode) has the full list.

Two separate things have to line up, and it helps to know which is which.

The OIDC login button appears when the server exposes valid OAuth metadata at `/_matrix/client/v1/auth_metadata` (the stable endpoint from [Matrix spec v1.14](https://spec.matrix.org/v1.18/client-server-api/#get_matrixclientv1auth_metadata); Ketesa falls back to the older `org.matrix.msc2965` unstable path). That metadata is the load-bearing signal: the button keys off it, not off the login flow. Which is exactly why it still works on a Synapse-with-MAS deployment that has disabled `/_matrix/client/v3/login` entirely, the common MAS default. The `org.matrix.msc3824.delegated_oidc_compatibility` flag on the SSO flow, when it's present, does something narrower: it tells Ketesa to hide the password form for OIDC-aware clients. On its own it does not light up the button.

The MAS management features, by contrast, switch on only after login, once Ketesa confirms the provider really is MAS: its OAuth token endpoint is a MAS endpoint and the MAS admin API answers from the browser. That second condition is the one that trips people up, because the admin API is not exposed by default.

> The MAS admin API has to be reachable from the Ketesa UI. If it isn't, login still works, but every MAS-specific operation (registration tokens, sessions, emails) will fail.

Expose it by adding the `adminapi` resource to the MAS listener:

```yaml
http:
  listeners:
  - name: web
    resources:
    # ...
    - name: adminapi # Add this
    binds:
    - address: '0.0.0.0:8080'
# ...
```

### The /auth-callback endpoint

MAS returns users to `/auth-callback` after OIDC sign-in. The Ketesa build ships a real `auth-callback/index.html`, so it's served as a static page with no SPA fallback or `index.html` copy required.

If a web server fronts the UI, make sure `/auth-callback` serves that file from the build output. A standard static-file config already does. For example, in nginx:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

This is the approach in Ketesa's [Docker image (dist)](../docker/Dockerfile) and [Docker image (build)](../docker/Dockerfile.build), and the recommended one for production.

## Configuration

In a standalone `config.json`:

```json
{
  "externalAuthProvider": true
}
```

In `/.well-known/matrix/client`, under the `cc.etke.ketesa` key:

```json
{
  "cc.etke.ketesa": {
    "externalAuthProvider": true
  }
}
```

---

See also: [Configuration](./config.md) · [User management](./user-management.md) · [Documentation index](./README.md)
