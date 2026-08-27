{% work id="WORK-524" status="pending" priority="medium" complexity="moderate" source="SPEC-124" tags="engine, transform, refactor, dx" milestone="v0.30.1" %}

# Consolidate warn-once diagnostics onto the facet collector

Retire the eight module-level `*_WARNED` sets in `engine.ts`, route every engine diagnostic through the facet `WarningCollector`, and settle the dedupe-scope question the migration deliberately deferred. Also convert the ten test files that currently spy on `console.warn` into assertions on returned warning data.

## Acceptance Criteria

- [ ] `INTERACTIVE_GUEST_WARNED`, `COVER_SANDBOX_ACTIVATION_WARNED`, `FRAME_NO_TARGET_WARNED`, `FRAME_OVERFLOW_CLIP_WARNED`, `SUBSTRATE_NO_MEDIA_WARNED`, `CONTENT_PLACE_WARNED`, `RAW_OVERLAY_WARNED`, `LAYOUT_CYCLE_WARNED` and `REQUIRES_PARENT_WARNED` are gone; each warn site emits a `FacetWarning`
- [ ] Dedupe scope is an explicit, documented decision rather than an accident of module scope
- [ ] If scope changes from process-wide, it is called out as a behaviour change with a changeset; if it stays, the reasoning is recorded
- [ ] Warning messages are unchanged
- [ ] The ten `spyOn(console, 'warn')` test files assert on returned `FacetWarning[]` where the diagnostic comes from a facet, keeping console assertions only where the warn site is not (yet) a facet
- [ ] Warn-once behaviour is directly testable — a collector can be constructed fresh or reset, which the module-level sets made impossible
- [ ] All non-warning assertions in the pre-existing transform tests remain unmodified
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

The scope decision is the substance here, and it is a genuine trade-off. Today's module-scoped sets mean a warning fires once per *process*: in a long-lived dev server an author sees a deprecation or misuse diagnostic once, and never again — not after the edit that failed to fix it, and not on any other page. That is arguably a bug, but "warn once per build" or "once per page" is louder and someone relies on the current quiet.

Recommended: per-build scope, with the collector created by `createTransform` rather than module-level, so a dev-server rebuild re-reports. Confirm before implementing, and take it as a separate change from the mechanical consolidation so a revert is cheap.

This item is deliberately sequenced after {% ref "WORK-522" /%}: frame and substrate own four of the nine sets, so consolidating earlier would mean touching them twice.

## Blocked by
- {% ref "WORK-522" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)

{% /work %}
