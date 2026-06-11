{% work id="WORK-400" status="done" priority="low" complexity="simple" source="SPEC-101" tags="sandbox,engine,validation,cover" milestone="v0.21.0" %}

# Build warning for non-eager sandbox in a cover media zone

A cover-backdrop sandbox is inert (SPEC-090 posture demotion) and above the fold, so
the WORK-381 activation affordances contradict it: `visible` is a no-op there and
`click`'s poster + "Run" control is a dead end on a `pointer-events: none` surface.
Eager is the background mode; a non-eager sandbox under cover should warn at build
time ({% ref "SPEC-101" /%} §5).

## Acceptance Criteria
- [x] A sandbox with `activation="visible"` or `"click"` that is a cover media zone's guest emits a build warning naming the conflict (inert backdrop vs. activation affordance) and the fix (drop `activation`, i.e. eager).
- [x] Eager sandboxes under cover, and non-eager sandboxes outside cover, warn nothing — no regression to the WORK-381 paths.
- [x] Unit test covers warn / no-warn cases.

## Approach
SPEC-084-style validation in the engine's cover handling
(`packages/transform/src/engine.ts` §6d already walks the cover media zone for
posture demotion and the WORK-399 auto-fill — check the located `rf-sandbox` guest's
`data-activation` there), following the existing `warnInteractiveGuestInLink`
pattern.

## References
- {% ref "SPEC-101" /%} §5 · {% ref "SPEC-090" /%} (posture) · {% ref "WORK-381" /%} (activation modes)

## Resolution

Completed: 2026-06-11

Branch: `claude/spec-101-hero-cover-prism`

### What was done
- `packages/transform/src/engine.ts` — `warnNonEagerCoverSandbox` (warn-once per container:activation, following the `warnInteractiveGuestInLink` pattern), called from the §6d cover handling when a backdrop sandbox carries `data-activation="visible"|"click"`. Message names the conflict and the fix (drop `activation`).
- `packages/transform/test/cover.test.ts` — warn/no-warn cases: visible warns, click warns, eager under cover silent, non-eager outside cover silent (WORK-381 paths untouched).

{% /work %}
