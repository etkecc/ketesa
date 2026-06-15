# Serving Ketesa behind a reverse proxy

Running Ketesa behind a reverse proxy is the recommended setup for any internet-facing deployment. Below are ready-to-use configs for the common ones.

Before you copy a config, pick the build that matches your path. The choice of build, tarball, and Docker tag all follow from whether you serve Ketesa at the root of a domain or under a subpath:

| Deployment path | Tarball | Docker tag |
|----------------|---------|------------|
| Root path (`https://admin.example.com`) | `ketesa.tar.gz` / `dist-root` | `latest` |
| Subpath (`https://example.com/admin`) | `ketesa-subpath-admin.tar.gz` / `dist-subpath-admin` | `latest-subpath-admin` |

Downloads: [GitHub Releases](https://github.com/etkecc/ketesa/releases) · [GitHub Actions artifacts](https://github.com/etkecc/ketesa/actions/workflows/workflow.yml)

## Nginx

### Prebuilt tarball

#### Root path

For example, `https://example.com`.

Place the config below into `/etc/nginx/conf.d/ketesa.conf` (don't forget to replace `server_name` and `root`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com; # REPLACE with your domain
    root /var/www/ketesa; # REPLACE with path where you extracted Ketesa
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|woff|woff2|ttf|eot|webp)$ {
        expires 30d; # Set caching for static assets
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/plain application/javascript application/json text/css text/xml application/xml+rss;
    gzip_min_length 1000;
}
```

#### `/admin` subpath

For example, `https://example.com/admin`.

If you are serving Ketesa under `/admin`, extract the `ketesa-subpath-admin` tarball into an `admin/` subdirectory of your web root (e.g. extract into `/var/www/html/admin/`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com; # REPLACE with your domain
    root /var/www/html; # REPLACE with the parent of the admin/ directory
    index index.html;
    location /admin/ {
        try_files $uri $uri/ /admin/index.html;
    }
    location ~* ^/admin/.*\.(?:css|js|jpg|jpeg|gif|png|svg|ico|woff|woff2|ttf|eot|webp)$ {
        expires 30d; # Set caching for static assets
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/plain application/javascript application/json text/css text/xml application/xml+rss;
    gzip_min_length 1000;
}
```

### Docker

The following snippets assume the nginx docker container is used and it is in the same network as Ketesa docker container.

#### Root path

For example, `https://example.com`.

Use Ketesa docker tag **without** the `-subpath-admin` suffix (e.g., `latest`)

```nginx
server {
  listen 80;

  server_name example.com; # REPLACE with your domain

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_pass http://ketesa:8080;
  }
}
```

#### `/admin` subpath

For example, `https://example.com/admin`.

Use Ketesa docker tag **with** the `-subpath-admin` suffix (e.g., `latest-subpath-admin`)

```nginx
server {
  listen 80;

  server_name example.com; # REPLACE with your domain

  location /admin/ { # Trailing slash required here
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_pass http://ketesa:8080; # NO trailing slash here
  }
}
```

After you've done that, check the config with `nginx -t` and reload Nginx (e.g. `systemctl reload nginx`).

> **Note:** none of these configs cover HTTPS, which you really should be running. See the [Nginx HTTPS guide](https://nginx.org/en/docs/http/configuring_https_servers.html) for that.

## Traefik (docker labels)

If you are using Traefik as a reverse proxy, you can use the following labels, `docker-compose.yml` example:

```yaml
services:
  ketesa:
    image: ghcr.io/etkecc/ketesa:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ketesa.rule=Host(`example.com`)"
```

## Other reverse proxies

No examples for other reverse proxies yet. If you run one, a PR adding its config is welcome.
