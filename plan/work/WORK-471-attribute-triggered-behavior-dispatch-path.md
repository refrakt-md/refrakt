{% work id="WORK-471" status="done" priority="high" complexity="moderate" source="SPEC-100" milestone="v0.26.0" tags="carousel,behaviors,dispatch,architecture" %}

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

- [x] `applyBehaviors` mounts the carousel behavior on every `[data-layout="carousel"]` host independent of `data-rune`; adoption needs no per-rune behavior registration.
- [x] A host that also has a `data-rune` behavior (e.g. gallery) does not double-mount; cleanup tears down correctly.
- [x] The new path is covered by a behavior test.

## Dependencies

None hard — behaviors-layer infrastructure; the carousel behavior body this dispatches is lifted by a separate, dependent item.

## References

- Spec: {% ref "SPEC-100" /%} Design notes (the dispatch path is new plumbing, not a selector swap).
- `packages/behaviors/src/index.ts` (`applyBehaviors`, the `data-rune` map, the `data-reveal`/`data-layout-behaviors` scans).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-100-carousel-layout-mode`

### What was done
- `packages/behaviors/src/index.ts` — new attribute-triggered dispatch: a `layoutModeBehaviors` registry keyed by `data-layout` value, a `registerLayoutModeBehaviors()` add-only registrar, `getLayoutModeBehaviorNames()`, and a scan in `initRuneBehaviors` that mounts the registered behavior on every `[data-layout="<value>"]` host independent of `data-rune` (respecting the framework-managed + presentational guards).
- `packages/behaviors/test/layout-mode-dispatch.test.ts` — verifies dispatch on every matching host (any/no rune), exactly once per host (no double-mount), cleanup teardown, add-only semantics, and `getLayoutModeBehaviorNames()`.

### Notes
- The carousel behavior body itself is registered in WORK-472 (which also drops `setupCarousel` from `galleryBehavior`, so gallery's lightbox + the shared carousel are distinct, non-double-mounted concerns). The dispatch is the linchpin that makes adoption config-only.
- Follow-on to confirm in adoption (WORK-474/475): the adapter's behavior-bundle inclusion heuristic (`getBehaviorNames`/`data-rune`) should also account for `[data-layout]` layout-mode behaviors so a carousel-only page ships the bundle.

{% /work %}
