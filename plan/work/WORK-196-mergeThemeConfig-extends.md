{% work id="WORK-196" status="ready" priority="high" complexity="small" tags="tint, merge, config" source="SPEC-053" milestone="v0.14.0" %}

# mergeThemeConfig extends support + remove deprecated RefraktConfig.tints

Extend `mergeThemeConfig` (`packages/transform/src/merge.ts`) so tint definitions with `extends?: string` resolve their base before overlaying overrides. Reject circular `extends` chains with a clear error. The shallow per-name merge stays — `extends` is *the* canonical way to derive a tint variant from another.

## Acceptance Criteria

- [ ] `mergeThemeConfig` walks each tint definition, resolves `extends` recursively, and produces a fully-expanded final tint config
- [ ] Circular `extends` chains rejected at merge time with a clear error: `"Circular tint extends chain: warm → tideline-warm → warm"`
- [ ] References to non-existent tint names rejected with: `"Tint 'tideline-warm' extends unknown tint 'unknown-tint'"`
- [ ] Per-name overrides remain *shallow* (same name in two layers replaces the earlier one entirely) — `extends` is the explicit deep-override path
- [ ] Unit tests cover: single-level extends, multi-level chain, circular detection, unknown base, normal shallow merge still works
- [ ] `RefraktConfig.tints` removed from `packages/types/src/theme.ts` per the SPEC-053 decision to drop the deprecated flat-shape field — any references in adapter or normalisation code surface as build errors and get migrated to `sites.default.tints`

## Approach

Two related changes in one PR since they touch the same files and form a coherent slice of SPEC-053:

1. **Extends resolution.** Before merging tint definitions, run a resolution pass that for each tint with `extends`, recursively expands the chain and applies the tint's own `light` / `dark` / `lockMode` on top. Cycle detection via a visited-set.
2. **Remove `RefraktConfig.tints`.** The flat-shape shorthand is `@deprecated` today; v0.14.0 is the v1.0-cleanup window, drop it. Any code that reads it (likely in `packages/transform/src/config-normalize.ts`) gets updated to require `sites.<name>.tints`.

## Dependencies

- {% ref "WORK-195" /%} — types must reflect the new shape including `extends`.

## References

- {% ref "SPEC-053" /%} — "extends is the canonical override idiom" design principle
- `packages/transform/src/merge.ts` — current `mergeThemeConfig`
- `packages/transform/src/config-normalize.ts` — where `tints` is currently in the deprecated mirror list

{% /work %}
