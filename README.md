# Skuld

Run another project's test suite, inventory its tests, track coverage and
endpoint/page performance over time.

## Run

```bash
bun install
bun run dev        # http://localhost:3000
```

SQLite lives in `./skuld.db` (override with `SKULD_DB`). Schema is created on first boot.

Sign-in comes from `@mimird/auth`, with users stored in the same SQLite file (`kv` table).
In dev, sign up at `/signup`; the verification code is printed in the server log.
Its cookies are `skuld_*` (`AUTH_COOKIE_PREFIX`, set in `next.config.ts`), so other
@mimird/auth apps on the same host don't share the session. In production set
`SESSION_SECRET` (32+ chars, different from every other app's) and `APP_URL`. Google/GitHub login is
optional (`GOOGLE_CLIENT_ID`/`_SECRET`, `GITHUB_CLIENT_ID`/`_SECRET`).

`@mimird/ui` and `@mimird/auth` come from npm, pinned to exact versions.

## Use

1. **Add project**: absolute path + a test command that emits **JUnit XML** and
   **Cobertura `coverage.xml`**. For pytest:
   `pytest --junitxml=.skuld/junit.xml --cov --cov-report=xml:.skuld/coverage.xml`
   Any framework works if it can produce those two files. No setup step —
   just point it at a checkout.
2. **Run tests** (Tests tab): executes each suite in the project dir, parses the reports and
   stores a run. The run history sits under the button.
3. **Tests**: group planned tests by feature area (Auth, Listing…), mark them
   done, link each to a real discovered test. The TODO list = everything still `todo`.
4. **Overview**: test tiles + coverage/test-count chart, and the latest endpoint/page
   performance numbers. Tabs are in the URL: `?tab=test`, `?tab=performance`. Project URLs use the project's uuid.

## CLI

`bun run skuld help` lists, adds and re-categorizes planned tests, areas and performance
entries straight in the db (same `SKULD_DB`). Refresh the page to see changes.

```bash
bun run skuld projects
bun run skuld run my-api
bun run skuld tests add my-api Auth --layer e2e "rejects expired token" "logs out"
bun run skuld tests move Billing 12 13
bun run skuld perf add my-api endpoint --area Usage /api/v1/usage /api/v1/limits
```

## Checks

```bash
bun test lib/parse.test.ts   # JUnit + Cobertura parsers
bun scripts/selftest.ts      # run pipeline + CLI (no pytest needed)
```

## Known ceilings

- A run is a blocking server action (20-min exec timeout). Add a job queue if suites get slower.
- planned↔discovered linking is manual.
