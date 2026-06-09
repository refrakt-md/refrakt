{% work id="WORK-367" status="ready" priority="medium" complexity="moderate" source="SPEC-087" tags="surfaces, runes, engine, lumina" milestone="v0.20.0" %}

# substrate pattern attribute: engine enum + shared base gradient stylesheet

Add the `substrate` pattern attribute with a fixed engine-level enum and a shared, always-included base stylesheet of token-driven gradient recipes.

## Acceptance Criteria
- [ ] Pattern vocabulary is a fixed engine enum (`dots|grid|lines|cross|checker|none`), not a theme preset registry; `none` is the empty default.
- [ ] `substrate="dots"` plus inline facets `substrate-size|opacity|fill` work standalone; `substrate-fill` selects `inherit|inset`.
- [ ] Engine emits markers only (`data-substrate`, `--substrate-*`); a shared base stylesheet (always included, not per-theme) realises geometry via token-driven gradients, exposing only `--substrate-*` hooks; patterns track `tint`/inset colour.
- [ ] Optional named recipes belong in `refrakt.config.json` (deferred until inline facets prove insufficient).

## Approach
Engine emits markers; CSS draws, like `data-method`. SPEC-087 §1.

## References

- {% ref "SPEC-087" /%}

{% /work %}
