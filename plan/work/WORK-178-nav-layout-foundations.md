{% work id="WORK-178" status="done" priority="high" complexity="moderate" tags="nav, layout, theme, runes" source="SPEC-046" milestone="v0.13.0" %}

# Nav `layout` foundations — header menubar and footer columns

Add a `layout` attribute to the `nav` rune with values `vertical` (default, today's behaviour — unchanged), `menubar` (horizontal, for the header), and `columns` (column grid, for the footer). Same content model in all three; theme decides the rendering. This is the foundation slice — interactive dropdown / hamburger behaviour ({% ref "WORK-181" /%}), the cards layout ({% ref "WORK-180" /%}), and the collapsible sidebar ({% ref "WORK-179" /%}) all build on the engine plumbing landed here.

## Acceptance Criteria

- [x] `nav` rune accepts a `layout` attribute with values `vertical` (default), `menubar`, `columns` (and `cards`, reserved for {% ref "WORK-180" /%})
- [x] Engine config in `packages/runes/src/config.ts` adds a `layout` modifier on the `Nav` entry: `{ source: 'attr', default: 'vertical' }`
- [x] Identity transform emits `.rf-nav--{layout}` modifier class and `data-layout="..."` attribute on the wrapping `<nav>`
- [x] Top-level items (before the first `##`) continue to render inside the existing `data-name="top-level"` container regardless of layout value
- [x] `{% nav %}` with no `layout` attribute renders byte-identical output to today — no behaviour change for existing callers
- [x] Lumina ships static CSS for `menubar` (horizontal bar, groups laid out as inline trigger + adjacent submenu, no interactive open/close yet) and `columns` (CSS Grid columns layout, group headings as column titles, stacked single-column on mobile)
- [x] `npx refrakt inspect nav --layout=menubar` and `--layout=columns` show the expected HTML output
- [x] CSS coverage tests updated for the new selectors (`.rf-nav--menubar`, `.rf-nav--columns` plus their elements)

Reference doc page (`site/content/runes/nav.md`) updates and site-wide adoption are owned by {% ref "WORK-183" /%} and {% ref "WORK-184" /%} respectively.

## Approach

Layout is implemented as a standard `modifier` entry on the existing `Nav` config — no schema changes, no new rune, no new content model. The engine already supports modifier classes and `data-*` attributes from modifier values; this is purely additive.

The menubar layout in this work item is **non-interactive on desktop**: groups render with their items adjacent / inline. The dropdown open-on-hover-or-click behaviour and mobile hamburger toggle are layered on in {% ref "WORK-181" /%}. That separation lets this PR ship without committing to a particular interaction model and lets the behaviours PR focus purely on JS.

The columns layout has no interactive component — pure CSS Grid. Ships complete in this item.

Order of changes:

1. Add the `layout` modifier to `Nav` in `packages/runes/src/config.ts`; update the `Nav` schema attribute list in `packages/runes/src/tags/nav.ts` to declare `layout`.
2. Write Lumina CSS files (`packages/lumina/styles/runes/nav.css` — add the layout variants) plus mobile breakpoints.
3. Update `site/content/_layout.md` header and footer regions.
4. Update authoring docs.
5. CSS coverage tests for the new selectors.

## Dependencies

None. Foundation work — other v0.13.0 nav items depend on this landing first.

## References

- {% ref "SPEC-046" /%} — full design (authoring surface, engine config table, mobile strategy).
- `packages/runes/src/tags/nav.ts` — existing schema, slug resolution, top-level container.
- `packages/runes/src/config.ts` — `Nav` and `NavGroup` config entries (lines 383-427).
- `packages/lumina/styles/runes/nav.css` — current sidebar CSS, to be extended.
- `site/content/_layout.md` — header / footer regions currently using plain markdown links.

## Resolution

Completed: 2026-05-18

Branch: `claude/v0.13-pagination-nav-bvuEP`

### What was done
- `packages/runes/src/tags/nav.ts` — added `layout` attribute (vertical | menubar | columns | cards) to the schema; forwards the value to the rendered `<nav>` tag's attributes so the engine modifier picks it up.
- `packages/runes/src/config.ts` — added `modifiers: { layout: { source: 'attribute' } }` to the `Nav` config. No default at the engine level so existing `{% nav %}` markup produces byte-identical output.
- `packages/transform/src/engine.ts` — engine now strips attribute-source modifier names from the output tag attributes (they're expressed via `data-*` + BEM class). Prevents redundant `layout="menubar"` alongside `data-layout="menubar"`.
- `packages/cli/src/lib/fixtures.ts` — added a `nav` fixture for `refrakt inspect`.
- `packages/lumina/styles/runes/nav.css` — added CSS for `.rf-nav--menubar` (horizontal bar, dropdown stub via `data-open`, mobile hamburger via `data-name="trigger"`) and `.rf-nav--columns` (responsive CSS Grid).
- `packages/lumina/contracts/structures.json` — added the `layout` modifier entry to the `Nav` contract.

### Notes
- Spec used `source: 'attr'`; the existing engine type is `'attribute'` so config uses the canonical name.
- No engine-level default for `layout` — keeps existing nav output byte-identical. Default `vertical` is documented but implicit.
- Dropdown open/close (menubar) and hamburger toggle remain JS-driven; WORK-181 will ship the `nav-menubar` behavior. CSS already targets the `[data-open="true"]` state the behavior will set.
- Cards layout reserved for WORK-180; collapsible for WORK-179.

{% /work %}
