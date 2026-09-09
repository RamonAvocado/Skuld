# Skuld

Run another project's test suite, inventory its tests, track coverage over time,
and version every coverage snapshot in git.

## Run

```bash
bun install
bun run dev        # http://localhost:3000
```

SQLite lives in `./skuld.db` (override with `SKULD_DB`). Schema is created on first boot.

## Use

1. **Coverage repo** (home page): point it at a pre-cloned git repo with a working
   `origin` + credentials. Each run writes `<repo>/<project-slug>/<timestamp>.{json,junit.xml,coverage.xml}`,
   commits, and pushes (toggle off to commit only).
2. **Add project**: absolute path + a test command that emits **JUnit XML** and
   **Cobertura `coverage.xml`**. For pytest:
   `pytest --junitxml=.skuld/junit.xml --cov --cov-report=xml:.skuld/coverage.xml`
   Any framework works if it can produce those two files.
3. **Run tests**: executes the command in the project dir, parses the reports, stores a
   run, snapshots to the coverage repo.
4. **Areas & roadmap**: group planned tests by feature area (Auth, Listing…), mark them
   done, link each to a real discovered test. The roadmap = everything still `todo`.
5. **Overview**: line chart of coverage % and test count across all runs.

## Checks

```bash
bun test lib/parse.test.ts   # JUnit + Cobertura parsers
bun scripts/selftest.ts      # run + git-snapshot pipeline (no pytest needed)
```

## Known ceilings

- A run is a blocking server action (20-min exec timeout). Add a job queue if suites get slower.
- planned↔discovered linking is manual.
- `git push` relies on the coverage repo already having working auth.
