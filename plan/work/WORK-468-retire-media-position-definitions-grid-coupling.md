{% work id="WORK-468" status="ready" priority="medium" complexity="moderate" source="SPEC-099" milestone="v0.26.0" tags="feature,layout,marketing,lumina,css" %}

# Retire the `media-position → definitions-grid` coupling

Remove the implicit arrangement-from-media coupling and move the grid/stack decision entirely
onto `[data-layout]`. Per {% ref "SPEC-099" /%} §2.

## Scope

- Remove the `variants: { 'media-position': { top/bottom → definitions-grid } }` block and the
  `definitions-grid` static modifier from the `Feature` config (`plugins/marketing/src/config.ts`).
- Update `packages/lumina/styles/runes/feature.css` so grid-vs-stack keys off
  `[data-layout="grid"]` / `[data-layout="list"]` instead of `.rf-feature--definitions-grid`.
- Because the media-derived *default* ({% ref "WORK-467" /%}) reproduces the old behaviour when
  `layout` is unset, rendered output for existing content is unchanged — but this is a behaviour
  change with visual-regression surface, owned here, not a silent side effect. Spot-check existing
  feature content renders identically.
- Update CSS-coverage: remove the `definitions-grid` selector from `KNOWN_*` and add the
  `[data-layout]` selectors.

## Acceptance Criteria

- [ ] The `media-position` → `definitions-grid` variant and the `definitions-grid` modifier are removed from the `Feature` config and CSS.
- [ ] `feature.css` keys grid-vs-stack arrangement off `[data-layout="grid"]` / `[data-layout="list"]`.
- [ ] Existing feature content (no explicit `layout`) renders identically to before.
- [ ] CSS-coverage tests pass for the new `[data-layout]` selectors; the `definitions-grid` selector is removed from coverage/`KNOWN_*` as appropriate.

## Dependencies

- {% ref "WORK-467" /%} — the `[data-layout]` emission and media-derived default must exist before the coupling is removed.

## References

- Spec: {% ref "SPEC-099" /%} §2. SPEC-091 (the variant being retired).
- `plugins/marketing/src/config.ts` (`Feature`, `variants`/`definitions-grid`), `packages/lumina/styles/runes/feature.css`.

{% /work %}
