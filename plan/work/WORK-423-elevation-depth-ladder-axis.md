{% work id="WORK-423" status="done" priority="high" complexity="complex" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,elevation,engine,transform" %}

# `elevation` depth-ladder axis

Turn `elevation` into the universal chrome/depth axis from {% ref "SPEC-107" /%}: an ordered
semantic ladder emitted as `data-elevation`, superseding both §8's `surface` enum and today's
shadow-only `none/sm/md/lg` scale. The foundation the rest of the milestone builds on.

## Scope

- Recognise the value set `sunken | flush | flat | raised | floating` (+ optional `overlay`)
  on the universal `elevation` axis; emit `data-elevation` from the engine like the other
  cross-rune classifications.
- Add `defaultElevation` to `RuneConfig` (mirroring `defaultWidth` / `defaultDensity`) so the
  per-rune default is theme config, overridable per instance and via context/region cascade.
- Ship a deprecation alias mapping old → new (`none`→`flat`, `sm`→`raised`, `md`→`raised`,
  `lg`→`floating`) that resolves + warns (the {% ref "SPEC-086" /%} alias pattern). `none`
  maps to `flat`, never `flush`.
- Honor the `elevation` ↔ `frame-shadow` boundary ({% ref "SPEC-107" /%} §1): `elevation` is
  the rune surface's `box-shadow` depth; leave `frame-shadow`'s own `none/sm/md/lg` scale
  untouched (separate axis, not renamed or migrated).

## Acceptance Criteria

- [x] `elevation` accepts `sunken | flush | flat | raised | floating` (+ optional `overlay`) and the engine emits `data-elevation="<value>"`.
- [x] `defaultElevation` is read from theme `RuneConfig` and applied when the author sets no value; per-instance values win.
- [x] Old values (`none/sm/md/lg`) resolve via a deprecation alias with a dev warning; `none`→`flat` (not `flush`); tests cover the mapping.
- [x] `frame-shadow`'s `none/sm/md/lg` scale is left untouched; only the rune-surface `elevation` scale migrates.
- [x] Unit tests cover value emission, the per-rune default, and the alias.

## Dependencies

- Best after {% ref "WORK-410" /%} (the spike sets the cut line). The chrome axis other items target.

## References

- {% ref "SPEC-107" /%} · {% ref "SPEC-094" /%} §8 · `packages/transform/src/engine.ts` · `packages/transform/src/types.ts` (`RuneConfig`).

## Resolution

Completed: 2026-06-15

Branch: `claude/v023-batch1-foundations` (Batch 1).

### What was done
- `RuneConfig.defaultElevation` added (`packages/transform/src/types.ts`), beside `defaultWidth`/`defaultDensity`.
- Engine (`packages/transform/src/engine.ts`): `elevation` now resolves `tag.attributes.elevation ?? config.defaultElevation` and emits `data-elevation` (no BEM class, attribute-styled — unchanged emission path).
- Deprecation aliases via `resolveElevation()` + `ELEVATION_ALIAS`: `none`→`flat` (keeps the surface, NOT `flush`), `sm`→`raised`, `md`→`raised`, `lg`→`floating`, each with a `console.warn` (the SPEC-086 alias pattern). Ladder values pass through.
- `frame-shadow` untouched — the alias only rewrites the rune-surface `elevation` scale.

### Notes
- `elevation.test.ts` rewritten for the ladder: value passthrough, the per-rune default + author override, all four deprecated aliases + the explicit "none ≠ flush" guard. 10 tests green.

{% /work %}
