{% work id="WORK-197" status="ready" priority="high" complexity="small" tags="tint, css, engine, breaking-change" source="SPEC-053" milestone="v0.14.0" %}

# Engine + tint.css rename to new --tint-* property names

Rename the `--tint-*` custom properties emitted by `packages/transform/src/engine.ts` and consumed by `packages/lumina/styles/runes/tint.css`. Five renames (`background → bg`, `primary → text`, `secondary → muted`, `accent → primary`, plus dark-variant counterparts); `surface` and `border` unchanged. The CSS cascade structure (`@property` registrations, `--cs-*` intermediaries, same-element-vs-ancestor selectors) is preserved — only the property names move.

## Acceptance Criteria

- [ ] `TINT_TOKENS` array (or equivalent) in `packages/transform/src/engine.ts` updated to the new vocabulary
- [ ] Engine emits `--tint-bg`, `--tint-text`, `--tint-muted`, `--tint-primary` (and `--tint-dark-*` counterparts) instead of `--tint-background`, `--tint-primary` (old: text), `--tint-secondary`, `--tint-accent`
- [ ] `packages/lumina/styles/runes/tint.css` sections 2–4 updated to map the new property names → `--rf-color-*` tokens
- [ ] `@property` registrations at the top of `tint.css` unchanged (those target `--rf-color-*` not `--tint-*`)
- [ ] `--cs-*` intermediaries unchanged
- [ ] CSS coverage tests in `packages/lumina/test/css-coverage.test.ts` updated for any selectors that referenced the old `--tint-*` names by name
- [ ] Visual regression: at least one tinted rune in a real layout (a `{% callout tint="warm" %}` or similar) renders identically before and after, in both light and dark modes
- [ ] No grep hits for the old property names anywhere in the codebase

## Approach

The CSS is well-designed; this is a targeted rename, not a refactor. Find-and-replace inside `tint.css` and the engine emit code, then verify the cascade still works against a baseline.

The dark-variant property names follow the same rename pattern: `--tint-dark-background → --tint-dark-bg`, `--tint-dark-primary → --tint-dark-text`, etc. The same-element compound selector logic in section 4 of `tint.css` rewires automatically once the property names are updated consistently.

## Dependencies

- {% ref "WORK-195" /%} — types updated.
- {% ref "WORK-196" /%} — merge logic ready so the engine reads the new shape.

## References

- {% ref "SPEC-053" /%} — "the CSS bridge implementation is intentionally not changed; only property names move"
- `packages/transform/src/engine.ts` — tint-processing logic
- `packages/lumina/styles/runes/tint.css` — bridge CSS

{% /work %}
