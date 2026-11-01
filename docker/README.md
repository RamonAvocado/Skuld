# Skuld

**A self-hosted dashboard for test plans, coverage and performance.**

Point Skuld at a checkout of any project. It runs that project's test suites, reads their
JUnit and coverage reports, and tracks results over time. It can also time your API endpoints
and load your pages in headless Chromium to track how fast they are.

- Source and issues: <https://github.com/RamonAvocado/Skuld>
- User guide: <https://github.com/RamonAvocado/Skuld/blob/main/docs/index.md>

## Features

- **Test plan.** Group planned tests by feature area, mark them done, and link them to real tests.
- **Any framework.** Reads JUnit XML results and Cobertura or lcov coverage. Includes presets for pytest, Bun test and Playwright.
- **History.** Stores every run with pass/fail counts, line and branch coverage, and a trend chart.
- **Endpoint timing.** Measures median, p95, TTFB and size for `GET` endpoints, with optional login.
- **Page timing.** Records onLoad, FCP, LCP, request count and transfer size through sitespeed.io and Chromium.
- **One volume.** All data is stored in a single SQLite file under `/data`.

## Quick start

```bash
docker run -d --name skuld \
  -p 3003:3003 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e APP_URL=http://localhost:3003 \
  -v skuld-data:/data \
  -v /home/me/repos/my-api:/home/me/repos/my-api \
  --add-host=host.docker.internal:host-gateway \
  ramonavocado/skuld:latest
```

Open <http://localhost:3003> and sign up. The verification code is in `docker logs skuld`. Then add a project with the path `/home/me/repos/my-api`.

## Docker Compose

Save this as `compose.yaml`:

```yaml
services:
  skuld:
    image: ramonavocado/skuld:latest
    container_name: skuld
    ports:
      - "3003:3003"
    environment:
      SESSION_SECRET: ${SESSION_SECRET:?set SESSION_SECRET in .env}
      APP_URL: ${APP_URL:-http://localhost:3003}
    volumes:
      # Named volume holding the SQLite database; survives upgrades and `docker compose down`
      - skuld-data:/data
      # Mount every project at the same path you register it under in Skuld
      - /home/me/repos/my-api:/home/me/repos/my-api
    extra_hosts:
      - "host.docker.internal:host-gateway"   # reach apps running on the host
    restart: unless-stopped

volumes:
  skuld-data:
    name: skuld-data   # fixed name, so the backup commands below find it
```

Create a `.env` file next to it, then start the stack:

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d
```

To keep the database in a folder you choose, replace `skuld-data:/data` with a bind mount
such as `./data:/data`.

**Back up** the database. Stop Skuld first so the SQLite files are consistent
(`docker compose down -v` deletes the volume, so take a backup first):

```bash
docker compose stop
docker run --rm -v skuld-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/skuld-backup.tgz -C /data .
docker compose start
```

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SESSION_SECRET` | **yes** | none | Signs session cookies. Use 32+ random characters, unique to this app. |
| `APP_URL` | **yes** | none | Public URL of Skuld, used for OAuth redirects. |
| `APP_ENV` | no | `dev` | Leave unset: sign-up verification codes are printed to `docker logs skuld`. `production` needs an email sender, which Skuld does not include yet. |
| `SKULD_DB` | no | `/data/skuld.db` | SQLite database path. |
| `PORT` | no | `3003` | HTTP port inside the container. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | none | Enables Google sign-in. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | no | none | Enables GitHub sign-in. |

## Volumes and mounts

| Path | Purpose |
| --- | --- |
| `/data` | Database. **Mount a volume here**, or your data is lost when the container is replaced. |
| your project paths | Skuld runs test commands inside each project, so the checkout must be visible in the container **at the same absolute path** you register in the UI. |

Skuld writes reports into each project's `.skuld/` folder. Add it to the project's `.gitignore`.

## Reaching apps on the host

Inside the container, `localhost` is the container itself. For endpoint and page timing
against an app running on your machine, use `http://host.docker.internal:<port>` as the API
base URL or site URL, and start the container with
`--add-host=host.docker.internal:host-gateway`.

## Adding toolchains

The image includes **Node 22, Bun, git and Chromium**. Suites that use other tools, such as
Python with pytest, need those tools in the image. Extend it:

```dockerfile
FROM ramonavocado/skuld:latest
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
```

Then use `uv run pytest ...` as the suite command. To use a pinned Python image or apt
packages instead, add an `apt-get install` line for them.

## CLI

The `skuld` CLI is included:

```bash
docker exec -it skuld bun run skuld help
docker exec -it skuld bun run skuld run my-api
```

## Upgrading

```bash
docker pull ramonavocado/skuld:latest
docker rm -f skuld && docker run ...   # same command as before
```

Your data is in the `/data` volume and survives the upgrade. The schema is updated
automatically on start.

## License

MIT
