{% work id="WORK-503" status="done" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,engine" pr="refrakt-md/refrakt#568" %}

# Thread LocaleContext into the engine label renderers

`buildStructureElement()` and the `MetaField` block renderers currently emit labels as literals and
have **no access to config** — they receive only `(entry, name, modifierValues, icons)`. This is the
previously-unstated prerequisite for localizing Zone 1. Thread the narrow `LocaleContext`
(Decision D6) through, matching the engine's existing convention of passing explicit slices.

## Scope

- Add `LocaleContext` as an argument to `buildStructureElement()` (`packages/transform/src/engine.ts`) and to the `MetaField` / `metaFields` block renderers (SPEC-080 path).
- Plumb the slice from the engine entry points down to those call sites; construct it once per render from the resolved `ThemeConfig` (locale + merged `strings`).
- Do **not** localize any strings yet — this item only makes the context available. Label emission stays literal until {% ref "WORK-504" /%}.
- Keep the engine framework-agnostic and testable: prefer the narrow slice over the full `ThemeConfig`. (A bound `t()` closure is an acceptable equivalent per D6.)

## Acceptance Criteria

- [x] `buildStructureElement()` and the MetaField block renderers receive a `LocaleContext`.
- [x] The context is constructed once per render and threaded, not stored in module-global state.
- [x] No output change (labels still literal); existing transform/engine tests stay green.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Resolution Mechanism (Zone 1), Decision D6.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- `createTransform` builds a single render-scoped `LocaleContext` from `config.locale` + `config.strings`.
- Threaded `LocaleContext` (and the owning `RuneConfig`, needed for WORK-504 key derivation) into `buildStructureElement()` (+ its recursive/repeat calls), `assembleWithBlocks()`, `renderBlock`, `renderBarLayout`, `renderDefListBlock`, `renderBlockValue`, `buildChip`, `buildLinkValue`, `buildIconValue`.

### Notes
- Pure plumbing — labels remain literal; all 600 transform tests still pass, confirming byte-identical output. WORK-504 consumes the threaded context.

{% /work %}
