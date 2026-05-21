{% work id="WORK-236" status="ready" priority="high" complexity="complex" tags="nav, menubar, columns, strip, engine, lumina, behaviors" source="SPEC-054" milestone="v0.14.3" %}

# Menubar enrichment, column flow, and strip layout — engine + CSS + behavior

Implement the three coordinated nav changes from {% ref "SPEC-054" /%} end-to-end:

1. **Menubar evolution** — `## groups` inside a `layout="menubar"` nav accept arbitrary block content (nested navs, paragraphs, blockquotes, images). Position-based slot rule: first non-list content block becomes the panel's intro slot, last becomes the footer slot, lists and middle content render as the panel body.

2. **Columns flow rule** — `layout="columns"` gains `---`-between-sections column breaks (one column contains a stack of one or more `##` sections) plus a headingless mode (`---` between flat items splits items into columns) for use inside menubar panels.

3. **Strip layout** — new `layout="strip"` value for compact horizontal link rows. Standalone (persistent secondary nav) and nested (inside a panel footer slot). Rejects `##` headings with a warning.

Plus inline `{% badge %}` attachment, mobile collapse behaviour for the menubar drawer + nested accordion patterns, and the Lumina CSS for all of it. **`layout="mega"` is explicitly NOT introduced** — the menubar layout absorbs that responsibility via composition.

The largest work item in the milestone. Touches the schema, the engine config, Lumina CSS, and the behaviors package.

## Acceptance Criteria

### Schema and engine

- [ ] `nav` rune `layout` attribute accepts `strip` in addition to existing values (`vertical`, `menubar`, `columns`, `cards`); **no `mega` value added**
- [ ] Identity transform emits `.rf-nav--strip` modifier class and `data-layout="strip"`
- [ ] Menubar `## groups` accept arbitrary block content: lists, paragraphs, blockquotes, images, nested `{% nav %}` runes. No content type is rejected at the schema level
- [ ] Menubar group content detection: first non-list content block in a `## group` renders into `data-name="intro"` (class `.rf-nav-group__intro`)
- [ ] Menubar group content detection: last non-list content block in a `## group` renders into `data-name="footer"` (class `.rf-nav-group__footer`)
- [ ] Menubar group content detection: lists and any middle content blocks render in source order as the panel's main body (no slot wrapping)
- [ ] A menubar group with only a flat list (today's pattern) emits no intro / footer slots — output is byte-identical to current behaviour
- [ ] A menubar group with a single non-list block and no lists places that block in the intro slot
- [ ] `columns` layout: `<hr>` between `##` sections at the nav's top level opens a new `.rf-nav-group__column` — each column stacks one or more `##` sections
- [ ] `columns` layout (headingless mode): when the nav has no `##` sections, `<hr>` between flat items splits items into columns
- [ ] `columns` layout (backwards compat): a nav with `##` sections and no `<hr>`s renders one column per section (today's footer behaviour, unchanged)
- [ ] `strip` layout: renders a flat row of items, no top-level container, no groups
- [ ] `strip` layout: rejects `##` headings via `ctx.warn` and degrades gracefully (heading treated as plain text)
- [ ] `strip` layout: supports standard nav features (slug resolution, active state, frontmatter enrichment, inline badges)
- [ ] A paragraph immediately following a list item in source becomes that item's `.rf-nav-item__description` (works in any layout)
- [ ] When `{% badge %}` appears inside or after a nav item's link text, the engine attaches it as a `badge` property on the item (rendered adjacent to the title)

### CSS

- [ ] Lumina ships CSS for menubar's rich panel content: panel auto-sizes to fit content (a panel with a wide nested nav becomes wider than one with a flat list); intro slot styling (blockquote child → featured hero, paragraph child → eyebrow); footer slot styling (border-top, compact)
- [ ] Lumina ships CSS for `.rf-nav--columns` updated for both the multi-section-column-flow rule and the headingless mode
- [ ] Lumina ships CSS for `.rf-nav--strip` (compact horizontal row, smaller text, muted base styling, mobile-friendly wrap)
- [ ] `.rf-nav-item__description` styled (smaller text, muted colour, line-height tightened)
- [ ] All new CSS uses design tokens — no hard-coded values
- [ ] CSS coverage tests updated for: `.rf-nav--strip`, `.rf-nav-group__intro`, `.rf-nav-group__column`, `.rf-nav-group__footer`, `.rf-nav-item__description`

### Mobile behavior

- [ ] Menubar drawer: hamburger button toggles drawer open below the breakpoint; top-level items render as flat links at the top of the drawer; each `## group` becomes a tappable accordion section
- [ ] Open mobile panel content: intro slot stacks at top, nested navs render with their own layout's mobile behaviour, footer slot stacks at bottom
- [ ] Nested headingless `columns` inside an open menubar panel: items render in a single stacked column (Linear-style flat scroll)
- [ ] Nested `columns collapsible=true` with `##` sub-sections inside an open menubar panel: each sub-section becomes an accordion toggle (Vercel-style structured collapse)
- [ ] Auto-open: when the mobile drawer opens, the `## group` whose nav items match (or prefix) the current page URL auto-expands; mirrors the existing `collapsible` vertical-layout behaviour
- [ ] `@refrakt-md/behaviors` `nav-menubar` module extended to handle the drawer + accordion toggles for the richer panel structure — no new behaviour module

### Existing behaviour unchanged

- [ ] Existing layouts (`vertical`, `cards`) render identically — no regressions
- [ ] Existing menubar navs (without rich panel content) render identically — same HTML, same CSS treatment
- [ ] Existing columns navs (without `<hr>`s) render identically — same HTML, same CSS treatment

### Inspection and tests

- [ ] `npx refrakt inspect nav --layout=menubar` shows expected HTML output with intro / footer slots populated for a representative rich-content input
- [ ] `npx refrakt inspect nav --layout=columns` shows expected HTML output for both multi-section-column-flow and headingless modes
- [ ] `npx refrakt inspect nav --layout=strip` shows expected HTML output
- [ ] Unit tests cover: menubar slot detection (intro / footer / body classification), columns column-flow detection (between-section `<hr>`), columns headingless mode (between-item `<hr>`), strip layout rejecting `##` groups, badge attachment on a nav item

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

{% /work %}
