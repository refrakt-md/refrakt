{% work id="WORK-359" status="ready" priority="high" complexity="complex" source="SPEC-091" tags="engine, runes, config" milestone="v0.20.0" %}

# Per-instance variant resolution and merge over base config

Resolve each variant axis per instance and merge matching deltas over the base config before layout assembly, reusing the existing `mergeThemeConfig` machinery.

## Acceptance Criteria
- [ ] Per instance the engine resolves modifier values (with `default` fallback) and merges `variants[axis][value]` over base **before** assembly; no separate condition language and no `defaultVariants`.
- [ ] Merge reuses `mergeThemeConfig` by-key semantics (delta `layout.root` replaces; new wrapper keys add) in `variants` declaration order; the layout assembler is unchanged.
- [ ] Themes can add/override a rune's variants via `mergeThemeConfig`.

## Approach
Resolution is per-instance and happens before layout assembly; the static layout primitive is untouched. `mergeThemeConfig` in `packages/transform/src/merge.ts`. SPEC-091 §2–§3, §6.

## References

- {% ref "SPEC-091" /%}

{% /work %}
