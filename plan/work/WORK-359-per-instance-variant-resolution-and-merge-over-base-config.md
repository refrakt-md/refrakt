{% work id="WORK-359" status="done" priority="high" complexity="complex" source="SPEC-091" tags="engine, runes, config" milestone="v0.20.0" %}

# Per-instance variant resolution and merge over base config

Resolve each variant axis per instance and merge matching deltas over the base config before layout assembly, reusing the existing `mergeThemeConfig` machinery.

## Acceptance Criteria
- [x] Per instance the engine resolves modifier values (with `default` fallback) and merges `variants[axis][value]` over base **before** assembly; no separate condition language and no `defaultVariants`.
- [x] Merge reuses `mergeThemeConfig` by-key semantics (delta `layout.root` replaces; new wrapper keys add) in `variants` declaration order; the layout assembler is unchanged.
- [x] Themes can add/override a rune's variants via `mergeThemeConfig`.

## Approach
Resolution is per-instance and happens before layout assembly; the static layout primitive is untouched. `mergeThemeConfig` in `packages/transform/src/merge.ts`. SPEC-091 §2–§3, §6.

## References

- {% ref "SPEC-091" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-091-engine-variants`

### What was done
- `packages/transform/src/engine.ts`: `resolveVariantConfig` resolves each axis's modifier value (with `default`) and merges matching deltas over base — in declaration order — before layout assembly.
- `packages/transform/src/merge.ts`: exported `mergeRuneConfig` (reused by the engine) and made it merge `variants` by axis→value so themes can extend them.

### Notes
- No separate condition language, no `defaultVariants`; the layout assembler is unchanged.

{% /work %}
