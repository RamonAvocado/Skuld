# Skuld

Run another project's test suite, inventory its tests, track coverage over time,
and version every coverage snapshot in git.

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
2. **Run tests**: executes the command in the project dir, parses the reports, stores a
   run, then writes a timestamped snapshot to `<project>/.skuld/history/` and commits it
   to *that project's own git repo* (scoped to `.skuld/` only — never touches other
   uncommitted work). No separate coverage repo to configure. If the project directory
   isn't a git repo, this step is skipped and the run still succeeds.
   Enable "git push after commit" in a project's settings (the cog) to also push each snapshot
   commit (off by default, since it uses that project's real `origin`).
3. **Tests**: group planned tests by feature area (Auth, Listing…), mark them
   done, link each to a real discovered test. The TODO list = everything still `todo`.
4. **Overview**: line chart of coverage % and test count across all runs.

## Checks

```bash
bun test lib/parse.test.ts   # JUnit + Cobertura parsers
bun scripts/selftest.ts      # run + git-snapshot pipeline (no pytest needed)
```

## Known ceilings

- A run is a blocking server action (20-min exec timeout). Add a job queue if suites get slower.
- planned↔discovered linking is manual.
- `git push` relies on the project's own repo already having working `origin` auth.
