{% work id="WORK-369" status="done" priority="medium" complexity="moderate" source="SPEC-088" tags="surfaces, bg, runes, engine, lumina" milestone="v0.20.0" %}

# bg gradient fill: inline facets + structured BgPresetDefinition.gradient

Add a token-driven `bg` gradient fill via inline facets and a structured `BgPresetDefinition.gradient` preset field.

## Acceptance Criteria
- [x] Inline facets `bg-gradient` (bounded direction set), `bg-from|to|via` (semantic token refs → `var(--rf-color-*)`), `bg-gradient-type` (`linear|radial|conic`); colours stay token-owned.
- [x] Named gradient presets live on `BgPresetDefinition.gradient` (type + direction + token-name stops), not the raw `style` map; `bg="name"` applies; `extends` works.
- [x] A fill gradient occupies the base bg layer (reuses `--bg-image`), composing beneath scrim/substrate and with the tint/inset fill.

## Approach
`BgPresetDefinition` in `types.ts`; `bg.css` `--bg-image`. SPEC-088 §1.

## References

- {% ref "SPEC-088" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-088-bg-gradients-scrim`

### What was done
- `BgPresetDefinition.gradient { type?, direction?, stops }` (stops are token names → `var(--rf-color-*)`).
- Universal facets `bg-gradient`/`bg-from`/`bg-to`/`bg-via`/`bg-gradient-type` (+ on the `{% bg %}` directive), injected as metas; engine `buildBgGradient` resolves a bounded direction set + token stops into `--bg-image`. Inline facets override a preset's facets; stops fall back to the preset. A gradient-only bg raises the layer with no image; `extends` works.

### Notes
- Tests in `packages/transform/test/bg-gradient.test.ts`.

{% /work %}
