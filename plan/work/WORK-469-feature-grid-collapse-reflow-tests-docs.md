{% work id="WORK-469" status="ready" priority="medium" complexity="moderate" source="SPEC-099" milestone="v0.26.0" tags="feature,layout,collapse,lumina,css,docs,tests" %}

# Feature grid collapse reflow + tests + docs

Reuse the existing `collapse` breakpoint to reflow a `grid` layout to a single column on narrow
viewports (CSS-only), and finish the spec's test + docs surface. Per {% ref "SPEC-099" /%} §3.

## Scope

- **CSS-only reflow**: below the existing `collapse` breakpoint a `grid` layout flattens to a
  single stacked column. No second `layout-collapse` attribute, no new meta, no behavior code.
- **Confirm the shared collapse hook**: the grid media query must key off the same breakpoint as
  the media↔content split. Verify `collapse` is emitted as a CSS-targetable hook (a
  `data-collapse`/container-query handle); if it currently only feeds `buildLayoutMetas` for the
  media split, expose that hook here.
- **Tests**: explicit `layout` overrides the media-derived default; the two axes are independent
  (media beside + `layout="grid"`); unchanged output when `layout` is unset.
- **Docs**: document `layout` and the shared-`collapse` semantics on the `feature` rune page with
  an example; note the `media-position`-derived default.

## Acceptance Criteria

- [ ] Below the existing `collapse` breakpoint, a `grid` layout reflows to a single stacked column (CSS-only); no second collapse attribute is introduced.
- [ ] The grid reflow keys off the same `collapse` hook as the media split (hook exposed if needed).
- [ ] Tests cover: explicit `layout` overriding the media-derived default, independence of the two axes, and unchanged output when `layout` is unset.
- [ ] `feature` rune docs document `layout` and the shared-`collapse` semantics with an example; the `media-position`-derived default is noted.

## Dependencies

- {% ref "WORK-467" /%} — needs the `layout` axis + emission.
- {% ref "WORK-468" /%} — the grid CSS now lives on `[data-layout]`; the reflow extends it.

## References

- Spec: {% ref "SPEC-099" /%} §3 (collapse reuse).
- `packages/runes/src/tags/common.ts` (`collapse`, `buildLayoutMetas`), `packages/lumina/styles/runes/feature.css`.

{% /work %}
