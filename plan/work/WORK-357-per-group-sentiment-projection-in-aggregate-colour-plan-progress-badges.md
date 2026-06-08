{% work id="WORK-357" status="done" priority="medium" complexity="moderate" source="SPEC-076" tags="aggregate,plan,plan-progress,badge,sentiment" %}

# Per-group sentiment projection in aggregate (colour plan-progress badges)

The deferred half of {% ref "WORK-296" /%}. `plan-progress` now lowers to an
`aggregate` composition whose per-status badges render **neutral** — the `badge`
rune keys colour off `data-meta-sentiment`, and `aggregate` does not project a
per-group sentiment onto `$item`, so the body has nothing to feed it. This is
SPEC-076's listed [future extension](#) — "per-group `sentiment` projected onto
`$item`, derived from the rune's domain ordering when the group field has a
sentiment-mapped enum." The status→sentiment maps already exist in the plan
config (`plugins/plan/src/config.ts` `metaFields.status.sentimentMap` per type:
work `done→positive`, bug `fixed→positive`, `blocked→negative`, …) but are
invisible to the generic resolver.

## Acceptance Criteria
- [x] `aggregate` projects `$item.sentiment` onto the per-group template binding when the group field has a registered `(type, field) → value → sentiment` map; absent → omit it (no neutral noise).
- [x] Sentiment maps are **registered by plugins** (keyed by `(type, field)`), mirroring the SPEC-072 domain-ordering registration the resolver already threads via `embedConfig` — the plan plugin registers its per-type status `sentimentMap`s.
- [x] Mixed-type group sets resolve sensibly (a status value maps via whichever type defines it; the achieved-union naming avoids cross-contamination).
- [x] `plan-progress`'s default body becomes `{% badge type="status" sentiment=$item.sentiment %}…{% /badge %}`, restoring per-status colour without a plan-side render path.
- [x] Tests: an aggregate over a sentiment-mapped enum binds `$item.sentiment`; plan-progress badges carry the expected `data-meta-sentiment`.

## Approach
Extend the `(type, field)` registry the resolver already consults for ordering
({% ref "SPEC-072" /%}) with an optional sentiment map. Thread it through
`embedConfig` (beside `orderings`), populate it from each plugin's rune config
(`metaFields.*.sentimentMap`), and project `$item.sentiment` in the aggregate
group projection. Then flip the plan-progress body rung to bind it.

## References
- {% ref "SPEC-076" /%} — "Future extensions: per-group sentiment projection".
- {% ref "WORK-296" /%} — lowered plan-progress; this restores the colour it deferred.
- {% ref "WORK-353" /%} — chart sentiment colouring wants the same projection.

## Resolution

Completed: 2026-06-08

Branch: `claude/v0.19.0-rollups`

### What was done
- `packages/content/src/site.ts`: derive a `(type → field → value → sentiment)` map from every plugin rune's `metaFields.*.sentimentMap` (keyed by the rune's `block` = entity type) and thread it through `embedConfig.sentiments` — mirroring the SPEC-072 `orderings` threading. No new registration surface; the plan plugin's existing status/priority/severity sentimentMaps are reused.
- `packages/runes/src/collection-helpers.ts`: `CollectionEmbedConfig.sentiments`.
- `packages/runes/src/aggregate-resolve.ts`: `groupSentiment()` helper; project `$item.sentiment` onto the per-group template (unmapped → `''`); tag the chart's label cell with `data-meta-sentiment` so the SVG bar/point colours by semantic token (WORK-353 mechanism).
- `plugins/plan/src/tags/plan-progress.ts`: badge body is now `{% badge type="status" sentiment=$item.sentiment %}`.
- Tests: 3 aggregate tests ($item.sentiment projection, unmapped→empty, chart cell tagging) + a plan-progress badge-sentiment assertion.

### Notes
- "Registered by plugins" is satisfied by *deriving* from the existing `metaFields.sentimentMap` rather than a second registration surface — the maps that colour entity badges now also colour aggregate breakdowns, with zero duplication/drift.
- Mixed-type groups use each group's first member's type for the lookup.
- End-to-end verified in the site build: plan-progress badges carry positive/negative/caution/neutral, and the aggregate chart's status cells carry `data-meta-sentiment`. This lights up the deferred colour from WORK-296 / WORK-349 / WORK-353.

{% /work %}
