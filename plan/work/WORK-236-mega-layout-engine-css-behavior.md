{% work id="WORK-236" status="ready" priority="high" complexity="significant" tags="nav, mega-menu, engine, lumina, behaviors" source="SPEC-054" milestone="v0.14.3" %}

# Mega layout: engine + Lumina CSS + behavior

Implement the `layout="mega"` value end-to-end: extend the nav schema's imperative `headingsToList` / `buildGroups` path to detect the new structural patterns (eyebrow paragraph under headings, leading blockquote as featured hero, `---` splits into columns, trailing items as footer band, inline `{% badge %}` attached to items), add the engine config slots, ship Lumina CSS for the layout including mobile collapse, and extend the existing `nav-menubar` behavior to handle mega trigger open/close.

The largest work item in the milestone. Touches the schema, the engine config, Lumina CSS, and the behaviors package.

## Acceptance Criteria

- [ ] `nav` rune `layout` attribute accepts `mega` in addition to existing values (`vertical`, `menubar`, `columns`, `cards`)
- [ ] Identity transform emits `.rf-nav--mega` modifier and `data-layout="mega"`
- [ ] Trailing items (after the last `##` group) render in a `data-name="footer"` container with class `.rf-nav__footer` — mirrors the existing `__top-level` mechanism
- [ ] A horizontal rule (`---`) inside a group's item list splits the items into `.rf-nav-group__column` segments inside a `.rf-nav-group__columns` container
- [ ] A paragraph immediately following a list item in source becomes that item's `.rf-nav-item__description`
- [ ] A paragraph immediately following a group heading becomes that group's `.rf-nav-group__eyebrow`
- [ ] A blockquote at the top of a group becomes the group's `.rf-nav-group__featured` entry with `data-featured="true"` on the resulting item
- [ ] When `auto=true` is set, items without an explicit description inherit one from frontmatter (via WORK-235's enrichment); icon resolution behaves the same
- [ ] When a `{% badge %}` rune appears inside a nav item's link text or trailing content, the engine recognises it and attaches it as a `badge` property on the item, rendered adjacent to the title
- [ ] All existing layouts (`vertical`, `menubar`, `columns`, `cards`) continue to render identically — no behavior change for callers not on the mega layout
- [ ] Lumina ships CSS for `.rf-nav--mega` covering: column grid (clamped to max 3 cols), eyebrow typography (smaller, muted, possibly uppercase), featured item treatment (larger, distinguished container), footer band styled like the existing top-level band but at the bottom of the panel
- [ ] `.rf-nav-item__description` styled (smaller text, muted color, line-height tightened)
- [ ] Mobile fallback CSS: at narrow viewports, mega behaves like a vertical accordion — each top-level trigger toggles its panel open, columns stack to a single column, footer band stays at the bottom of each panel
- [ ] `@refrakt-md/behaviors` `nav-menubar` behavior extended to handle mega trigger open/close — no new behavior module, just the existing one made aware of mega panels
- [ ] CSS coverage tests updated for all new selectors: `.rf-nav--mega`, `.rf-nav__footer`, `.rf-nav-group__columns`, `.rf-nav-group__column`, `.rf-nav-group__eyebrow`, `.rf-nav-group__featured`, `.rf-nav-item__description`
- [ ] `npx refrakt inspect nav --layout=mega` produces expected HTML output with all new slots populated for a representative input
- [ ] Unit tests cover the schema's detection logic: eyebrow paragraph, featured blockquote, column splits, footer items, badge attachment
- [ ] Multiple-trigger-to-multiple-group routing: each top-level trigger matches a `##` group by case-insensitive slug (per spec recommendation); a typo'd or unmatched trigger produces a clear build error pointing at the source file
- [ ] Single-trigger mega is allowed (one top-level trigger, one group, one wide panel)

## Approach

**Schema work first.** Extend `packages/runes/src/tags/nav.ts` — specifically `headingsToList` and `buildGroups` (or whatever the current internal helpers are called). Add detection passes:

1. **Eyebrow detection**: after a group heading, if the next sibling is a paragraph (before any list), consume it as the group's `eyebrow` property.
2. **Featured detection**: if a group's first item-eligible content is a blockquote, consume it as `featured`. Extract the link from the blockquote and the description text.
3. **Column split detection**: when collecting items under a group, treat `hr` nodes as column delimiters. The group's items become a 2D array (columns × items) instead of 1D.
4. **Footer band detection**: items after the last `##` group collect into a `footerItems` property on the `Nav` block instead of being treated as top-level items.
5. **Badge attachment**: when walking link content, recognise inline `{% badge %}` runes and attach them to the item as a property.
6. **Trigger-to-group routing**: associate top-level items with groups by slug match. Either pre-compute the mapping at schema time, or emit metadata the engine can consume.

**Engine config (`packages/runes/src/config.ts`).** Add the new structural slots:

- `Nav` block gains `footerItems` structure entry (mirror of top-level band; renders into `data-name="footer"`).
- `NavGroup` block gains `eyebrow`, `featured`, `columns` structure entries.
- `NavItem` block gains `description` and `badge` structure entries.

Use existing `structure` and `properties` patterns from the SPEC-046 nav config as the template.

**Lumina CSS (`packages/lumina/styles/runes/nav.css`).** Add a new section for `.rf-nav--mega`. Reference treatment:

```css
/* Desktop mega panel */
.rf-nav--mega { /* panel container; absolute positioning relative to trigger */ }
.rf-nav--mega .rf-nav-group { padding: var(--rf-space-lg); }
.rf-nav--mega .rf-nav-group__eyebrow { font-size: 0.875em; color: var(--rf-color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.rf-nav--mega .rf-nav-group__columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: var(--rf-space-md); max-width: 3-col-clamp; }
.rf-nav--mega .rf-nav-group__featured { /* larger card-like treatment, accent border */ }
.rf-nav--mega .rf-nav-item__description { font-size: 0.875em; color: var(--rf-color-muted); }
.rf-nav--mega .rf-nav__footer { border-top: 1px solid var(--rf-color-border); padding: var(--rf-space-md) var(--rf-space-lg); }

/* Mobile collapse */
@media (max-width: ...) {
  .rf-nav--mega .rf-nav-group__columns { grid-template-columns: 1fr; }
  /* additional stacked-accordion rules */
}
```

**Behaviors (`packages/behaviors/src/`).** Find the existing `nav-menubar` behavior — likely handles desktop dropdown toggling and mobile hamburger. Extend its trigger-detection to recognise the wider panel shape produced by mega. The DOM contract is the same (trigger button + panel container); only CSS layout differs. Should be additive, not invasive.

**Backwards-compat verification.** Build the site before and after; diff the HTML for every existing nav. Should be byte-identical except for any changes from WORK-235's enrichment refactor (which this work depends on).

## Dependencies

- {% ref "WORK-234" /%} — `{% badge %}` rune must exist before mega can recognise and attach it
- {% ref "WORK-235" /%} — description / icon enrichment must be layout-agnostic before mega can consume it without duplicating logic

## References

- {% ref "SPEC-054" /%} — Engine Config Changes section, authoring surface examples, mobile strategy
- {% ref "SPEC-046" /%} — Existing nav schema patterns (headingsToList, buildGroups)
- `packages/runes/src/tags/nav.ts` — Existing nav schema; extension target
- `packages/runes/src/config.ts` — Engine config; new slots land here
- `packages/lumina/styles/runes/nav.css` — Reference CSS; mega section added here
- `packages/behaviors/src/` — `nav-menubar` behavior; extension target

{% /work %}
