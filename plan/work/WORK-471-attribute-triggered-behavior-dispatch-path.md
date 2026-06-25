{% work id="WORK-471" status="ready" priority="high" complexity="moderate" source="SPEC-100" milestone="v0.26.0" tags="carousel,behaviors,dispatch,architecture" %}

# Attribute-triggered behavior dispatch path

Add a behavior dispatch path that mounts a behavior by attribute selector
(`[data-layout="carousel"]`) independent of rune identity. This is the linchpin that makes
carousel adoption config-only. Per {% ref "SPEC-100" /%} Design notes.

## Scope

- Today's dispatch (`packages/behaviors/src/index.ts`) is a `data-rune`-keyed map; the only
  non-rune paths are the special-cased `data-reveal` scan and the `data-layout-behaviors` scan.
  Nothing binds on an arbitrary attribute like `[data-layout="carousel"]`.
- Add a **new attribute-triggered dispatch path**: `applyBehaviors` also scans
  `[data-layout="carousel"]` and mounts the shared carousel behavior once per host, regardless of
  the host's `data-rune`. Honour normal cleanup/teardown semantics.
- This item delivers the dispatch mechanism + its registration seam; lifting the carousel behavior
  body out of gallery is a separate, dependent work item. Avoid double-mounting when a rune also has
  a `data-rune` behavior (e.g. gallery).

## Acceptance Criteria

- [ ] `applyBehaviors` mounts the carousel behavior on every `[data-layout="carousel"]` host independent of `data-rune`; adoption needs no per-rune behavior registration.
- [ ] A host that also has a `data-rune` behavior (e.g. gallery) does not double-mount; cleanup tears down correctly.
- [ ] The new path is covered by a behavior test.

## Dependencies

None hard — behaviors-layer infrastructure; the carousel behavior body this dispatches is lifted by a separate, dependent item.

## References

- Spec: {% ref "SPEC-100" /%} Design notes (the dispatch path is new plumbing, not a selector swap).
- `packages/behaviors/src/index.ts` (`applyBehaviors`, the `data-rune` map, the `data-reveal`/`data-layout-behaviors` scans).

{% /work %}
