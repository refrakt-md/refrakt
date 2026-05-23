{% work id="WORK-257" status="ready" priority="medium" complexity="moderate" source="SPEC-060" tags="runes, ui, core, transform" milestone="v0.15.0" %}

# Drawer rune (schema, transform, CSS)

The body-only drawer rune: declares an addressable panel by ID, renders its body as a visible in-flow `<section>` at the authored position. Triggers come from xrefs to the drawer's ID anywhere on the page (WORK-258 wires up the JS enhancement that turns the section into a `<dialog>` and intercepts xref clicks).

This work item covers the identity-transform rune (schema, config, CSS for both no-JS and JS states) and the registry hookup. Behaviors layer is WORK-258.

## Acceptance Criteria

- [ ] `{% drawer id="..." %}` produces the drawer body as a visible in-flow `<section>` at its authored position
- [ ] `id` attribute is required; missing `id` fails content load with a clear error
- [ ] `title` attribute renders as a heading in the drawer header
- [ ] `headingLevel` attribute controls the title's heading level
- [ ] When `headingLevel` is omitted, the title's level is auto-detected from outline position (same convention as `nav`/`hint`)
- [ ] `shortcut` attribute writes `data-shortcut` on the wrapper
- [ ] `side` attribute applies `rf-drawer--side-{value}` modifier and `data-side`
- [ ] `size` attribute applies `rf-drawer--size-{value}` modifier and `data-size`
- [ ] Drawer element gets `id="drawer-{author-id}"` so fragment navigation lands at it
- [ ] Drawer rune registers a page-scoped entity (`type: 'drawer'`, `scope: 'page'`) in the registry with `sourceUrl: "{page-url}#drawer-{id}"`
- [ ] `{% ref "drawer-id" /%}` on the same page resolves (via WORK-253) to `<a href="#drawer-{id}" data-target-type="drawer">…</a>`
- [ ] Multiple xrefs to the same drawer on the same page each resolve to the same anchor target
- [ ] Drawer IDs are page-scoped: two pages each declaring `id="foo"` do not collide in the registry
- [ ] Close button in the drawer header is `hidden` by default (behaviors layer reveals it)
- [ ] Lumina CSS implements both no-JS (in-flow callout) and JS-targeted (`dialog.rf-drawer[open]`) rendering for all four sides and three sizes
- [ ] `refrakt inspect drawer` shows the expected HTML
- [ ] CSS coverage tests pass for `.rf-drawer*` selectors

## Approach

Per the spec:

- `packages/runes/src/tags/drawer.ts` — schema with block content model (no delimiter)
- `packages/runes/src/config.ts` — `Drawer` config entry: modifier-from-meta for `side`/`size`/`shortcut`, structural injection for the header (title + hidden close button)
- Register hook (extension of `corePipelineHooks` or a new drawer-specific hook) scans each page for drawer runes and registers them as page-scoped entities
- `packages/lumina/styles/runes/drawer.css` — covers both no-JS callout state and dialog state

Title-level auto-detection mirrors the existing `nav`/`hint` convention (one level deeper than the nearest preceding heading).

## Dependencies

- {% ref "WORK-253" /%} — `data-target-type` propagation in xref resolver (drawer needs the marker on resolved anchors so the behaviors layer can query for them)
- {% ref "WORK-256" /%} — `EntityRegistration.scope: 'page'` field (for page-scoped drawer IDs)

## References

- {% ref "SPEC-060" /%} — drawer-rune spec (full)
- {% ref "SPEC-066" /%} — expand rune (composes inside drawer bodies)
- `packages/runes/src/config.ts` — engine config home

{% /work %}
