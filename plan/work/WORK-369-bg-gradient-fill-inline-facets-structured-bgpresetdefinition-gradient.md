{% work id="WORK-369" status="ready" priority="medium" complexity="moderate" source="SPEC-088" tags="surfaces, bg, runes, engine, lumina" milestone="v0.20.0" %}

# bg gradient fill: inline facets + structured BgPresetDefinition.gradient

Add a token-driven `bg` gradient fill via inline facets and a structured `BgPresetDefinition.gradient` preset field.

## Acceptance Criteria
- [ ] Inline facets `bg-gradient` (bounded direction set), `bg-from|to|via` (semantic token refs → `var(--rf-color-*)`), `bg-gradient-type` (`linear|radial|conic`); colours stay token-owned.
- [ ] Named gradient presets live on `BgPresetDefinition.gradient` (type + direction + token-name stops), not the raw `style` map; `bg="name"` applies; `extends` works.
- [ ] A fill gradient occupies the base bg layer (reuses `--bg-image`), composing beneath scrim/substrate and with the tint/inset fill.

## Approach
`BgPresetDefinition` in `types.ts`; `bg.css` `--bg-image`. SPEC-088 §1.

## References

- {% ref "SPEC-088" /%}

{% /work %}
