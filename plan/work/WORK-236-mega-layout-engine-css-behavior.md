{% work id="WORK-236" status="ready" priority="high" complexity="complex" tags="nav, mega-menu, engine, lumina, behaviors" source="SPEC-054" milestone="v0.14.3" %}

# Mega + strip layouts: engine + Lumina CSS + behavior

Implement `layout="mega"` and `layout="strip"` end-to-end. For mega: extend the nav schema's imperative `headingsToList` / `buildGroups` path to detect the position-based slot rule (`---`-separated segments classified as columns or content; first content → intro, last content → footer), attach inline `{% badge %}` runes to items, and add the engine config slots. For strip: a flat row layout with a warning if `## groups` are present. Ship Lumina CSS for both layouts including mobile collapse, and extend the existing `nav-menubar` behavior to handle mega trigger open/close.

The largest work item in the milestone. Touches the schema, the engine config, Lumina CSS, and the behaviors package.

## Acceptance Criteria

- [ ] `nav` rune `layout` attribute accepts `mega` and `strip` in addition to existing values (`vertical`, `menubar`, `columns`, `cards`)
- [ ] Identity transform emits `.rf-nav--mega` / `.rf-nav--strip` modifier classes and corresponding `data-layout` values
- [ ] Mega: top-level items (before the first `##`) render as flat menubar links in the existing `data-name="top-level"` container — same as SPEC-046's menubar layout (no separate trigger-routing logic)
- [ ] Mega: each `## group`'s heading becomes a panel trigger automatically; trigger text is the heading text
- [ ] Mega: within a `## group`, `---`-separated segments are classified — segments containing only `<ul>`/`<ol>` (with optional whitespace) become **columns**; segments containing anything else become **content slots**
- [ ] Mega: first content segment in a group renders into `data-name="intro"` (class `.rf-nav-group__intro`)
- [ ] Mega: last content segment in a group renders into `data-name="footer"` (class `.rf-nav-group__footer`)
- [ ] Mega: all column segments render in source order inside `data-name="columns"` (class `.rf-nav-group__columns`), each in its own `.rf-nav-group__column`
- [ ] Mega: a group with only column segments emits no intro / footer slots (clean simple panel)
- [ ] Mega: a group with a single non-column segment and no columns places that segment in the intro slot
- [ ] Mega: a paragraph immediately following a list item in source becomes that item's `.rf-nav-item__description`
- [ ] Mega: when `auto=true`, items without an explicit description inherit one from frontmatter (via {% ref "WORK-235" /%}'s enrichment); icon resolution behaves the same
- [ ] Mega: when a `{% badge %}` rune appears inside a nav item's link text or trailing content, the engine recognises it and attaches it as a `badge` property on the item, rendered adjacent to the title
- [ ] Strip: renders as a flat row of items (no groups, no panels, no top-level container)
- [ ] Strip: rejects `## groups` — emits a build warning via `ctx.warn` if a strip layout contains any `## heading`
- [ ] Strip: supports standard nav features (slug resolution, active state, frontmatter enrichment, badges on items)
- [ ] All existing layouts (`vertical`, `menubar`, `columns`, `cards`) continue to render identically — no behavior change for callers not on the mega / strip layouts
- [ ] Lumina ships CSS for `.rf-nav--mega` covering: column grid (clamped to max 3 cols), intro slot styling (blockquote child → featured hero treatment, paragraph child → eyebrow), footer slot styling (border-top, compact), mobile stacked fallback
- [ ] Lumina ships CSS for nested `{% nav layout="strip" %}` inside a mega panel's footer slot — renders as a compact link row
- [ ] Lumina ships standalone CSS for `.rf-nav--strip` (compact horizontal row, smaller text, muted base styling, mobile-friendly wrap)
- [ ] `.rf-nav-item__description` styled (smaller text, muted color, line-height tightened)
- [ ] Mobile fallback for mega: at narrow viewports, behaves like a vertical accordion — each top-level trigger toggles its panel open, columns stack to a single column, intro and footer slots stay in their relative positions
- [ ] `@refrakt-md/behaviors` `nav-menubar` behavior extended to handle mega trigger open/close — no new behavior module, just the existing one made aware of mega panels
- [ ] CSS coverage tests updated for all new selectors: `.rf-nav--mega`, `.rf-nav--strip`, `.rf-nav-group__intro`, `.rf-nav-group__columns`, `.rf-nav-group__column`, `.rf-nav-group__footer`, `.rf-nav-item__description`
- [ ] `npx refrakt inspect nav --layout=mega` produces expected HTML output with all new slots populated for a representative input
- [ ] `npx refrakt inspect nav --layout=strip` produces expected HTML output
- [ ] Unit tests cover the schema's detection logic: intro detection (paragraph + blockquote at start of group), column splits, footer detection (paragraph / image / nested strip at end of group), middle content segments, badge attachment, strip layout rejecting groups

## Approach

**Schema work first.** Extend `packages/runes/src/tags/nav.ts` — specifically `headingsToList` and `buildGroups`. The position-based detection algorithm:

1. For each `## group`, walk children in source order.
2. Split into segments at each `<hr>` node.
3. Classify each segment by inspecting its content:
   - Only `<ul>` / `<ol>` (with optional whitespace text nodes) → **column**
   - Anything else → **content**
4. Walk classified segments:
   - First content segment → `intro` property on the group
   - Last content segment → `footer` property on the group
   - All other segments (columns + any middle content) → ordered `columns` array

The `intro` and `footer` properties carry the raw segment content (paragraphs, blockquotes, images, nested runes, etc.) — the theme styles based on what's there, not based on per-content-type detection in the engine.

**Badge attachment**: walk each nav item's children; when an inline `{% badge %}` rune (or its post-transform output) is found, attach it as a `badge` property on the item and remove it from the inline children.

**Strip layout**: a separate trivial branch in the nav schema's transform. Skips the `buildGroups` path entirely — produces a flat `<ul>` of items, no top-level container, no groups. If the source contains any `## heading`, emit a `ctx.warn` and proceed by treating headings as plain text (don't crash; degrade gracefully).

**Engine config (`packages/runes/src/config.ts`).** Add the new structural slots:

- `NavGroup` block gains `intro`, `columns`, `footer` structure entries (replacing the older `featured` / `eyebrow` / `footerItems` plan).
- `NavItem` block gains `description` and `badge` structure entries.

Use existing `structure` and `properties` patterns from the SPEC-046 nav config as the template.

**Lumina CSS (`packages/lumina/styles/runes/nav.css`).** Add new sections for `.rf-nav--mega` and `.rf-nav--strip`. Reference treatment:

```css
/* Mega panel */
.rf-nav--mega { /* panel container; absolute positioning relative to trigger */ }
.rf-nav--mega .rf-nav-group { padding: var(--rf-space-lg); }
.rf-nav--mega .rf-nav-group__intro { margin-bottom: var(--rf-space-md); }
.rf-nav--mega .rf-nav-group__intro p { font-size: 0.875em; color: var(--rf-color-muted); }
.rf-nav--mega .rf-nav-group__intro blockquote { /* featured hero treatment: larger, accent border */ }
.rf-nav--mega .rf-nav-group__columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: var(--rf-space-md); }
.rf-nav--mega .rf-nav-group__footer { margin-top: var(--rf-space-md); padding-top: var(--rf-space-md); border-top: 1px solid var(--rf-color-border); }
.rf-nav--mega .rf-nav-item__description { font-size: 0.875em; color: var(--rf-color-muted); }

/* Nested strip inside a mega panel's footer */
.rf-nav--mega .rf-nav-group__footer .rf-nav--strip { /* compact link row */ }

/* Standalone strip */
.rf-nav--strip { display: flex; gap: var(--rf-space-md); padding: var(--rf-space-sm) 0; font-size: 0.875em; }
.rf-nav--strip .rf-nav-item__link { color: var(--rf-color-muted); }

/* Mobile collapse for mega */
@media (max-width: ...) {
  .rf-nav--mega .rf-nav-group__columns { grid-template-columns: 1fr; }
  .rf-nav--strip { flex-wrap: wrap; }
}
```

**Behaviors (`packages/behaviors/src/`).** Find the existing `nav-menubar` behavior. Extend its trigger-detection to recognise the wider panel shape produced by mega. The DOM contract is the same (trigger button + panel container); only CSS layout differs. Should be additive, not invasive.

**Backwards-compat verification.** Build the site before and after; diff the HTML for every existing nav. Should be byte-identical except for any changes from WORK-235's enrichment refactor (which this work depends on).

## Dependencies

- {% ref "WORK-234" /%} — `{% badge %}` rune must exist before mega can recognise and attach it
- {% ref "WORK-235" /%} — description / icon enrichment must be layout-agnostic before mega can consume it without duplicating logic

## References

- {% ref "SPEC-054" /%} — Authoring Surface (position-based slot rule), Engine Config Changes, mobile strategy
- {% ref "SPEC-046" /%} — Existing nav schema patterns (headingsToList, buildGroups)
- `packages/runes/src/tags/nav.ts` — Existing nav schema; extension target
- `packages/runes/src/config.ts` — Engine config; new slots land here
- `packages/lumina/styles/runes/nav.css` — Reference CSS; mega + strip sections added here
- `packages/behaviors/src/` — `nav-menubar` behavior; extension target

{% /work %}
