{% work id="WORK-196" status="done" priority="high" complexity="simple" tags="tint, merge, config" source="SPEC-053" milestone="v0.14.0" %}

# mergeThemeConfig extends support + remove deprecated RefraktConfig.tints

Extend `mergeThemeConfig` (`packages/transform/src/merge.ts`) so tint definitions with `extends?: string` resolve their base before overlaying overrides. Reject circular `extends` chains with a clear error. The shallow per-name merge stays — `extends` is *the* canonical way to derive a tint variant from another.

## Acceptance Criteria

- [x] `mergeThemeConfig` walks each tint definition, resolves `extends` recursively via `resolveTintExtends`, and produces a fully-expanded final tint config
- [x] Circular `extends` chains rejected at merge time with a chain trace: `"Circular tint extends chain: a → b → c → a"`
- [x] References to non-existent tint names rejected with: `"Tint 'X' extends unknown tint"`
- [x] Per-name overrides remain *shallow* (same name in two layers replaces the earlier one entirely) — `extends` is the explicit deep-override path
- [x] Unit tests cover: single-level extends, multi-level chain, circular detection (including direct self-reference), unknown base, lockMode inheritance and override, diamond chains (no infinite recursion) — 10 new tests in `tint-extends.test.ts`
- [x] `RefraktConfig.tints` removed from `packages/types/src/theme.ts`; `config-normalize` no longer mirrors `tints` between flat and per-site shapes

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
