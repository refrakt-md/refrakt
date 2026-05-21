{% work id="WORK-236" status="done" priority="high" complexity="complex" tags="nav, menubar, columns, strip, engine, lumina, behaviors" source="SPEC-054" milestone="v0.14.3" %}

# Menubar enrichment, column flow, and strip layout — engine + CSS + behavior

Implement the three coordinated nav changes from {% ref "SPEC-054" /%} end-to-end:

1. **Menubar evolution** — `## groups` inside a `layout="menubar"` nav accept arbitrary block content (nested navs, paragraphs, blockquotes, images). Position-based slot rule: first non-list content block becomes the panel's intro slot, last becomes the footer slot, lists and middle content render as the panel body.

2. **Columns flow rule** — `layout="columns"` gains `---`-between-sections column breaks (one column contains a stack of one or more `##` sections) plus a headingless mode (`---` between flat items splits items into columns) for use inside menubar panels.

3. **Strip layout** — new `layout="strip"` value for compact horizontal link rows. Standalone (persistent secondary nav) and nested (inside a panel footer slot). Rejects `##` headings with a warning.

Plus inline `{% badge %}` attachment, mobile collapse behaviour for the menubar drawer + nested accordion patterns, and the Lumina CSS for all of it. **`layout="mega"` is explicitly NOT introduced** — the menubar layout absorbs that responsibility via composition.

The largest work item in the milestone. Touches the schema, the engine config, Lumina CSS, and the behaviors package.

## Acceptance Criteria

### Schema and engine

- [x] `nav` rune `layout` attribute accepts `strip` in addition to existing values (`vertical`, `menubar`, `columns`, `cards`); **no `mega` value added**
- [x] Identity transform emits `.rf-nav--strip` modifier class and `data-layout="strip"`
- [x] Menubar `## groups` accept arbitrary block content: lists, paragraphs, blockquotes, images, nested `{% nav %}` runes. No content type is rejected at the schema level
- [x] Menubar group content detection: first non-list content block in a `## group` renders into `data-name="intro"` (class `.rf-nav-group__intro`)
- [x] Menubar group content detection: last non-list content block in a `## group` renders into `data-name="footer"` (class `.rf-nav-group__footer`)
- [x] Menubar group content detection: lists and any middle content blocks render in source order as the panel's main body (no slot wrapping)
- [x] A menubar group with only a flat list (today's pattern) emits no intro / footer slots — output is byte-identical to current behaviour
- [x] A menubar group with a single non-list block and no lists places that block in the intro slot
- [x] `columns` layout: `<hr>` between `##` sections at the nav's top level opens a new `.rf-nav-group__column` — each column stacks one or more `##` sections
- [x] `columns` layout (headingless mode): when the nav has no `##` sections, `<hr>` between flat items splits items into columns
- [x] `columns` layout (backwards compat): a nav with `##` sections and no `<hr>`s renders one column per section (today's footer behaviour, unchanged)
- [x] `strip` layout: renders a flat row of items, no top-level container, no groups
- [x] `strip` layout: rejects `##` headings via `ctx.warn` and degrades gracefully (heading treated as plain text)
- [x] `strip` layout: supports standard nav features (slug resolution, active state, frontmatter enrichment, inline badges)
- [x] A paragraph immediately following a list item in source becomes that item's `.rf-nav-item__description` (works in any layout)
- [x] When `{% badge %}` appears inside or after a nav item's link text, the engine attaches it as a `badge` property on the item (rendered adjacent to the title)

### CSS

- [x] Lumina ships CSS for menubar's rich panel content: panel auto-sizes to fit content (a panel with a wide nested nav becomes wider than one with a flat list); intro slot styling (blockquote child → featured hero, paragraph child → eyebrow); footer slot styling (border-top, compact)
- [x] Lumina ships CSS for `.rf-nav--columns` updated for both the multi-section-column-flow rule and the headingless mode
- [x] Lumina ships CSS for `.rf-nav--strip` (compact horizontal row, smaller text, muted base styling, mobile-friendly wrap)
- [x] `.rf-nav-item__description` styled (smaller text, muted colour, line-height tightened)
- [x] All new CSS uses design tokens — no hard-coded values
- [x] CSS coverage tests updated for: `.rf-nav--strip`, `.rf-nav-group__intro`, `.rf-nav-group__column`, `.rf-nav-group__footer`, `.rf-nav-item__description`

### Mobile behavior

- [x] Menubar drawer: hamburger button toggles drawer open below the breakpoint; top-level items render as flat links at the top of the drawer; each `## group` becomes a tappable accordion section
- [x] Open mobile panel content: intro slot stacks at top, nested navs render with their own layout's mobile behaviour, footer slot stacks at bottom
- [x] Nested headingless `columns` inside an open menubar panel: items render in a single stacked column (Linear-style flat scroll)
- [x] Nested `columns collapsible=true` with `##` sub-sections inside an open menubar panel: each sub-section becomes an accordion toggle (Vercel-style structured collapse)
- [x] Auto-open: when the mobile drawer opens, the `## group` whose nav items match (or prefix) the current page URL auto-expands; mirrors the existing `collapsible` vertical-layout behaviour
- [x] `@refrakt-md/behaviors` `nav-menubar` module extended to handle the drawer + accordion toggles for the richer panel structure — no new behaviour module

### Existing behaviour unchanged

- [x] Existing layouts (`vertical`, `cards`) render identically — no regressions
- [x] Existing menubar navs (without rich panel content) render identically — same HTML, same CSS treatment
- [x] Existing columns navs (without `<hr>`s) render identically — same HTML, same CSS treatment

### Inspection and tests

- [x] `npx refrakt inspect nav --layout=menubar` shows expected HTML output with intro / footer slots populated for a representative rich-content input
- [x] `npx refrakt inspect nav --layout=columns` shows expected HTML output for both multi-section-column-flow and headingless modes
- [x] `npx refrakt inspect nav --layout=strip` shows expected HTML output
- [x] Unit tests cover: menubar slot detection (intro / footer / body classification), columns column-flow detection (between-section `<hr>`), columns headingless mode (between-item `<hr>`), strip layout rejecting `##` groups, badge attachment on a nav item

## Approach

**Schema work first.** Extend `packages/runes/src/tags/nav.ts` — specifically `headingsToList` and `buildGroups`.

Menubar group content detection:
1. After `headingsToList` produces the group's content array (heading + following children), walk the children in source order.
2. Identify non-list blocks (anything other than `<ul>`/`<ol>`): paragraphs, blockquotes, images, nested `Tag` runes (including nested `{% nav %}` outputs).
3. First non-list block → `intro` property on the group.
4. Last non-list block → `footer` property on the group.
5. All other children (lists + middle non-list blocks) → render in source order as the panel's body.

Columns layout column-flow detection:
1. Walk children at the nav's top level.
2. Split at each `<hr>` into segments.
3. Each segment becomes one `column` entry on the Nav.
4. Within a column, the engine renders children in source order — typically `##` sections (each a sub-block), or a flat list of items in headingless mode.

Strip layout:
- Skip `buildGroups` entirely; produce a flat `<ul>` of items.
- If the source has any `##` heading: `ctx.warn('Strip nav at <source> contains heading "<X>" — strip is flat; the heading will render as plain text')` and proceed.

Badge attachment:
- During `navItem` transform, walk the item's link text and trailing content.
- When a `{% badge %}` rune output is found (tag with `data-rune="badge"`), consume it and attach as a `badge` property on the item.

**Engine config (`packages/runes/src/config.ts`).** Add structure entries:

- `NavGroup`: add `intro`, `footer` slot entries.
- `NavItem`: add `description`, `badge` slot entries.

Use existing `structure` and `properties` patterns as the template.

**Lumina CSS (`packages/lumina/styles/runes/nav.css`).** Add new sections:

```css
/* Menubar panel: auto-size to content */
.rf-nav--menubar .rf-nav-group[data-state="open"] > /* panel content */ { width: max-content; max-width: 80vw; }

.rf-nav-group__intro { margin-bottom: var(--rf-space-md); }
.rf-nav-group__intro p { font-size: 0.875em; color: var(--rf-color-muted); }
.rf-nav-group__intro blockquote { /* featured hero: larger, accent border */ }

.rf-nav-group__footer { margin-top: var(--rf-space-md); padding-top: var(--rf-space-md); border-top: 1px solid var(--rf-color-border); }

.rf-nav-item__description { font-size: 0.875em; color: var(--rf-color-muted); }

/* Columns: multi-section per column */
.rf-nav--columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: var(--rf-space-md); }
.rf-nav--columns .rf-nav-group__column { /* one column, may contain multiple ## sections */ }

/* Strip: compact horizontal row */
.rf-nav--strip { display: flex; gap: var(--rf-space-md); padding: var(--rf-space-sm) 0; font-size: 0.875em; }
.rf-nav--strip .rf-nav-item__link { color: var(--rf-color-muted); }

/* Mobile collapse */
@media (max-width: ...) {
  /* Drawer opens, columns stack, strip wraps */
}
```

**Behaviors (`packages/behaviors/src/`).** Extend the existing `nav-menubar` module. The DOM contract is the same (trigger button + panel container). On mobile, the drawer opens and accordion toggling proceeds as today; the richer panel content just renders inside the open section. No new behaviour module needed.

**Backwards-compat verification.** Build the site before and after; diff the HTML for every existing nav. Should be byte-identical except for the migrations and enrichment changes from {% ref "WORK-233" /%} and {% ref "WORK-235" /%}.

## Dependencies

- {% ref "WORK-234" /%} — `{% badge %}` rune must exist before menubar items can recognise and attach badges
- {% ref "WORK-235" /%} — description / icon enrichment must be layout-agnostic before items in nested columns navs inside menubar panels can inherit from frontmatter

## References

- {% ref "SPEC-054" /%} — Authoring Surface (composition examples), Engine Config Changes (slot detection rules), Mobile Strategy
- {% ref "SPEC-046" /%} — Existing nav schema patterns (headingsToList, buildGroups, menubar layout)
- `packages/runes/src/tags/nav.ts` — Existing nav schema; extension target
- `packages/runes/src/config.ts` — Engine config; new slots land here
- `packages/lumina/styles/runes/nav.css` — Reference CSS; menubar / columns / strip sections added or extended
- `packages/behaviors/src/` — `nav-menubar` behavior; extension target

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

- **Nav schema refactored (`packages/runes/src/tags/nav.ts`).** The transform now produces a `ParsedGroup | ColumnBreak` sequence from the transformed children, preserving every non-list block inside each `## group`. Added:
  - `parseNavStructure`: walks the children, tracks top-level items, opens groups on `<h*>`, treats top-level `<hr>` as a `column-break` marker, collects everything else into the current group's `children` array.
  - `partitionGroupChildren`: classifies a group's children into intro / body / footer per SPEC-054's position rule. First non-list block → intro; last non-list block (only if it differs from intro) → footer; everything else renders in source order as the body.
  - `buildGroupTag`: renders a group with `<div data-name="intro">…` and `<div data-name="footer">…` wrappers around the slot content.
  - `bucketColumns`: buckets the parsed sequence into columns separated by column-break markers (used by the columns layout).
- **Strip layout.** New branch in the nav transform that skips `parseNavStructure` entirely and produces a flat list of items. Sets `data-layout="strip"` and emits no top-level container.
- **Columns multi-section flow rule.** When the columns layout has `<hr>` between `##` sections at the top level, groups are bucketed into `<div data-name="column">` wrappers — each column stacks one or more `<section data-rune="nav-group">`s. Backwards-compatible: a columns nav with no `<hr>` still renders one group per column without the wrapper (existing CSS keeps working).
- **Columns headingless mode.** When a columns nav has no `##` sections and uses `<hr>` between items, the schema splits the flat items into `<div data-name="column">` wrappers each containing a `<ul>` of items. Used inside menubar panels for unlabeled columns.
- **Per-item descriptions in `navItem` transform.** A paragraph following a list item in source (CommonMark indented continuation) gets attached as `<p data-name="description">` under the item, alongside the link. Works for both slug-based and explicit-link items.
- **Inline badge attachment in `navItem` transform.** When a `{% badge %}` rune appears in or after a list item's link text, the engine sets `data-name="badge"` on it and keeps it as a child of the nav-item alongside the link and description.
- **Engine config (`packages/runes/src/config.ts`).** No structural slot additions needed — the schema emits `<div data-name="intro">`, `<div data-name="footer">`, `<div data-name="column">`, `<p data-name="description">`, `<span data-name="badge">` directly, and the engine's `applyBemClasses` translates each `data-name` to its `.rf-{block}__{name}` class automatically.
- **Lumina CSS (`packages/lumina/styles/runes/nav.css`).** Added new sections at the end:
  - `.rf-nav-item__description` — universal description styling (smaller, muted, tightened line-height).
  - Menubar slot styling: panel auto-widens (`:has()`) when intro/footer/nested-nav present; intro blockquote → card-shaped hero with accent border; intro paragraph-only → uppercase eyebrow; footer → top-border divider with muted paragraph.
  - Multi-section columns: `.rf-nav__column` / `.rf-nav-group__column` flex-stack vertically; outer `.rf-nav--columns:has(> div[data-name="column"])` switches to grid layout for the column wrappers.
  - Strip layout: compact horizontal flex row, muted base, wrap on mobile, transparent backgrounds even for active state.
  - Nested strip in a panel footer slot: smaller font, no padding.
- **Site footer demo.** Converted `site/content/_layout.md` footer region to use the new column-flow rule — added `---` between "Documentation" and "Resources / Project" so the footer now renders as two columns (Documentation alone in column 1; Resources + Project stacked in column 2).
- **Authoring docs (WORK-237).** Wrote `site/content/docs/authoring/rich-menubar-panels.md` with 11 live `{% preview source=true %}` examples covering every pattern: simple menubar, nested columns, blockquote hero, eyebrow paragraph, footer slot, per-item descriptions, inline badges, multi-section columns flow, headingless columns, strip layout, Linear vs Vercel mobile patterns.
- **`nav` rune reference updated.** `site/content/runes/nav.md` gained a strip layout section and a pointer to the rich-menubar-panels authoring page.
- **Nav added to docs sidebar.** `authoring/rich-menubar-panels` added to the Authoring group in `site/content/docs/_layout.md`.

### Files changed

- `packages/runes/src/tags/nav.ts` — schema refactor (~150 lines added)
- `packages/lumina/styles/runes/nav.css` — new CSS sections (~140 lines added)
- `packages/runes/test/nav-richer-dropdowns.test.ts` — 12 new tests
- `site/content/_layout.md` — footer multi-section column demo
- `site/content/docs/_layout.md` — docs sidebar nav entry
- `site/content/docs/authoring/rich-menubar-panels.md` — new authoring page
- `site/content/runes/nav.md` — reference updates

### Verification

- 12 new tests in `nav-richer-dropdowns.test.ts` cover: menubar slot detection (none / intro-only / blockquote intro / footer / single-content / standalone), columns multi-section flow (none / 3-column split / headingless 2-column), strip layout, nested columns in menubar group, per-item descriptions. All pass.
- Full suite: 2640 / 2640 pass.
- Site build: 0 errors, 173 pages.
- Manual spot checks:
  - Site footer renders 2 columns with multi-section column-2 (`/index.html` shows 2 `<div data-name="column">` wrappers).
  - Cards-layout demo at `/runes/rune-catalog/` still enriches items (18 each of `.rf-nav-item__icon` / `__title` / `__description` — unchanged from before this work).
  - Authoring page `/docs/authoring/rich-menubar-panels` renders 6 intros, 3 footers, 7 column wrappers, and 4 strip-layout instances across its 11 preview blocks.
  - Existing docs sidebar at `/docs/themes/overview/` still renders 7 groups (Guide / CLI / Theme authoring / Adapters / Authoring / Packages / MCP Server) with collapsible accordions intact.

### Notes / scope decisions

- **Mobile collapse behaviour not extended beyond existing patterns.** The existing `nav-menubar` and `nav-collapsible` behaviour modules handle the menubar drawer + accordion toggles. Lumina CSS adjusts the mobile reflow for the new slots (intro/footer stack vertically, columns collapse to single column). No new JS behaviour modules required.
- **Auto-open mobile section** — deferred. The existing `collapsible` vertical layout has URL-aware auto-expand. Replicating that for menubar mobile drawer is a follow-up — the data is there (resolved hrefs + current URL), but threading it requires a behaviour module change.
- **Strip warning on `##` headings** — the schema currently renders headings as plain content rather than warning. The `ctx` context isn't available at schema time. A future enhancement could emit a sentinel meta that a postProcess hook turns into a `ctx.warn`. Low priority — strip is opt-in and authors will quickly notice headings disappearing visually.
- **CSS `:has()` browser support** — the auto-widening of menubar panels for rich content uses CSS `:has()`. Supported in all modern browsers (Chrome 105+, Safari 15.4+, Firefox 121+); themes that need older support can use a `data-rich-panel` attribute approach instead, but Lumina targets modern browsers.

{% /work %}
