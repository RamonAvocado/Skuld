---
name: Skuld
slogan: What shall be
surface: web
theme: system
base: Mimird-Web/DESIGN.md
colors:
  canvas: "#ffffff / #0a0a0a"
  surface: "#ffffff / #0f0f10"
  text: "#0a0a0a / #fafafa"
  text-muted: "#52525b / #a1a1aa"
  brand: "#ea580c / #fb923c"
  destructive: "#e5484d / #ef4444"
typography:
  sans: Geist
  mono: Geist Mono
radius:
  base: 10px
spacing:
  unit: 4px
---

# Skuld Design System

Skuld uses the Mimird design system. **[Mimird-Web/DESIGN.md](../Mimird-Web/DESIGN.md) is the base**: its rules for type, spacing, radius, motion, components, accessibility and code all apply here. This file has the same structure and records only what Skuld does differently or adds. If a section below says nothing about something, follow Mimird.

When this file and the code disagree, this file is right and the code has drifted. Known drift is listed in [section 14](#14-open-decisions-and-known-drift).

---

## 1. The feeling

Skuld is named after the Norn of what shall be. It is one place for every kind of test a project has: it runs the suites, keeps the results over time, and lists the tests that are still owed. Where Mimird is the inside of a watch, Skuld is **a ledger**: quiet, dense and out of the way.

- **Monochrome first, one light.** Every surface and text token is neutral. The one saturated color is orange, used the way Mimird uses blue.
- **Flat.** App cards keep a flat ring (Mimird 6.3). Only things that float get a shadow: the sidebar, menus, dialogs and toasts.
- **Compact.** 32px controls, `text-sm` body, one centered column per page. A lot of tests and runs fit on a screen without feeling cramped.
- **Plain-spoken.** Empty states are one short muted sentence: "No projects yet.", "No runs yet.", "Nothing outstanding." There are no illustrations and no onboarding copy.

Mimird's five tests (caseback, one-light, bevel, patience, proof) apply as written, with orange in place of blue.

---

## 2. Brand

- **Skuld**, always capitalised, `translate="no"` on the wordmark.
- **Logo.** The Mimird mark (`public/brand/mimird-icon-{black,white}.svg`): black on light, white on dark. *Deviation:* Mimird says never to recolor the mark. Skuld's mark is the Mimird icon recolored orange, which sets the product apart inside the ecosystem.
- **Voice.** The same as Mimird: direct, calm, full stops. Button labels are Title Case ("Add Project", "Run Tests"); everything else is sentence case.

---

## 3. Colour

All neutrals, `destructive`, the radius scale and the shadcn mapping come from `@mimird/ui/tokens.css`. `app/globals.css` overrides only the following.

### 3.1 Brand (the light)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--brand` | `#ea580c` | `#fb923c` | Active sidebar icon, `.link-subtle`, selection (at 28%) |
| `--ring`, `--sidebar-ring` | `#ea580c` | `#fb923c` | Focus rings |

Mimird has one hue in two steps (`--brand` and `--brand-deep`). Skuld has no hero light, so it has no `--brand-deep`.

### 3.2 Surfaces

Skuld takes the package's neutrals unchanged. *Deviation:* it does not use Mimird-Web's cold dark overrides (`#07080a`, `#101111`, `#252829`). Those still live in Mimird-Web's own `globals.css` rather than in the package (see Mimird section 14). Light and dark are equal themes, and `system` is the default.

### 3.3 Outcome colour

- `--destructive` doubles as the outcome color: failing counts ("3 failing"), a failed test in a run, and the Passing tile when anything fails.
- **There is no success green.** A passing run looks like everything else. (Mimird keeps green for price direction; Skuld has no prices.)

### 3.4 Language colours (data, not theme)

Defined in `components/language-bar.tsx`. A suite stores the language key; the hex is looked up at render time and applied with inline `style`.

| Key | Hex |
| --- | --- |
| `python` | `#3572A5` |
| `typescript` | `#3178C6` |
| `javascript` | `#F1E05A` |
| anything else | `var(--muted-foreground)` |

These are GitHub's language colors, the same in both themes. They appear only in the composition bar (8px `rounded-full` on `bg-muted`) and its 8px legend dots. Like Mimird's avatar and indicator palettes, this is a place where color tells things apart. Language and framework badges stay neutral `secondary`.

### 3.5 Charts

The evolution chart (`components/evolution-chart.tsx`) is monochrome. Coverage is a solid `foreground` line, total tests a solid muted line, and passing tests a dashed muted line. Grid lines use `--border`; axes use muted mono.

---

## 4. Typography

The same as Mimird: **Geist** for everything and **Geist Mono** for literal text, loaded in `app/layout.tsx` as `--font-geist-sans` / `--font-geist-mono` (the names `tokens.css` reads). The body sets `font-feature-settings: "cv11", "ss01"`.

Skuld uses the app end of Mimird's scale only:

| Use | Classes |
| --- | --- |
| Page title (`h1`) | `text-xl font-semibold` |
| Card and dialog title | `font-heading text-base font-medium` |
| Stat tile value | `text-lg font-semibold tabular-nums` |
| Body, rows, nav | `text-sm` |
| Badges, timestamps, test lists, run log | `text-xs` |

Mono is for things you would type in a terminal: the directory, command and report-path fields, `code`, and the run log. Done tests are `line-through text-muted-foreground`. Every changing number is `tabular-nums`.

---

## 5. Space and shape

- Spacing and radius are Mimird's (4px unit; `rounded-sm` 6 → `rounded-2xl` 18).
- **Layout.** *Deviation:* every page is one centered `max-w-5xl` column, instead of Mimird's widening app container. The planned-tests table and the evolution chart need the width; more would scatter the ledger.
- Page gutter `px-4 py-6 sm:px-6 lg:px-8` (`components/app-shell.tsx`).
- Rhythm: `gap-6` between page sections, `gap-4` between cards in a tab, `gap-3` for grids, forms and rows in a card, `gap-2` within a row, and `gap-1.5` between a label and its field.

---

## 6. Depth and elevation

The same three tokens as Mimird (`shadow-card`, `shadow-raised`, `shadow-floating`) and `.surface-glass`, defined in `app/globals.css`. Following Mimird 6.3, app cards stay flat (`ring-1 ring-foreground/10`), and only the sidebar, menus, dialogs and toasts float.

---

## 7. Motion

Mimird's rules, unchanged. The places motion carries information in Skuld:

| Place | Motion | What it tells |
| --- | --- | --- |
| Disclosure rows (runs, suites, Add Suite, an area's tests) | The chevron turns 90° | That the row opened |
| Run Tests | The button loads (`<Button loading>`, "Running…") | That the suite is running |
| Dragging a planned test to another area | The drop zone highlights | Where the test will land |

---

## 8. Atmosphere and imagery

None. Skuld has no marketing pages, so no hero light, no stone and no imagery. The logo is the only brand mark.

---

## 9. Components

Every primitive comes from `@mimird/ui/components/*`, and the account UI comes from `@mimird/auth`. Skuld has no `components/ui/` folder; a missing primitive goes into the package (`Mimird-packages/packages/ui`), not here. Feature components go flat in `components/`.

### 9.1 App shell (`components/app-shell.tsx`, `app/(app)/layout.tsx`)

- **Sidebar.** `Sidebar` from `@mimird/ui/components/sidebar` (Mimird 9.18): a floating glass panel with the logo and wordmark as `title` and the mark alone as `mark`. Entries are `SidebarItem`s: "All Projects" (`Boxes`), then one per project (`Folder`). A project stays active on its sub-pages. The collapsed state is the `skuld_sidebar` cookie, read on the server.
- **Footer.** `UserMenu` from `@mimird/auth/account/user-menu`, with Profile and Settings items.
- **Account dialog.** `SettingsDialog` from `@mimird/auth`, with `ProfileSection` and `AppearanceSection`, opened on **`#account/profile`** and **`#account/appearance`**. *Deviation:* Mimird uses `#settings/…`, but in Skuld that fragment belongs to a project's settings modal.
- **Mobile.** Below `lg`, a header with a `Sheet` holding the same nav and the account menu.

### 9.2 Auth

`@mimird/auth` pages behind `app/(auth)/[step]/page.tsx`, with `AuthShell brand="Skuld"`. Users live in Skuld's SQLite (`kv` table in `lib/db.ts`, `kvStore` in `instrumentation.ts`). Cookies use the `skuld` prefix (`next.config.ts`), so other ecosystem apps on the same host never share Skuld's session. `proxy.ts` redirects signed-out visitors from `/`, `/projects` and `/perf-report`, and `requireUser()` in `app/(app)/layout.tsx` does the real check.

### 9.3 Feature components

| Component | What it is |
| --- | --- |
| `FormDialog` | A `Modal` with its own trigger, a visible title and description, over a form. Used by Add Project, New Test and Edit Test |
| `ConfirmSubmitButton` | A button in a form that asks through `ConfirmDialog`, then submits the form. Every destructive action goes through it |
| `RunButton` | `sm` button with a play icon that runs a project's suites. Solid on the project page, `outline` on project cards. Loads while running |
| `LanguageBar` | The composition bar and legend; `compact` drops the legend. Each segment has a `Hint` with its share |
| `EvolutionChart` | See 3.5 |
| `SuiteFields` | Name, three `MenuSelect`s (language, framework, layer) and an "Advanced" `<details>` with the command and report paths in mono. Picking a framework fills the advanced fields until the user edits them |
| `ProjectSettings` | The project modal on `#settings/general`, `#settings/suites` and `#settings/performance`, with `Switch`es for the parts and git push |
| `ErrToast` | Shows `?err=` as an error toast after a failed run |

### 9.4 Recurring patterns

- **Page header.** `h1` left, actions right. One solid button per view ("Add Project", "Run Tests"); the rest are `outline` or `ghost`.
- **Section as card.** Each block on a page is a flat `Card` with a `CardTitle`.
- **Stat tile.** `Card size="sm"`: a `text-xs` muted label over a `text-lg font-semibold tabular-nums` value, `grid-cols-2 sm:grid-cols-4`.
- **Disclosure row.** Native `<details class="group">` with `rounded-lg p-3 ring-1 ring-foreground/10` and a rotating `ChevronRight` (`components/disclosure.tsx`). Needs no JavaScript, and forms inside stay mounted.
- **Done toggle.** A submit button drawn like a checkbox (16px, `primary` fill when done), because toggling is a server action.
- **Inline add form.** Input, optional select, then an `outline` button ("Add Test", "Add Area") at the bottom of the list it adds to.
- **Icon-only actions.** `ghost`, with an `aria-label`, inside a `Hint`. Never the native `title`.
- **Destructive actions.** Tinted, never solid, and always through `ConfirmSubmitButton`.

Mutations are plain `<form action={serverAction}>` forms (`lib/actions.ts`), so every form control carries a `name`.

---

## 10. Accessibility

Mimird's rules. Add-ons for Skuld: a "Skip to content" link targets `#main` in the root layout, every icon-only control has an `aria-label`, and a disabled button with a reason wraps its `Hint` around a focusable `span`.

---

## 11. Do and don't

**Do:** start from neutral surfaces; use orange once or twice per view; keep pages to the `max-w-5xl` column of a page header and section cards; say failure with `text-destructive`.

**Don't:** add a green for passing; color badges by language; write raw colors in components (language colors from data are the exception); add a shadow to a resting card; use the native `title` or `confirm()`.

---

## 12. Implementation

Stack: Next.js 16 (App Router), React 19, Tailwind v4, `@mimird/ui` and `@mimird/auth`, `node:sqlite`.

| What | Where |
| --- | --- |
| Base tokens | `@mimird/ui/tokens.css` |
| Orange, elevation, `.surface-glass`, `.link-subtle` | `app/globals.css` |
| Fonts, theme provider, toaster | `app/layout.tsx` |
| Shell, auth gate | `components/app-shell.tsx`, `app/(app)/layout.tsx`, `proxy.ts` |
| Auth store | `lib/db.ts` (`kv`), `instrumentation.ts` |
| Language colors | `components/language-bar.tsx` |

The code rules are Mimird 12.3: no raw values in components, keep shadcn variable names, theme with variables rather than `dark:` forks, and compose rather than fork shared components.

---

## 13. Prompt guide for agents

- "One `max-w-5xl` column: an `h1` with one solid action on the right, then flat section `Card`s."
- "Primitives from `@mimird/ui/components/*`; icon buttons are `ghost` inside a `Hint`."
- "Failing is `text-destructive`; passing stays neutral."
- "Orange only on the active nav icon, links and focus."

---

## 14. Open decisions and known drift

- **Cold dark neutrals.** Mimird-Web's dark palette is an app-level override, not in `tokens.css`. When it moves into the package (Mimird section 14), Skuld picks it up for free.
- **Muninn.** It is still on `@mimird/ui` 0.3.1 with local primitives, so it no longer matches Skuld. Earlier versions of this file said the two were kept in sync.
- **Email.** No `sendEmail` is configured, so sign-up and reset codes only print to the server log. Production needs one (see `home/instrumentation.ts` for a Resend example).
