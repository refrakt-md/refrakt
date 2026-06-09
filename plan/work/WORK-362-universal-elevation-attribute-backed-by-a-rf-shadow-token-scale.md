{% work id="WORK-362" status="ready" priority="high" complexity="moderate" source="SPEC-086" tags="chrome, runes, engine, lumina" milestone="v0.20.0" %}

# Universal elevation attribute backed by a --rf-shadow-* token scale

Add a universal `elevation` attribute backed by a shared `--rf-shadow-*` token scale and migrate bespoke per-rune shadows onto it.

## Acceptance Criteria
- [ ] `elevation` is a universal attribute (`none|sm|md|lg`) on block runes (joins `UNIVERSAL_ATTRIBUTE_NAMES`); engine sets `data-elevation`, CSS maps to `box-shadow: var(--rf-shadow-{level})`.
- [ ] A `--rf-shadow-none|sm|md|lg` token scale exists; `figure`/`codegroup`/`card` reference it instead of bespoke shadow values.
- [ ] `elevation` always renders as `box-shadow` (never `drop-shadow`).

## Approach
`packages/runes/src/attribute-presets.ts` (`UNIVERSAL_ATTRIBUTE_NAMES`); tokens in `packages/lumina/tokens/base.css`. SPEC-086 §1.

## References

- {% ref "SPEC-086" /%}

{% /work %}
