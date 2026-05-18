{% work id="WORK-197" status="done" priority="high" complexity="small" tags="tint, css, engine, breaking-change" source="SPEC-053" milestone="v0.14.0" %}

# Engine + tint.css rename to new --tint-* property names

Rename the `--tint-*` custom properties emitted by `packages/transform/src/engine.ts` and consumed by `packages/lumina/styles/runes/tint.css`. Five renames (`background → bg`, `primary → text`, `secondary → muted`, `accent → primary`, plus dark-variant counterparts); `surface` and `border` unchanged. The CSS cascade structure (`@property` registrations, `--cs-*` intermediaries, same-element-vs-ancestor selectors) is preserved — only the property names move.

## Acceptance Criteria

- [x] `TINT_TOKENS` array in `packages/transform/src/engine.ts` updated to `['bg', 'surface', 'text', 'muted', 'primary', 'border']`
- [x] Engine emits `--tint-bg`, `--tint-text`, `--tint-muted`, `--tint-primary` (and `--tint-dark-*` counterparts). Also updated to read `def.lockMode` instead of `def.mode`.
- [x] `packages/lumina/styles/runes/tint.css` sections 2–4 updated to map the new property names → `--rf-color-*` tokens. The `--rf-color-primary` mapping now correctly references `--tint-primary` (which is the *interactive* primary, matching the contract) rather than the old `--tint-accent`.
- [x] `@property` registrations at the top of `tint.css` unchanged (they target `--rf-color-*`)
- [x] `--cs-*` intermediaries unchanged
- [x] CSS coverage tests pass — no test references the old `--tint-*` names by name
- [x] Visual sanity: full test suite (2429 tests) passes; build is clean
- [x] No grep hits for old property names: `--tint-background`, `--tint-secondary`, `--tint-accent` anywhere in the codebase

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
