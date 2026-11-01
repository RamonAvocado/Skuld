<p align="center">
  <img src="app/icon.svg" width="72" alt="Skuld logo">
</p>

<h1 align="center">Skuld</h1>

<p align="center"><em>What shall be.</em> A self-hosted dashboard for test plans, coverage and performance.</p>

<p align="center">
  <a href="docs/index.md">User guide</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#cli">CLI</a> ·
  <a href="docker/README.md">Docker image</a>
</p>

---

Point Skuld at a checkout of any project. It runs that project's test suites, reads
their reports, and tracks results over time: which tests exist, which are still
planned, how coverage moves, and how fast your endpoints and pages respond.

## Features

- **Test plan.** Group planned tests by feature area, mark them done, and link each
  one to a real test found in your suite. Whatever is still `todo` is your backlog.
- **Any test framework.** Skuld reads **JUnit XML** for results and **Cobertura XML or
  lcov** for coverage. It has presets for pytest, Bun test and Playwright, and accepts
  any command that writes those files.
- **History.** Every run is stored, with pass/fail counts, line and branch coverage,
  per-file coverage and a chart of how it changes.
- **Endpoint performance.** Times your `GET` endpoints (10 samples after a warm-up)
  and reports median, p95, TTFB and payload size. It can log in first and use a bearer token.
- **Page performance.** Loads your pages in headless Chromium through
  [sitespeed.io](https://www.sitespeed.io/) and records onLoad, FCP, LCP, requests and
  transfer size, either logged in or as a visitor.
- **Scriptable.** The `skuld` CLI handles anything you'd otherwise click through.
- **Single file.** All data lives in one SQLite database. There is no external service to run.

## Quick start

### Docker (recommended)

```bash
docker run -d --name skuld -p 3003:3003 \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e APP_URL=http://localhost:3003 \
  -v skuld-data:/data \
  -v /home/me/repos/my-api:/home/me/repos/my-api \
  ramonavocado/skuld:latest
```

Open <http://localhost:3003>. Mount each project you want to test **at the same path
inside the container**. See [docker/README.md](docker/README.md) for every option.

### From source

Requires [Bun](https://bun.sh) 1.4+.

```bash
bun install
bun run dev          # http://localhost:3003
```

In development, sign up at `/signup`. The verification code is printed in the server log.

## Your first project

1. Click **Add project**, then enter a name and the **absolute path** to the checkout.
2. Add a **test suite**. Pick a language and framework to fill in the command, for
   example for pytest:
   ```bash
   pytest --junitxml=.skuld/pytest-junit.xml --cov --cov-report=xml:.skuld/pytest-coverage.xml
   ```
3. Click **Run tests**. Skuld runs the command in the project directory, parses the
   reports and stores the run.

The [user guide](docs/index.md) covers test plans, performance tracking and the CLI in detail.

## CLI

```bash
bun run skuld help                                              # all commands
bun run skuld projects                                          # list projects
bun run skuld run my-api                                        # run every suite
bun run skuld tests add my-api Auth --layer e2e "rejects expired token" "logs out"
bun run skuld perf add my-api endpoint --area Usage /api/v1/usage /api/v1/limits
```

The CLI writes to the same database as the web app (`SKULD_DB`). Refresh the page to see changes.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SKULD_DB` | `./skuld.db` (`/data/skuld.db` in Docker) | SQLite database path |
| `APP_ENV` | `dev` | `dev`, `docker` or `production` |
| `SESSION_SECRET` | none | **Required in production.** 32+ chars, unique per app |
| `APP_URL` | `http://localhost:3000` | **Required in production.** Public URL, used for OAuth redirects |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | none | Optional Google sign-in |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | none | Optional GitHub sign-in |

## Development

```bash
bun test                     # unit tests (parsers, db, perf, presets)
bun scripts/selftest.ts      # run pipeline + CLI end to end (no pytest needed)
make dev-build               # dev container with hot reload on :23003
```

Built with Next.js, React, Tailwind and `bun:sqlite`. Sign-in comes from
[`@mimird/auth`](https://www.npmjs.com/package/@mimird/auth). Its session cookies use the
`skuld_` prefix, so other Mimird apps on the same host don't share the session.
Design rules are in [DESIGN.md](DESIGN.md).

### Release a Docker image

```bash
VERSION=$(jq -r .version package.json)
docker build -f docker/Dockerfile --build-arg VERSION=$VERSION \
  -t ramonavocado/skuld:$VERSION -t ramonavocado/skuld:latest .
docker push ramonavocado/skuld:$VERSION && docker push ramonavocado/skuld:latest
```

Paste [docker/README.md](docker/README.md) into the repository overview on Docker Hub.

## Known limits

- A run is a blocking request, and each suite has a 20-minute timeout. Very slow suites need a job queue.
- New tests are auto-imported, but linking a test you planned in advance to its real test is manual.
- Login for performance runs expects a JSON `{ email, password }` API answering
  `{ token }` and an HTML form with `email` and `password` fields.

## License

See [LICENSE](LICENSE).
