# Skuld design

How Skuld looks and why. Skuld shares its design system with Muninn and the rest of the ecosystem: the same fonts, sizes, color tokens and primitives. This describes the UI as it exists in the code today, with pointers to the source of each decision. Read it before adding or changing UI.

- [Feeling](#feeling)
- [Stack](#stack)
- [Tokens](#tokens)
- [Color palette](#color-palette)
- [Components](#components)
- [Conventions for new UI](#conventions-for-new-ui)

## Feeling

Skuld is named after the Norn of what shall be, and the mark is the Mimird icon recolored orange (`public/brand/mimird-icon-{black,white}.svg`): the black-ring one on light, the white-ring one on dark. It is one place for every kind of test a project has: it runs the suites, keeps the results over time, and lists the tests that are still owed. The UI is meant to read like a ledger: quiet, dense, and out of the way.

**Monochrome first, one light.** Every theme token is a pure grey (zero chroma) except `brand`, which is orange (`#ea580c` light, `#fb923c` dark). Orange appears only on the active sidebar icon, links (`.link-subtle`) and focus rings. Otherwise color only appears when it carries meaning: a failing test, a destructive action, or a language in the composition bar. Passing is the normal state and stays neutral. Nothing is colored for decoration.

**Flat.** Surfaces are separated by a 1px ring (`ring-1 ring-foreground/10`) or a hairline border, not by shadows. The only shadows are on things that float (the select popup) and the active tab, which comes that way from shadcn.

**Compact.** Controls are 32px tall, body text is `text-sm`, and every page is a single centered column. The app should show a lot of tests and runs without feeling cramped.

**Immediate.** Transitions run 100 to 200ms. Adding a test or an area is an always-visible inline form, not a modal. Running a suite gives feedback on the button itself.

**Plain-spoken.** Empty states are one short muted sentence: "No projects yet.", "No runs yet.", "Nothing outstanding." No illustrations, no exclamation marks, no onboarding copy.

## Stack

| Concern | Choice | Where |
| --- | --- | --- |
| Styling | Tailwind CSS v4, CSS-first (no `tailwind.config`) | `app/globals.css` |
| Component source | shadcn, style `base-nova`, base color `neutral`, CSS variables on | `components.json` |
| Headless primitives | `@base-ui/react` (Base UI, not Radix) | `components/ui/*` |
| Variants | `class-variance-authority` | `button.tsx`, `badge.tsx`, `tabs.tsx` |
| Class merging | `cn` from the `cn` package, re-exported by `lib/utils.ts` | everywhere |
| Icons | `lucide-react` | everywhere |
| Animation utilities | `tw-animate-css` | `app/globals.css` |
| Theming | `next-themes`, `attribute="class"`, default `system`, `disableTransitionOnChange` | `app/layout.tsx`, `components/theme-provider.tsx` |
| Toasts | `sonner` | `components/ui/sonner.tsx` |
| Charts | `recharts` | `components/evolution-chart.tsx` |

Mutations are plain `<form action={serverAction}>` forms (`lib/actions.ts`), so most UI is server-rendered and form controls must carry a `name`.

## Tokens

All tokens live in `app/globals.css`, in two layers:

1. **Raw variables** on `:root` (light) and `.dark` (dark), such as `--background` and `--radius`.
2. **Tailwind mapping** in `@theme inline`, which exposes them as utilities: `--color-background: var(--background)` gives `bg-background`, `--radius-lg: var(--radius)` gives `rounded-lg`, and so on.

Dark mode is class-based: `@custom-variant dark (&:is(.dark *))`. The base layer applies `border-border outline-ring/50` to every element and `bg-background text-foreground` to `body`, so borders and outlines pick up the theme with no extra classes. It also sets `font-mono` on `code`, `pre` and `kbd`, and shortens all motion under `prefers-reduced-motion`.

### Color tokens

Values are OKLCH. `L` alone means `oklch(L 0 0)`, a pure grey. The values are the same as Muninn's; keep them in sync.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` | 1 | 0.145 | Page background |
| `foreground` | 0.145 | 0.985 | Default text, the coverage line in the chart |
| `card` | 1 | 0.205 | Card surface |
| `card-foreground` | 0.145 | 0.985 | Text on cards |
| `popover` | 1 | 0.205 | Dialogs, select popup, toasts, chart tooltip |
| `popover-foreground` | 0.145 | 0.985 | Text on popovers |
| `primary` | 0.205 | 0.922 | Default button, checked checkbox, done toggle |
| `primary-foreground` | 0.985 | 0.205 | Text and icons on primary |
| `secondary` | 0.97 | 0.269 | Secondary badge (layer, language, framework, git status) |
| `secondary-foreground` | 0.205 | 0.985 | Text on secondary |
| `muted` | 0.97 | 0.269 | Hover fills, tab list, log block, language bar track |
| `muted-foreground` | 0.556 | 0.708 | Secondary text, empty states, done tests, placeholder, chart axes and count lines |
| `accent` | 0.97 | 0.269 | Focused select item |
| `accent-foreground` | 0.205 | 0.985 | Text on accent |
| `destructive` | `0.577 0.245 27.325` | `0.704 0.191 22.216` | Failing counts, failed tests, delete project button, invalid fields |
| `border` | 0.922 | white at 10% | Hairlines, dividers, chart grid |
| `input` | 0.922 | white at 15% | Field and checkbox borders, dark field fill (at 30%) |
| `brand` | `#ea580c` | `#fb923c` | Active sidebar icon, `.link-subtle`, text selection (at 28%) |
| `ring` | `#ea580c` | `#fb923c` | Focus ring (at 50%) and focus border |
| `sidebar` | 0.985 | 0.205 | Sidebar surface |
| `sidebar-foreground` | 0.145 | 0.985 | Sidebar text (inactive items use it at 70%) |
| `sidebar-accent` | 0.97 | 0.269 | Active and hovered nav item, active theme button |
| `sidebar-accent-foreground` | 0.205 | 0.985 | Text on the above |
| `sidebar-border` | 0.922 | white at 10% | Sidebar right edge |
| `sidebar-primary` | 0.205 | `0.488 0.243 264.376` | Defined, unused |
| `sidebar-primary-foreground` | 0.985 | 0.985 | Defined, unused |
| `sidebar-ring` | `#ea580c` | `#fb923c` | Defined, unused |
| `chart-1` to `chart-5` | 0.87, 0.556, 0.439, 0.371, 0.269 | same | Defined, unused (see below) |

Things worth knowing:

- `secondary`, `muted` and `accent` are the same grey in each theme. They are three names for one fill; pick the name by intent (static chip, quiet hover, selection).
- In dark mode, `border` and `input` are translucent white, not solid greys, so hairlines stay visible on both the page (0.145) and raised surfaces (0.205).
- Light mode has no elevation steps: page, card and popover are all white, and the ring does the separating. Dark mode raises cards, popovers and the sidebar one step (0.145 to 0.205).
- `destructive` is used as text or as a tint, never a solid fill: `text-destructive` for failures, `bg-destructive/10 text-destructive` for the button (20% in dark).
- The `chart-*` tokens do not flip between themes, so `chart-1` is almost invisible on a white card. The evolution chart uses `foreground` and `muted-foreground` instead, which do flip.

### Radius

One base value, `--radius: 0.625rem` (10px), and a derived scale:

| Utility | Formula | Size | Used by |
| --- | --- | --- | --- |
| `rounded-sm` | `× 0.6` | 6px | Text-button focus shape |
| `rounded-md` | `× 0.8` | 8px | Sidebar nav items, theme buttons, tab triggers, select items, `xs`/`sm` buttons |
| `rounded-lg` | `× 1` | 10px | Buttons, inputs, native selects, tab list, disclosure rows, log block |
| `rounded-xl` | `× 1.4` | 14px | Cards, dialogs |
| `rounded-2xl` | `× 1.8` | 18px | Unused |
| `rounded-3xl` | `× 2.2` | 22px | Unused |
| `rounded-4xl` | `× 2.6` | 26px | Badges (reads as a pill at 20px tall) |
| `rounded-full` | | | Language bar and its legend dots |

The checkbox and the done toggle are the fixed exception at `rounded-[4px]`. Toasts and the chart tooltip take `--radius` directly.

### Typography

| Role | Font | Variable |
| --- | --- | --- |
| Body and headings | Plus Jakarta Sans | `--font-sans`, also aliased as `--font-heading` |
| Monospace | Geist Mono | `--font-mono`, exposed as `font-mono` |

Both are loaded with `next/font/google` in `app/layout.tsx`, and `html` gets `antialiased`. Monospace is for things the user would type in a terminal: directory, command and report-path fields, `code`, and the run log.

The type scale in use is small on purpose:

| Use | Classes |
| --- | --- |
| Page title (`h1`) | `text-xl font-semibold` |
| Card title, dialog title, wordmark | `font-heading text-base font-medium` (wordmark is `font-semibold`) |
| Stat tile value | `text-lg font-semibold tabular-nums` |
| Body, rows, descriptions, nav | `text-sm` (nav and section labels add `font-medium`) |
| Badges, tile labels, timestamps, test and coverage lists, log | `text-xs` (badges add `font-medium`) |
| Inputs and textareas | `text-base` on mobile, `md:text-sm` (avoids iOS zoom on focus) |

Hierarchy comes from weight and from `text-muted-foreground`, not from size. Done tests are `line-through text-muted-foreground`. Every number that can change (percentages, counts, dates) is `tabular-nums`.

### Spacing and layout

Shell (`app/layout.tsx`, `components/sidebar.tsx`):

- `body` is a flex row: sidebar, then `main`.
- Sidebar: `w-60` open, `w-14` collapsed, `h-screen`, sticky, with a `h-16` header row. Width animates over 200ms.
- Main: `p-8`, scrolls on its own, content centered at `max-w-5xl`.

`max-w-5xl` is Skuld's one layout difference from Muninn (`max-w-3xl`). The planned-tests table and the evolution chart need the width.

Rhythm inside a page:

| Gap | Where |
| --- | --- |
| `gap-6` | Between page sections (header, tabs, cards) |
| `gap-4` | Between cards inside a tab, dialog content |
| `gap-3` | Project grid, stat tiles, forms, rows inside a card |
| `gap-2` | Elements within a row, inline forms |
| `gap-1.5` | Label and its field |
| `gap-1` | Nav items, chevron and label, select and its button |

Card padding is a single variable, `--card-spacing`: 16px by default, 12px with `size="sm"`. It drives the card's vertical padding, its inner gap and the horizontal padding of every slot. Dialogs use `p-4`, disclosure rows `p-3`.

### Control sizes

| Size | Height | Notes |
| --- | --- | --- |
| `xs` | 24px | `text-xs`, 12px icons |
| `sm` | 28px | 0.8rem text, 14px icons |
| `default` | 32px | Buttons, inputs, select trigger, native selects, tab list |
| `lg` | 36px | |
| `icon`, `icon-xs`, `icon-sm`, `icon-lg` | square at the matching height | |

Icons default to `size-4` (16px). Chevrons and the back arrow are `size-3.5`. Checkboxes and the done toggle are 16px.

### States and motion

| State | Treatment |
| --- | --- |
| Hover | A `muted` fill (`hover:bg-muted`, or `/50` on cards), or an underline for text links |
| Focus | `focus-visible:border-ring` plus `ring-3 ring-ring/50` |
| Pressed | Buttons shift down 1px (`active:translate-y-px`) |
| Disabled | `opacity-50`, pointer events off |
| Invalid | `border-destructive` plus `ring-3 ring-destructive/20` (40% in dark) |
| Pending | Control disabled, its icon replaced by a spinner (`animate-spin`) |
| Failing | `text-destructive` on the count or the test line |

Motion is short and functional: dialogs and popups fade and zoom from 95% in 100ms, the sidebar width takes 200ms, and disclosure chevrons rotate 90 degrees. Theme switches do not animate.

## Color palette

### Neutrals

Nine grey steps cover every surface and text color:

| OKLCH L | Light theme role | Dark theme role |
| --- | --- | --- |
| 1 | Background, card, popover | Border and input (at 10% and 15% alpha) |
| 0.985 | Sidebar, text on primary | Foreground |
| 0.97 | Secondary, muted, accent | |
| 0.922 | Border, input | Primary |
| 0.708 | Ring | Muted foreground |
| 0.556 | Muted foreground | Ring |
| 0.269 | | Secondary, muted, accent |
| 0.205 | Primary | Card, popover, sidebar, text on primary |
| 0.145 | Foreground | Background |

### Destructive

| Theme | Value |
| --- | --- |
| Light | `oklch(0.577 0.245 27.325)` |
| Dark | `oklch(0.704 0.191 22.216)` |

It doubles as the outcome color. A failing count ("3 failing"), a failed test in a run, and the "Passing" tile when anything fails are `text-destructive`. There is no success green: a passing run looks like everything else.

### Language colors

Defined in `components/language-bar.tsx`. A suite stores the language key; the hex is looked up at render time.

| Key | Hex |
| --- | --- |
| `python` | `#3572A5` |
| `typescript` | `#3178C6` |
| `javascript` | `#F1E05A` |
| anything else | `var(--muted-foreground)` |

These are GitHub's language colors. A language color is only ever shown in the composition bar (an 8px tall `rounded-full` track on `muted`) and as the 8px dot in its legend. Language and framework badges stay neutral `secondary`.

### The rule for color

Language colors are **data, not theme**. They are applied with inline `style`, they sit outside the token system, and they are identical in light and dark. Everything else uses a semantic token.

## Components

### Primitives (`components/ui/`)

Generated by shadcn (`base-nova`) on top of Base UI. Every primitive sets a `data-slot` attribute and accepts `className`. The files shared with Muninn are kept identical apart from small touch and overflow fixes.

| Component | Variants and sizes | Notes |
| --- | --- | --- |
| `Button` | Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` | `default` is the one solid, high-contrast element on a page |
| `Badge` | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` | 20px pill. `secondary` for facts (layer, language), `outline` for the area name and the "auto" marker |
| `Card` | `size`: `default`, `sm`. Slots: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | Ring instead of border or shadow |
| `Tabs` | List `variant`: `default`, `line` | The project page's four views. 32px `muted` list, active trigger raised to `background` |
| `Table` | `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | Planned tests. Scrolls horizontally inside its own container |
| `Checkbox` | | 16px, fills with `primary` when checked |
| `Accordion` | | Hides the advanced suite fields; kept mounted so they still submit |
| `Dialog` | `showCloseButton` on content and footer | `bg-black/10` backdrop with a slight blur, `sm:max-w-sm` popup, scrolls past 85vh |
| `Input` | | 32px, transparent in light, `bg-input/30` in dark |
| `Label` | | `text-sm font-medium`, always tied to its field with `htmlFor` |
| `Textarea` | | Auto-grows with `field-sizing-content`, `min-h-16` |
| `Select` | Trigger `size`: `default`, `sm` | Available, not used yet (see native selects below) |
| `Toaster` | | Sonner themed from `popover`, `border` and `radius`, with lucide status icons |

### App shell

- **`Sidebar`** (`components/sidebar.tsx`). Logo and wordmark, an "All Projects" link, then a collapsible uppercase "Projects" section (native `<details>`) with one link per project (its initial stands in for an icon), and the theme toggle. Same structure as Hermod's. Active and hovered links get `bg-sidebar-accent`; the active icon turns `text-brand`, and a project stays active on its sub-pages. Inactive links are `text-muted-foreground`. Collapsing hides labels and section headers and keeps icons with a `title` tooltip; the logo becomes the expand button on hover. State persists in `localStorage` under `skuld-sidebar-collapsed`. The project list comes from `listProjects()` in the root layout.
- **`ThemeToggle`** (`components/theme-toggle.tsx`). Three 28px icon buttons for light, dark and system. The active one takes the nav item's active style. Stacks vertically when the sidebar is collapsed. Same file as Muninn's.

### Feature components (`components/`)

| Component | What it is |
| --- | --- |
| `AddProjectDialog` | The Projects page's primary button, "Add project". Wider dialog (`sm:max-w-md`) with name, directory and the first suite |
| `RunButton` | `sm` button with a play icon that runs every suite of a project. Takes a `variant`: solid on the project page, `outline` on project cards. While running it disables and shows a spinner and "Running…" |
| `LanguageBar` | The composition bar and legend. `compact` drops the legend for project cards |
| `EvolutionChart` | Line chart of coverage (solid, `foreground`), total tests (solid, muted) and passing tests (dashed, muted) across runs |
| `SuiteFields` | The suite form body: name, three selects (language, framework, layer) and an "Advanced" accordion with the command and report paths in mono. Picking a framework fills the advanced fields from a preset until the user edits them |
| `EditPlannedTestDialog` | A planned test's title is a text button (underline on hover) that opens a dialog to rename it and move it to another area |
| `ConfirmSubmitButton` | A `Button` that asks through the native `confirm()` before submitting its form |
| `ErrToast` | Shows the `?err=` query parameter as an error toast after a failed run |

### Recurring patterns

- **Page header.** `h1` on the left, actions on the right, in a `flex items-center justify-between` row. Only one action per view is a solid `default` button ("Add project", "Run tests"); the rest are `outline` or `ghost`. A dialog counts as its own view, so its submit is solid.
- **Back link.** Muted `text-sm` link with a `size-3.5` left arrow above the page title on the project page.
- **Section as card.** Each block on a page is a `Card` with a `CardTitle` ("Test composition", "Evolution", "Test suites", one per area).
- **Stat tile.** `Card size="sm"`: a `text-xs` muted label over a `text-lg font-semibold tabular-nums` value. Four across (`grid-cols-2 sm:grid-cols-4`).
- **Project card.** Name (link), directory as the description, then the last run on one line: coverage in `foreground`, counts muted, failures in `destructive`, with the outline Run button on the right and the compact language bar below. The whole card gets `hover:bg-muted/50`.
- **Disclosure row.** A native `<details class="group">` with `rounded-lg p-3 ring-1 ring-foreground/10`. The summary hides its marker and starts with a `ChevronRight` (`size-3.5`, muted) that rotates with `group-open:rotate-90`. Used for runs, suites, "Add suite" and an area's test list (there without the ring, since it already sits in a card). No JavaScript, and forms inside stay mounted.
- **Planned-test row.** A table row: done toggle, title (opens the edit dialog), layer badge, link-to-discovered select with a ghost "Link" button, ghost X to delete.
- **Done toggle.** A submit button drawn like the `Checkbox` (16px, `rounded-[4px]`, `primary` fill and a check when done), because toggling is a server action.
- **Native select.** Forms that post to server actions use a plain `<select>` with `selectCls` from `lib/utils.ts`, which matches `Input` (32px, `rounded-lg`, `border-input`, same focus ring).
- **Inline add form.** Input, optional select, then an `outline` button ("Add test", "Add area") in a `flex items-end gap-2` row at the bottom of the list it adds to.
- **Icon-only actions.** `ghost` inside rows, always with a `title` and an `aria-label`.
- **Async feedback.** The control disables and its icon spins. Errors come back as a sonner toast.
- **Destructive actions.** Tinted, never solid, and always through `ConfirmSubmitButton`. "Delete project" sits in the danger zone of the settings modal (`#settings/general`, opened by the cog next to Run tests); deleting an area or a suite is a `ghost` button.
- **Button labels.** Sentence case: "Add test", "Delete area", "Save suite".

## Conventions for new UI

- Use semantic tokens (`bg-muted`, `text-muted-foreground`, `border-border`). Do not write raw colors, with one exception: language colors from data, applied through inline `style`.
- Reach for an existing primitive first. Add new ones with shadcn so they land in `components/ui/` in the `base-nova` style; feature components go flat in `components/`.
- When a primitive or token changes here, make the same change in Muninn (and the other way round).
- Stay on the scale: 32px controls, the radius steps above, `text-sm` body, 16px lucide icons.
- Separate surfaces with the ring or a border. Add a shadow only to something that floats.
- Keep pages to the single `max-w-5xl` column, built from the page header and section cards.
- One solid button per view.
- Red means failing or destructive. Do not add a green for passing.
- Write empty states as one short muted sentence.
- Check both themes; remember that light mode has no surface steps to lean on.
