<p align="center">
  <img alt="Ketesa Logo" src="./public/images/logo.webp" height="140" />
  <h3 align="center">
    Ketesa<br>
    <a href="https://matrix.to/#/#ketesa:etke.cc">
      <img alt="Community room" src="https://img.shields.io/badge/room-community_room-green?logo=matrix&label=%23ketesa%3Aetke.cc">
    </a><br>
    <a href="./LICENSE">
      <img alt="License" src="https://img.shields.io/github/license/etkecc/ketesa">
    </a>
    <a href="https://api.reuse.software/info/github.com/etkecc/ketesa">
      <img alt="REUSE compliance" src="https://api.reuse.software/badge/github.com/etkecc/ketesa">
    </a>
  </h3>
  <p align="center"><strong>The evolution of Synapse Admin. Manage users, rooms, media, and federation across your Matrix homeserver from one web interface. Formerly Synapse Admin.</strong></p>
</p>

---

![Login](./docs/screenshots/light/login.webp)
![Users List](./docs/screenshots/light/users-list.webp)

[View all screenshots →](./docs/screenshots/README.md)

## About

Ketesa began as a fork of [Awesome-Technologies/synapse-admin](https://github.com/Awesome-Technologies/synapse-admin)
and quietly grew into its own thing. The interface got a full redesign, it now covers far more of the
Synapse and MAS admin APIs than the original ever did, it speaks ten languages, and it's picked up a pile
of management tools the original never had.

Already running synapse-admin? Switching over is genuinely nothing. Ketesa is a drop-in replacement with
no config changes, so take your pick:

| Method | How |
|---|---|
| Hosted (CDN) | Open [admin.etke.cc](https://admin.etke.cc) and point it at your homeserver, nothing to install |
| Docker | Swap your image tag to `ghcr.io/etkecc/ketesa:latest` |
| Static files | Drop the Ketesa release tarball where your current dist directory lives |

One private server or a federated community with thousands of users, it's the same tool either way.

Questions? Come say hi in the [community room](https://matrix.to/#/#ketesa:etke.cc) or open an issue.

---

## Features

### User management

Everything you'd do to an account lives on one page. The blunt end first: suspend someone,
[shadow-ban](./docs/user-management.md#-shadow-ban) them, or [deactivate or erase](./docs/user-management.md#-deactivation-vs-erasure)
the account outright. Past that, the dials: [rate limits](./docs/user-management.md#-rate-limits), [experimental features](./docs/user-management.md#-experimental-features),
the raw [account data](./docs/user-management.md#-account-data). And the plumbing underneath, same page: third-party IDs,
devices (create, rename, delete), room memberships, cross-signing keys.
Passwords generate on demand or you set them by hand, and every avatar carries a [role badge](./docs/user-badges.md)
(admin, bot, support, federated, system-managed) so you know what you're dealing with before you click in.

Onboarding a crowd? Hand [CSV import](./docs/csv-import.md) a file and it registers everyone at once, third-party IDs and all.

Running [Matrix Authentication Service (MAS)](https://github.com/element-hq/matrix-authentication-service)?
Ketesa grows a whole [MAS-native side](./docs/user-management.md#-mas-user-management). Browse and revoke
active sessions (compat, OAuth2, personal), manage linked email addresses, check upstream OAuth provider
links, or create users straight through MAS.

[User management guide](./docs/user-management.md)

### Room management

See every room on your server, then act on any of them: block or unblock, purge history, or delete a
room outright. The [messages viewer](./docs/room-management.md#-messages-viewer) walks room history with filters and jump-to-date,
and [spaces get their own hierarchy tab](./docs/room-management.md#-room-hierarchy). You can hand out room-admin rights and pull
users into rooms straight from the UI, and [media](./docs/media.md) can be quarantined, protected, or
deleted by file, by user, or by whole room.

[Room management guide](./docs/room-management.md) · [Media management guide](./docs/media.md)

### Authentication

Log in however your server expects: username and password, a raw access token, or OIDC/SSO. Ketesa
speaks [Matrix Authentication Service (MAS)](https://github.com/element-hq/matrix-authentication-service)
natively, session management and [registration tokens](./docs/registration-tokens.md) included, and when Synapse hands
authentication off to an external provider, a dedicated [external auth provider mode](./docs/external-auth-provider.md)
reshapes the interface to match.

[Registration tokens guide](./docs/registration-tokens.md)

### Customization

Every data table is built on [react-admin's Configurable](https://marmelab.com/react-admin/Configurable.html)
component, so you can show, hide, and reorder columns to taste, no code required.

[Configurable columns guide](./docs/configurable-columns.md)

And there's a deployment-level layer on top of those per-user preferences. A [`config.json`](./docs/config.md)
file (or your homeserver's `/.well-known/matrix/client`) lets you
[restrict which homeservers](./docs/restrict-hs.md) people can connect to,
[add your own navigation items](./docs/custom-menu.md),
[pre-fill the login form](./docs/prefill-login-form.md),
[tune CORS credentials](./docs/cors-credentials.md),
and [shield appservice-managed users](./docs/system-users.md) (bridge puppets) from accidental edits.

### Server statistics

Wondering what's eating your disk? Built-in stats break down [per-user media usage and database room
size](./docs/server-statistics.md). The [federation overview](./docs/federation.md) tells you which remote destinations are
healthy and which have gone unreachable, and [reported events](./docs/event-reports.md) land in a list you can review and
act on without leaving the page.

[Server statistics guide](./docs/server-statistics.md) · [Federation guide](./docs/federation.md) · [Event reports guide](./docs/event-reports.md)

### Ten languages

Ketesa is fully translated into ten languages: English, German, French, Japanese, Russian, Persian,
Ukrainian, Chinese, Italian, and Portuguese. Fully meaning fully: every string, with no half-translated
screens or stray English sitting in the other locales. Your non-English-speaking admins aren't hunting
through a half-localized menu at 2am for the button that quarantines a room.

### Mobile support

The whole interface is responsive, so running your server from a phone or tablet actually works.
Tables fold down into readable lists on a small screen, long identifiers wrap instead of running off
the edge, and every action you'd reach for on desktop is still there.

### Built and maintained by etke.cc

Ketesa is built and maintained by [etke.cc](https://etke.cc/?utm_source=github&utm_medium=readme&utm_campaign=ketesa),
a managed Matrix hosting provider. Everything you've read about so far is open source and free for anyone
to use, developed in the open at [github.com/etkecc](https://github.com/etkecc).

And if you happen to host your server with etke.cc, that same admin interface doubles as the control
panel for the platform itself. These are the same screens you already use for users and rooms; they just
light up when there's an etke.cc platform behind them to talk to:

| Feature | What it does |
|---|---|
| Server health | A live status badge in the toolbar and a dashboard covering every server component, with color-coded indicators, error details, and suggested actions. |
| Notifications | Server events appear as an in-app feed with an unread badge. |
| Server actions | Run management commands on demand, schedule them for a specific time, or set up recurring weekly jobs. |
| Components | Browse, add, and remove server add-ons (bridges, bots, apps) from a self-service catalogue, with the cost impact shown before you commit. |
| Billing | View payment history and transaction details, and download invoices, without leaving the admin panel. |
| Support | Open support requests, track their progress, and exchange messages with etke.cc support from the same interface. |
| White-labelling | Custom name, logo, favicon, and background, applied automatically from the platform with no extra configuration. |

[Learn more about etke.cc managed Matrix hosting](https://etke.cc/?utm_source=github&utm_medium=readme&utm_campaign=ketesa).

---

## Availability

| Where | Details |
|---|---|
| [etke.cc](https://etke.cc/?utm_source=github&utm_medium=readme&utm_campaign=ketesa) | Managed hosting with Ketesa built in |
| [admin.etke.cc](https://admin.etke.cc) | Hosted instance, always on the latest development version |
| [GitHub Releases](https://github.com/etkecc/ketesa/releases) | Official prebuilt tarballs for root-path and `/admin` deployments |
| [GHCR](https://github.com/etkecc/ketesa/pkgs/container/ketesa) / [Docker Hub](https://hub.docker.com/r/etkecc/ketesa/tags) | Official container images |
| [Source](https://github.com/etkecc/ketesa) | Build from source or track `main` directly |

Official static builds:

- **`ketesa.tar.gz`** for root path deployment, such as `https://admin.example.com`
- **`ketesa-subpath-admin.tar.gz`** for `/admin` deployments, such as `https://example.com/admin`

For nightly builds, distro packages, Ansible integrations, and IPFS,
see the [full availability guide](./docs/availability.md).

---

## Configuration

There are two ways to configure Ketesa. The straightforward one is a `config.json` file in the
deployment root. The convenient one is your homeserver's `/.well-known/matrix/client` file: drop
Ketesa's settings under the `cc.etke.ketesa` key and every instance pointed at that homeserver picks
them up on its own, so you never have to touch each deployment by hand. When both are present,
`/.well-known/matrix/client` wins.

> **Note:** The legacy key `cc.etke.synapse-admin` is still supported for backward compatibility, but is deprecated.
> Please migrate to `cc.etke.ketesa` at your convenience.

If you use [spantaleev/matrix-docker-ansible-deploy](https://github.com/spantaleev/matrix-docker-ansible-deploy) or
[etkecc/ansible](https://github.com/etkecc/ansible),
configuration is automatically written to `/.well-known/matrix/client` for you.

[Full configuration reference](./docs/config.md)

To inject a `config.json` into a Docker container, use a bind mount:

```yml
services:
  ketesa:
    ...
    volumes:
      - ./config.json:/var/public/config.json:ro
    ...
```

### Prefilling the login form

Every field on the login page can be pre-filled via URL query parameters, which is handy
for sharing direct-access links with your users.

[Documentation](./docs/prefill-login-form.md)

### Restricting available homeservers

Lock down the homeserver selection so users can only connect to servers you approve.
Useful for managed deployments where the homeserver should never change.

[Documentation](./docs/restrict-hs.md)

### Configuring CORS credentials

Fine-tune the CORS credentials mode for your Ketesa deployment to match your server's
cross-origin policies.

[Documentation](./docs/cors-credentials.md)

### Protecting appservice-managed users

Bridge puppets and other appservice-managed accounts can be shielded from accidental
edits. Specify a list of MXID patterns (as regular expressions) to be restricted to
display name and avatar changes only.

[Documentation](./docs/system-users.md)

### Adding custom menu items

Extend the navigation menu with links to your own tools or documentation, no rebuild required.

[Documentation](./docs/custom-menu.md)

### External auth provider mode

When Synapse delegates authentication to an external provider (OIDC, LDAP, and similar),
enable this mode to adjust Ketesa's behavior accordingly and avoid confusing UI elements
that don't apply in your setup.

[Documentation](./docs/external-auth-provider.md)

#### Matrix Authentication Service (MAS)

MAS requires a small amount of additional configuration to enable its admin API. See the
[designated MAS section](./docs/external-auth-provider.md#matrix-authentication-service-mas) for the details.

---

## Usage

### Supported APIs

See [Supported APIs](./docs/apis.md) for a full list of API endpoints used by Ketesa.

### Supported Synapse versions

Ketesa needs [Synapse](https://github.com/element-hq/synapse) **v1.150.0 or newer** for everything to
work as intended.

Not sure what you're running? Call `/_synapse/admin/v1/server_version`, or just glance at the version
indicator that shows up under the homeserver URL field on the login page.

See also: [Synapse version API](https://element-hq.github.io/synapse/latest/admin_api/version_api.html)

### Prerequisites

Your browser needs access to the following endpoints on your homeserver:

- `/_matrix`
- `/_synapse/admin`

See also: [Synapse administration endpoints](https://element-hq.github.io/synapse/latest/reverse_proxy.html#synapse-administration-endpoints)

### Use without installing anything

The hosted build at [admin.etke.cc](https://admin.etke.cc) is always current and needs no installation.
Open it, type in your homeserver URL, and log in with your admin account. That's the whole setup.

> Your browser must be able to reach `/_synapse/admin` on your homeserver. The endpoints
> do not need to be exposed to the public internet; access from your local network is enough.

### Step-by-step installation

Choose a method:

| Method | Best for |
|---|---|
| [Tarball + webserver](#steps-for-1) | Any static hosting, full control |
| [Source + Node.js](#steps-for-2) | Development or custom builds |
| [Docker](#steps-for-3) | Containerized deployments |

#### Steps for 1)

- Make sure you have a webserver installed that can serve static files (nginx, Apache, Caddy, or anything else will work)
- Configure a virtual host for Ketesa on your webserver
- Download the appropriate `.tar.gz` from the [latest release](https://github.com/etkecc/ketesa/releases/latest):
  - `ketesa.tar.gz` for root path deployment (e.g., `https://admin.example.com`)
  - `ketesa-subpath-admin.tar.gz` for `/admin` subpath deployment (e.g., `https://example.com/admin`)
- Unpack the archive and place the contents in your virtual host's document root
- Open the URL in your browser

[Reverse proxy configuration examples](./docs/reverse-proxy.md)

#### Steps for 2)

- Make sure you have git, yarn, and Node.js installed
- Clone the repository: `git clone https://github.com/etkecc/ketesa.git`
- Enter the directory: `cd ketesa`
- Install dependencies: `yarn install`
- Start the development server: `yarn start`

#### Steps for 3)

- Run the Docker container: `docker run -p 8080:8080 ghcr.io/etkecc/ketesa`

  Or use the provided [docker-compose.yml](docker/docker-compose.yml):

  ```sh
  docker-compose -f docker/docker-compose.yml up -d
  ```

  > **Note:** If you're building on a non-amd64 architecture (e.g., Raspberry Pi), set a Node.js
  > memory cap to prevent OOM failures during the build: `NODE_OPTIONS="--max_old_space_size=1024"`.

  > **Note:** On IPv4-only systems, set `SERVER_HOST=0.0.0.0` so Ketesa binds correctly.

  To build your own image from source:

  ```yml
  services:
    ketesa:
      container_name: ketesa
      hostname: ketesa
      build:
        context: https://github.com/etkecc/ketesa.git
        dockerfile: docker/Dockerfile.build
        args:
          - BUILDKIT_CONTEXT_KEEP_GIT_DIR=1
        #   - NODE_OPTIONS="--max_old_space_size=1024"
        #   - BASE_PATH="/ketesa"
      ports:
        - "8080:8080"
      restart: unless-stopped
  ```

- Open http://localhost:8080 in your browser

### Serving Ketesa under a custom path

The base path is baked in at build time and cannot be changed at runtime.

- For `/admin` specifically: use the prebuilt `ketesa-subpath-admin` tarball from [GitHub Releases](https://github.com/etkecc/ketesa/releases) or the `dist-subpath-admin` artifact from [GitHub Actions](https://github.com/etkecc/ketesa/actions/workflows/workflow.yml), or the `*-subpath-admin` Docker image tag.
- For root path: use `ketesa.tar.gz` or the `dist-root` artifact.
- For any other prefix: build from source with `yarn build --base=/my-prefix`, or pass the `BASE_PATH` build argument to Docker.

If you need a reverse proxy to expose Ketesa under a different base path without rebuilding,
here is a Traefik example:

`docker-compose.yml`

```yml
services:
  traefik:
    image: traefik:v3
    restart: unless-stopped
    ports:
      - 80:80
      - 443:443
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  ketesa:
    image: ghcr.io/etkecc/ketesa:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`example.com`) && PathPrefix(`/admin`)"
      - "traefik.http.services.admin.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.admin-slashless-redirect.redirectregex.regex=(/admin)$$"
      - "traefik.http.middlewares.admin-slashless-redirect.redirectregex.replacement=$${1}/"
      - "traefik.http.middlewares.admin-strip-prefix.stripprefix.prefixes=/admin"
      - "traefik.http.routers.admin.middlewares=admin-slashless-redirect,admin-strip-prefix"
```

---

## Development

- See https://yarnpkg.com/getting-started/editor-sdks for IDE setup instructions

| Command | What it does |
|---|---|
| `yarn lint` | Run all style and linter checks |
| `yarn test` | Run all unit tests |
| `yarn fix` | Auto-fix coding style issues |
| `just run-dev` | Spin up the full local development stack |

`just run-dev` launches a complete local environment: a Synapse homeserver, Element Web, and a Postgres
database. The app starts in development mode at `http://localhost:5173`.
(If user creation fails on first run, re-run the command; the server may still be starting up.)

Open [http://localhost:5173](http://localhost:5173?username=admin&password=admin&server=http://localhost:8008) and log in with:

| Field | Value |
|---|---|
| Login | `admin` |
| Password | `admin` |
| Homeserver URL | `http://localhost:8008` |

Element Web is available at http://localhost:8080.
