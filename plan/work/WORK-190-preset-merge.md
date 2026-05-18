{% work id="WORK-190" status="ready" priority="high" complexity="medium" tags="presets, config, merge" source="SPEC-048" milestone="v0.14.0" %}

# Preset loading and merge order

Implement the `theme.presets: string[]` field that accepts module identifiers (e.g. `"@refrakt-md/lumina/presets/tideline"`), loads each as a `ThemeTokensConfig`, and merges them in declared order — last write wins per token. Establishes the mechanism that everything downstream (tideline, niwaki, future community presets) plugs into.

## Acceptance Criteria

- [ ] `theme.presets: string[]` accepted in `refrakt.config.json` and validated at config load
- [ ] Each preset string is resolved as a module identifier; resolution failures surface clear errors ("preset 'X' not found — check the package is installed and the export path is correct")
- [ ] Each loaded preset is validated against `ThemeTokensConfig` shape; invalid presets rejected with clear errors
- [ ] Presets merge in declared order with last-write-wins per token leaf (not per top-level field — deep-merge across nested namespaces like `color.surface.base`)
- [ ] Mode overlays inside presets merge independently from base — a preset can contribute to base *and* to any mode
- [ ] Final merge order: theme base → presets in order → site `theme.tokens` → site `theme.modes`
- [ ] Composition demonstrably works: a test config with `presets: ["A", "B"]` where A sets `color.primary = red` and B sets `color.primary = blue` produces blue
- [ ] Unit tests cover: single preset, multiple presets in order, preset + site override, validation failures

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
