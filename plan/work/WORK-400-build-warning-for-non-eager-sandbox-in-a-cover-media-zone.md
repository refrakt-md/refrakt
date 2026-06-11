{% work id="WORK-400" status="in-progress" priority="low" complexity="simple" source="SPEC-101" tags="sandbox,engine,validation,cover" milestone="v0.21.0" %}

# Build warning for non-eager sandbox in a cover media zone

A cover-backdrop sandbox is inert (SPEC-090 posture demotion) and above the fold, so
the WORK-381 activation affordances contradict it: `visible` is a no-op there and
`click`'s poster + "Run" control is a dead end on a `pointer-events: none` surface.
Eager is the background mode; a non-eager sandbox under cover should warn at build
time ({% ref "SPEC-101" /%} §5).

## Acceptance Criteria
- [ ] A sandbox with `activation="visible"` or `"click"` that is a cover media zone's guest emits a build warning naming the conflict (inert backdrop vs. activation affordance) and the fix (drop `activation`, i.e. eager).
- [ ] Eager sandboxes under cover, and non-eager sandboxes outside cover, warn nothing — no regression to the WORK-381 paths.
- [ ] Unit test covers warn / no-warn cases.

## Approach
SPEC-084-style validation in the engine's cover handling
(`packages/transform/src/engine.ts` §6d already walks the cover media zone for
posture demotion and the WORK-399 auto-fill — check the located `rf-sandbox` guest's
`data-activation` there), following the existing `warnInteractiveGuestInLink`
pattern.

## References
- {% ref "SPEC-101" /%} §5 · {% ref "SPEC-090" /%} (posture) · {% ref "WORK-381" /%} (activation modes)

{% /work %}
