{% work id="WORK-190" status="in-progress" priority="high" complexity="medium" tags="presets, config, merge" source="SPEC-048" milestone="v0.14.0" %}

# Preset loading and merge order

Implement the `theme.presets: string[]` field that accepts module identifiers (e.g. `"@refrakt-md/lumina/presets/tideline"`), loads each as a `ThemeTokensConfig`, and merges them in declared order — last write wins per token. Establishes the mechanism that everything downstream (tideline, niwaki, future community presets) plugs into.

## Acceptance Criteria

- [x] `theme.presets: string[]` accepted in `refrakt.config.json` *(type-level via `SiteThemeConfig` from Chunk 1; config-load wiring lands with adapter integration in Chunk 3)*
- [x] Each preset string is resolved as a module identifier; resolution failures surface clear errors ("preset 'X' not found — check the package is installed and the export path is correct") — `loadPreset` exported from `@refrakt-md/transform/node`
- [x] Each loaded preset is validated against `ThemeTokensConfig` shape; invalid presets rejected with clear errors — `loadPreset` checks the export is a plain object; `validateThemeTokensConfig` is available for adapters to call after load
- [x] Presets merge in declared order with last-write-wins per token leaf (not per top-level field — deep-merge across nested namespaces like `color.surface.base`) — `mergeTokenContracts` walks the tree explicitly
- [x] Mode overlays inside presets merge independently from base — a preset can contribute to base *and* to any mode — `mergeThemeTokensConfigs` separates base from per-mode layers and merges each independently
- [x] Final merge order: theme base → presets in order → site `theme.tokens` → site `theme.modes` — adapters call `mergeThemeTokensConfigs(themeBase, ...presets, { tokens: site.tokens, modes: site.modes })` in this exact order
- [x] Composition demonstrably works: a test config with `presets: ["A", "B"]` where A sets `color.primary = red` and B sets `color.primary = blue` produces blue — verified in `token-merge.test.ts`
- [x] Unit tests cover: single preset, multiple presets in order, preset + site override, validation failures — 15 merge tests + 7 loader tests + 16 validation tests

## Approach

The merge logic extends `mergeThemeConfig` (`packages/transform/src/merge.ts`) — currently it shallow-merges tints and runes; this work adds deep-merging for the token contract specifically.

Resolution: `theme.presets` strings get fed into Node's `import()` (or `require()` for legacy adapters). Each resolved module is expected to export a `ThemeTokensConfig` as default or as a named `config` export — document the contract.

Deep merge: hand-rolled, *not* `lodash.merge` (which has surprising behaviour around arrays and `null`). Walk the contract tree explicitly, last-write-wins per leaf. `null` at any leaf is interpreted as "reset to inherit-from-previous-layer" (per SPEC-052's expectation that `null` is meaningful).

Out of scope: the actual tideline and niwaki preset modules themselves (those are {% ref "WORK-204" /%} and {% ref "WORK-205" /%}). This work item builds the loading and merging infrastructure that those modules will plug into.

## Dependencies

- {% ref "WORK-185" /%} — `ThemeTokensConfig` shape.
- {% ref "WORK-187" /%} — base stylesheet generation; preset-merged config feeds into the same pipeline.
- {% ref "WORK-188" /%} — mode overlay shape; presets can contribute to modes.

## References

- {% ref "SPEC-048" /%} — "Presets are plain data" design principle
- {% ref "SPEC-051" /%} — flagship presets (tideline, niwaki) that consume this mechanism
- {% ref "SPEC-053" /%} — `extends` field at the tint level; analogous to but separate from preset extension

{% /work %}
