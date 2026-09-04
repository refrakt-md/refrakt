---
"@refrakt-md/transform": patch
---

Consolidate engine diagnostics onto the facet collector, scoped per build
(SPEC-124, WORK-524).

The last four module-level `*_WARNED` sets in `engine.ts` — interactive guest
in a link, non-eager cover sandbox, layout reference cycle, and `requiresParent`
violations — now emit through the same `WarningCollector` the facets use. All
nine of the original sets are gone.

**Behaviour change, deliberate.** Those sets were module scoped, so a warn-once
fired once per *process*: in a long-lived dev server an author saw a diagnostic
once, changed nothing, and never saw it again — not after the edit that failed
to fix it, and not on any other page. The collector is now owned by
`createTransform`, so dedupe is scoped to one build. A rebuild re-reports; a
single build still reports once however many runes trip the same condition.

Nothing else changes: every message is byte-identical, emission still happens
at the same point, and the 630 pre-existing transform tests pass unmodified.

`FacetWarning` also gains `severity`, because `requiresParent` routes a
misplaced structural child (`tab`, `bento-cell`, …) to `console.error` and any
other violation to `console.warn`. Without it that site could not go through
the collector at all.
