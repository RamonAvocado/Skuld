# Skuld user guide

This guide covers everything you can do in Skuld, in the order you'll probably need it.
For installation, see the [README](../README.md) or the [Docker guide](../docker/README.md).

- [Concepts](#concepts)
- [Sign in](#sign-in)
- [Add a project](#add-a-project)
- [Test suites](#test-suites)
- [Running tests](#running-tests)
- [The test plan](#the-test-plan)
- [Endpoint performance](#endpoint-performance)
- [Page performance](#page-performance)
- [The overview](#the-overview)
- [CLI reference](#cli-reference)
- [Troubleshooting](#troubleshooting)

---

## Concepts

| Term | Meaning |
| --- | --- |
| **Project** | A checkout on disk that Skuld tests. It is identified by an absolute path. |
| **Suite** | One test command in a project, such as unit tests with pytest or e2e with Playwright. A project can have several. |
| **Run** | One execution of every suite. Stores pass/fail counts, coverage and the log. |
| **Discovered test** | A test Skuld found in a suite's JUnit report. |
| **Planned test** | A test you intend to have, with a title, layer and status (`todo` or `done`). It can be linked to a discovered test. |
| **Group** (area) | A feature area that groups planned tests and performance entries, such as *Auth* or *Billing*. |
| **Layer** | `unit`, `integration`, `e2e` or `other`. |
| **Perf entry** | An API endpoint or a web page whose speed Skuld measures. |

## Sign in

Create an account at `/signup`. In development (`APP_ENV=dev`), the six-digit verification code
appears in the server log instead of an email. If Google or GitHub sign-in is configured, those
buttons appear on the login page.

## Add a project

1. On **All Projects**, click **Add project**.
2. Enter a **name** and the **project directory**. The directory must be an absolute path that
   Skuld can read. When Skuld runs in Docker, that path is inside the container, so mount the
   checkout at the same path on both sides.
3. Open **Project settings** (gear icon) → **General** to choose which parts are on:
   **Tests**, **Performance**, or both. Turning a part off hides its tabs.

## Test suites

**Project settings → Tests** lists the suites. Skuld runs each one in turn in the project
directory, then reads two files:

- **JUnit XML** for test results (required).
- **Coverage**, as Cobertura XML or `lcov.info` (optional).

Pick a **language** and **framework** to fill in a preset:

| Preset | Command | Coverage |
| --- | --- | --- |
| pytest | `pytest --junitxml=.skuld/pytest-junit.xml --cov --cov-report=xml:.skuld/pytest-coverage.xml` | Cobertura (needs `pytest-cov`) |
| Bun test | `bun test --reporter=junit --reporter-outfile=.skuld/bun-junit.xml --coverage --coverage-reporter=lcov --coverage-dir=.skuld/bun-coverage` | lcov |
| Playwright | `PLAYWRIGHT_JUNIT_OUTPUT_NAME=.skuld/playwright-junit.xml npx playwright test --reporter=junit` | none |

Choose **Other / custom** for any other tool. It works if the tool can write JUnit XML.
Paths are relative to the project directory.

> **Tip:** Add `.skuld/` to the project's `.gitignore`.

> **Bun coverage note:** Bun only measures files that the tests import, so untested files
> don't lower the rate.

The same tab manages **groups**: add, rename, recolor and delete the areas used by the test plan.

## Running tests

On the **Tests** tab, click **Run tests**, or run `bun run skuld run <project>` from the CLI.

- Every suite runs in order. Each suite has a 20-minute timeout.
- The run history is listed under the button. Expand a run to see its log.
- A suite that exits non-zero still records its results, so failing tests show up as failures
  instead of losing the run.
- Every new discovered test is added to the **Auto-discovered** group, already linked and
  marked `done`. Move tests into your own groups when you want them organized.

## The test plan

The **Tests** tab is your plan: what should be tested, grouped by feature.

- **Add a test** with the **+** button: a name, a layer and a group. It starts as `todo`.
- **Edit** a test to rename it, change its group or layer, or **link it** to a discovered test.
  The link shows that test's latest outcome and duration, compared with the previous run.
- **Mark done** when the test exists. Everything still `todo` is your backlog.
- Group settings (gear next to the group name) set the group's name and color.

The plan is a good place to write the tests you *want* before they exist, and then link
each one once it does.

## Endpoint performance

The **Endpoints** tab measures your API. It only sends `GET` requests, so a measurement never
changes data.

**Run settings** (on the tab):

| Field | Example | Notes |
| --- | --- | --- |
| API base URL | `http://localhost:8000` | Every path is joined to this. |
| API login path | `/api/v1/auth/login` | Optional. Skuld `POST`s `{ email, password }`. |
| Login email / password | | Optional. The password is stored and never shown again. |
| Variables (JSON) | `{ "symbol": "AAPL" }` | Values for `{placeholders}` in paths. |

If a login email is set, Skuld logs in first and sends `Authorization: Bearer <token>`. It reads
the token from `token` or `access_token` in the response, and the user id from `id` or
`user_id`. That id is available as `{userId}`.

**Entries** are paths such as `/api/v1/u/{userId}/usage`. A path whose variables are missing is
skipped and marked with an error.

For each endpoint Skuld makes one warm-up call, then 10 timed calls, and records:

- **Median** total time and **p95**
- **TTFB** (time to first byte)
- **Size** of the decoded body
- HTTP **status**

> **Docker:** `localhost` inside the container is the container itself. To reach an API on the
> host, use `http://host.docker.internal:<port>` and run the container with
> `--add-host=host.docker.internal:host-gateway`.

## Page performance

The **Pages** tab loads real pages in headless Chromium through
[sitespeed.io](https://www.sitespeed.io/). It uses the same Run settings, plus:

| Field | Example |
| --- | --- |
| Site URL | `http://localhost:3000` |
| Site login page | `/login` |

Each page is either **public** (loaded as a visitor) or **needs login** (lock icon). For login
pages, Skuld fills the form's `email` and `password` fields and submits it once, then visits
those pages in the same session.

Recorded per page, as medians over 3 loads: **onLoad**, **FCP**, **LCP**, number of
**requests** and **transfer size**. The full sitespeed.io HTML report for each run is linked
from the results.

**Project settings → Performance** holds the sitespeed.io command, if you need to change
iterations or browser flags. The default uses 3 runs, headless Chromium, and no video.

## The overview

The **Overview** tab shows the project at a glance:

- Tiles for the latest run: total, passed, failed and skipped tests, and coverage.
- A chart of coverage and test count across runs.
- The test language breakdown.
- The latest endpoint and page timings.

Tabs are part of the URL (`?tab=test`, `?tab=endpoints`, `?tab=pages`), so you can bookmark
or share a specific view.

## CLI reference

The CLI edits the same database as the web app. Refresh the browser to see changes.
`<project>` is the project's name or uuid. Ids come from the list commands.

```text
bun run skuld projects
bun run skuld run <project>

bun run skuld areas <project>
bun run skuld area add <project> <name>...
bun run skuld area rename <area-id> <name>
bun run skuld area rm <area-id>...

bun run skuld tests <project> [--area A] [--todo]
bun run skuld tests add <project> <area> [--layer unit|integration|e2e|other] <title>...
bun run skuld tests move <area> <test-id>...
bun run skuld tests rename <test-id> <title>
bun run skuld tests done|todo|rm <test-id>...
bun run skuld tests link <test-id> <discovered-key>
bun run skuld discovered <project> [--unlinked]

bun run skuld perf <project> [endpoint|page] [--area A]
bun run skuld perf add <project> endpoint|page [--area A] [--public] <path>...
bun run skuld perf login|public <entry-id>...
bun run skuld perf area <area> <entry-id>...
bun run skuld perf rm <entry-id>...
```

`tests add` and `tests move` create the group if it doesn't exist. Pages added with
`perf add` need login unless you pass `--public`.

In Docker, run the CLI inside the container:

```bash
docker exec -it skuld bun run skuld projects
```

## Troubleshooting

**"no JUnit report at …" after a run.**
The command didn't write the file at the configured path. Run the command yourself in the
project directory and check where the file ends up. The run log on the Tests tab shows the
command's output.

**Coverage shows 0%.**
Check the coverage path. For pytest, install `pytest-cov`. Playwright produces no coverage.

**`command not found` in Docker.**
The image includes Node 22, Bun, git and Chromium. Python, uv and other toolchains are not
included. See [Adding toolchains](../docker/README.md#adding-toolchains).

**The project directory doesn't exist (Docker).**
Mount the checkout at the same absolute path you registered:
`-v /home/me/repos/api:/home/me/repos/api`.

**Endpoints fail with `ECONNREFUSED` (Docker).**
Use `host.docker.internal` instead of `localhost`. See [Endpoint performance](#endpoint-performance).

**Page runs fail at login.**
The login form must have inputs named `email` and `password` and a submit button. Check the
sitespeed.io report linked from the run for a screenshot of what happened.
