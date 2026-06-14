{% work id="WORK-423" status="ready" priority="high" complexity="complex" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,elevation,engine,transform" %}

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

## Acceptance Criteria

- [ ] `elevation` accepts `sunken | flush | flat | raised | floating` (+ optional `overlay`) and the engine emits `data-elevation="<value>"`.
- [ ] `defaultElevation` is read from theme `RuneConfig` and applied when the author sets no value; per-instance values win.
- [ ] Old values (`none/sm/md/lg`) resolve via a deprecation alias with a dev warning; `none`→`flat` (not `flush`); tests cover the mapping.
- [ ] Unit tests cover value emission, the per-rune default, and the alias.

## Dependencies

- Best after {% ref "WORK-410" /%} (the spike sets the cut line). The chrome axis other items target.

## References

- {% ref "SPEC-107" /%} · {% ref "SPEC-094" /%} §8 · `packages/transform/src/engine.ts` · `packages/transform/src/types.ts` (`RuneConfig`).

{% /work %}
