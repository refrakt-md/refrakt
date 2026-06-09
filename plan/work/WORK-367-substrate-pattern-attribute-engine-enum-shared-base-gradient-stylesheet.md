{% work id="WORK-367" status="done" priority="medium" complexity="moderate" source="SPEC-087" tags="surfaces, runes, engine, lumina" milestone="v0.20.0" %}

# substrate pattern attribute: engine enum + shared base gradient stylesheet

Add the `substrate` pattern attribute with a fixed engine-level enum and a shared, always-included base stylesheet of token-driven gradient recipes.

## Acceptance Criteria
- [x] Pattern vocabulary is a fixed engine enum (`dots|grid|lines|cross|checker|none`), not a theme preset registry; `none` is the empty default.
- [x] `substrate="dots"` plus inline facets `substrate-size|opacity|fill` work standalone; `substrate-fill` selects `inherit|inset`.
- [x] Engine emits markers only (`data-substrate`, `--substrate-*`); a shared base stylesheet (always included, not per-theme) realises geometry via token-driven gradients, exposing only `--substrate-*` hooks; patterns track `tint`/inset colour.
- [x] Optional named recipes belong in `refrakt.config.json` (deferred until inline facets prove insufficient).

## Approach
Engine emits markers; CSS draws, like `data-method`. SPEC-087 §1.

## References

- {% ref "SPEC-087" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-087-surface-fills`

### What was done
- Universal `substrate` (fixed engine enum `dots|grid|lines|cross|checker|none`) + `substrate-size`/`opacity`/`fill` facets (`lib/index.ts`, `attribute-presets.ts`), injected as metas via `injectSubstrateMetas`.
- Engine `resolveSubstrate` emits markers only — `data-substrate` (+ `data-substrate-fill`) and `--substrate-cell`/`--substrate-opacity` custom props; CSS draws.
- Shared, always-included `dimensions/substrate.css` with token-driven gradient recipes (dots/grid/lines/cross/checker); `--substrate-ink` resolves from `--rf-color-border` so patterns track tint; `substrate-fill="inset"` paints over the inset fill.

### Notes
- Named recipes (`refrakt.config.json`) deferred per spec. Tests in `packages/transform/test/substrate.test.ts`.

{% /work %}
