{% work id="WORK-362" status="done" priority="high" complexity="moderate" source="SPEC-086" tags="chrome, runes, engine, lumina" milestone="v0.20.0" %}

# Universal elevation attribute backed by a --rf-shadow-* token scale

Add a universal `elevation` attribute backed by a shared `--rf-shadow-*` token scale and migrate bespoke per-rune shadows onto it.

## Acceptance Criteria
- [x] `elevation` is a universal attribute (`none|sm|md|lg`) on block runes (joins `UNIVERSAL_ATTRIBUTE_NAMES`); engine sets `data-elevation`, CSS maps to `box-shadow: var(--rf-shadow-{level})`.
- [x] A `--rf-shadow-none|sm|md|lg` token scale exists; `figure`/`codegroup`/`card` reference it instead of bespoke shadow values.
- [x] `elevation` always renders as `box-shadow` (never `drop-shadow`).

## Approach
`packages/runes/src/attribute-presets.ts` (`UNIVERSAL_ATTRIBUTE_NAMES`); tokens in `packages/lumina/tokens/base.css`. SPEC-086 §1.

## References

- {% ref "SPEC-086" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-086-surface-chrome`

### What was done
- Added `elevation` (none|sm|md|lg) to the universal attribute set (`packages/runes/src/lib/index.ts` schema + root forwarding; `attribute-presets.ts` name set).
- Engine emits `data-elevation` on the root (no BEM class) — `packages/transform/src/engine.ts`.
- Added `--rf-shadow-none` to the token scale (base.css) and the SPEC-053 token contract + luminaTokens; sm/md/lg already existed.
- `packages/lumina/styles/base/attributes.css` maps `[data-rune][data-elevation]` → `box-shadow: var(--rf-shadow-*)`. codegroup already references the scale; figure/card have no bespoke shadow.

### Notes
- `elevation="none"` is emitted so an author can explicitly flatten a default shadow.
- Tests: `packages/transform/test/elevation.test.ts`; updated the reference universal-attrs assertion.

{% /work %}
