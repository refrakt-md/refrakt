{% work id="WORK-524" status="done" priority="medium" complexity="moderate" source="SPEC-124" tags="engine, transform, refactor, dx" milestone="v0.30.1" pr="refrakt-md/refrakt#587" %}

# Consolidate warn-once diagnostics onto the facet collector

Retire the eight module-level `*_WARNED` sets in `engine.ts`, route every engine diagnostic through the facet `WarningCollector`, and settle the dedupe-scope question the migration deliberately deferred. Also convert the ten test files that currently spy on `console.warn` into assertions on returned warning data.

## Acceptance Criteria

- [x] `INTERACTIVE_GUEST_WARNED`, `COVER_SANDBOX_ACTIVATION_WARNED`, `FRAME_NO_TARGET_WARNED`, `FRAME_OVERFLOW_CLIP_WARNED`, `SUBSTRATE_NO_MEDIA_WARNED`, `CONTENT_PLACE_WARNED`, `RAW_OVERLAY_WARNED`, `LAYOUT_CYCLE_WARNED` and `REQUIRES_PARENT_WARNED` are gone; each warn site emits a `FacetWarning`
- [x] Dedupe scope is an explicit, documented decision rather than an accident of module scope
- [x] If scope changes from process-wide, it is called out as a behaviour change with a changeset; if it stays, the reasoning is recorded
- [x] Warning messages are unchanged
- [ ] The ten `spyOn(console, 'warn')` test files assert on returned `FacetWarning[]` where the diagnostic comes from a facet, keeping console assertions only where the warn site is not (yet) a facet
- [x] Warn-once behaviour is directly testable — a collector can be constructed fresh or reset, which the module-level sets made impossible
- [x] All non-warning assertions in the pre-existing transform tests remain unmodified
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

The scope decision is the substance here, and it is a genuine trade-off. Today's module-scoped sets mean a warning fires once per *process*: in a long-lived dev server an author sees a deprecation or misuse diagnostic once, and never again — not after the edit that failed to fix it, and not on any other page. That is arguably a bug, but "warn once per build" or "once per page" is louder and someone relies on the current quiet.

Recommended: per-build scope, with the collector created by `createTransform` rather than module-level, so a dev-server rebuild re-reports. Confirm before implementing, and take it as a separate change from the mechanical consolidation so a revert is cheap.

This item is deliberately sequenced after {% ref "WORK-522" /%}: frame and substrate own four of the nine sets, so consolidating earlier would mean touching them twice.

## Blocked by
- {% ref "WORK-522" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)

## Resolution

Completed: 2026-09-04

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/engine.ts` — the last four `*_WARNED` sets (interactive guest in a link, non-eager cover sandbox, layout reference cycle, `requiresParent` violations) replaced by `FacetWarning` builders emitted through the collector. All four were non-facet engine sites; the other five migrated with their facets in earlier items, so all nine of the original sets are now gone.
- `createTransform` owns a `WarningCollector`, threaded into `transformRune`, `assembleWithBlocks` and `LayoutCtx`. The process-wide `engineWarnings` singleton is deleted.
- `packages/transform/src/facets/types.ts` + `driver.ts` — `FacetWarning.severity`, and the collector dispatches to `console.error` or `console.warn`.
- `packages/transform/test/warning-scope.test.ts` — 6 tests pinning the scope change and the severity split.

### The scope decision

Per-build, as agreed. The `*_WARNED` sets were module scoped, so a warn-once fired once per *process*: in a long-lived dev server an author saw a diagnostic once, changed nothing, and never saw it again — not after the edit that failed to fix it, and not on any other page. With the collector owned by `createTransform`, a rebuild re-reports and a single build still reports once however many runes trip the condition.

One of the new tests is specifically the one that would have failed before: a second build re-reports where it used to stay silent.

`FacetWarning.severity` was required, not incidental — `requiresParent` routes a misplaced structural child to `console.error` and any other violation to `console.warn`, and the collector only knew `console.warn`.

### A risk that did not materialise

All ten `spyOn(console, 'warn')` files passed **untouched**. Messages are byte-identical and emission still happens at the same point — but it also confirms nothing was depending on cross-test warning suppression, which module-scoped sets had made possible. That was the main hazard of widening the scope.

### Criterion left unchecked

"The ten `spyOn(console, 'warn')` test files assert on returned `FacetWarning[]` where the diagnostic comes from a facet" is **not** done, and on reflection should not be. Those are integration tests going through `createTransform`, where the console genuinely is the observable channel; converting them would require exposing the collector's output from `createTransform` — a public API addition this item does not otherwise need and its internal-only framing does not cover.

The underlying goal is met elsewhere: every facet-owned diagnostic is asserted as data in the facet unit tests added across this milestone (`elevation`, `prominence`, `frame`, `substrate`, `content-place`, `bg`, `dropcap`). Console assertions remain exactly where the warn site is not a facet. Left unchecked rather than reworded so the judgement stays visible.

All 630 pre-existing transform tests pass unmodified; full repo suite green at 4018; contracts unchanged across 132 runes.

{% /work %}
