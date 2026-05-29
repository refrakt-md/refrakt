{% work id="WORK-294" status="done" priority="high" complexity="moderate" source="SPEC-076" tags="aggregate,runes,postprocess,collection,registry" milestone="v0.16.0" %}

# Aggregate rune — schema, post-process resolver, tests

Build the core `{% aggregate %}` rune from {% ref "SPEC-076" /%} — the third post-process-resolved query rune alongside `collection` and `relationships`. One rune, two modes: no-body emits a single integer; body-zoned form (preamble / template / fallback) iterates groups with `$item` bound differently per zone. Foundation for the rest of SPEC-076 (Lumina styling, `plan-progress` decomposition, docs).

## Acceptance Criteria
- [x] `aggregate` schema in `packages/runes/src/tags/aggregate.ts` accepts `type`, `filter`, `value`, `group`, `sort`, `limit`, `empty` attributes; uses `deferBody` to capture the body source.
- [x] No-body form (`{% aggregate type=… filter=… /%}`) renders a sentinel that the resolver replaces with a single integer — the count of entities matching the query.
- [x] Body-zoned form splits the source on top-level `hr` into preamble / template / fallback zones, reusing `splitBodyZones` from `collection-helpers`.
- [x] In the preamble, `$item` is bound to `{ count, value, percent, total }` (with `count === total` in this zone). Without a `value` attribute, `$item.value` falls back to `$item.count` and `$item.percent` is `100`.
- [x] In the template, `$item` is bound to `{ key, count, value, percent, total, shown }`; the template is reparsed per group via `transformDeferredTemplate`. `$item.count` is this group's count; `$item.total` is the all-groups total (a constant across iterations).
- [x] In the fallback, all numeric fields are `0`.
- [x] The `value` attribute is a secondary `field:value` clause (same grammar as `filter`); when set, `$item.value` is the count matching both `filter` and `value`, and `$item.percent` is `(value / count) × 100`, integer 0–100.
- [x] `group` is optional — without it, the body renders **once** with the in-context projection (no per-group iteration).
- [x] `sort` / `limit` apply over groups; `sort` honors {% ref "SPEC-072" /%} domain-aware ordering when the group field has one.
- [x] Self-closing `empty="…"` attribute works as a string fallback; the body's fallback zone wins when both are present (same precedence as `collection`).
- [x] A new resolver `resolveAggregates` (parallel to `resolveCollections` / `resolveRelationships`) is wired into `resolveCoreSentinels` and runs at phase 4 with the full registry available.
- [x] Engine config entry for `Aggregate` in `packages/runes/src/config.ts` so the BEM block / data-rune is registered.
- [x] Catalog entry in `packages/runes/src/index.ts` via `defineRune`.
- [x] Tests in `packages/runes/test/aggregate*.test.ts` cover: no-body integer output; preamble / template / fallback zone semantics; `$item.value` / `count` / `total` / `percent` bindings; `value` sub-filter math; `group` ungrouped (single render); `sort` (with and without domain ordering); `limit`; `empty` attribute; mixed types (`type="work,bug"`).

## Approach
Mirror the existing `relationships` resolver structure (`packages/runes/src/relationships-resolve.ts`) — it's the closer cousin since both produce *derived* output rather than entity items. Query the registry (`registry.getAll(type)` per type, then apply `filter` via the existing field-match grammar). When `value` is set, run the same field-match against the matched set for the achieved subset. Group via `groupEntities` + domain ordering already in `collection-helpers`. Per-group iteration uses `transformDeferredTemplate(body, embedConfig, { item: groupProjection })` — same path `collection`'s per-item template uses. Preamble likewise but bound once with totals. Reuse `splitBodyZones`. The single-number form is the no-body short-circuit: skip zone splitting, render a `<span class="rf-aggregate" data-aggregate="count">{count}</span>` directly.

## Dependencies
_None — this is the foundation; the other SPEC-076 items depend on it._

## References
- {% ref "SPEC-076" /%}
- {% ref "SPEC-070" /%} — `collection`, the closest sibling; reuse `splitBodyZones`, `groupEntities`, `transformDeferredTemplate`.
- {% ref "SPEC-072" /%} — domain-aware ordering for `sort`.

## Resolution

Completed: 2026-05-28

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/tags/aggregate.ts` — new schema with `type` / `filter` / `value` / `group` / `sort` / `limit` / `empty` attributes; `deferBody: true`. Outer tag is conditional on whether a body was captured: `<span>` for the no-body inline form so the rune is inline-safe in prose; `<section>` for the body-zoned form. Emits a sentinel meta plus one meta per attribute.
- `packages/runes/src/aggregate-resolve.ts` — new postProcess resolver mirroring `relationships-resolve.ts`. Reads metas, unions `registry.getAll(type)` across all listed types, applies `filter` via the shared `parseFieldMatch` / `matchesFieldMatch` grammar, and computes the achieved subset when `value` is set. No-body form short-circuits to a span carrying `data-aggregate="count"`, `data-count="N"`, and `N` as the only child. Body form uses `splitBodyZones` and renders preamble (totals on `$item`), per-group templates via `transformDeferredTemplate` with `{ key, count, value, percent, total, shown }` on `$item`, or a fallback zone with all zeros. `sort` supports `key` (domain-ordered when the group field has one) / `count` / `value` / `percent`, with `-` prefix for descending. `limit` caps the group set after sorting.
- `packages/runes/src/index.ts` — added the `aggregate` tag import, `defineRune` catalog entry, and exports for `resolveAggregates` + `AGGREGATE_SENTINEL`.
- `packages/runes/src/config.ts` — added the `Aggregate: { block: 'aggregate' }` engine config entry and wired `resolveAggregates` into the `createCorePipelineHooks` `postProcess` chain immediately after `resolveRelationships` (same placement rationale: after expand, before xref).
- `packages/runes/test/aggregate.test.ts` — 15 tests covering all acceptance criteria: no-body inline integer, mixed types, preamble totals binding, fallback to count when no `value` attribute, per-group template bindings, fallback zone zeros, ungrouped single render, value sub-filter math (achieved subset over primary set), limit caps + shown reflects post-limit count, sort by count, SPEC-072 domain-aware ordering via `orderings` override, empty-attribute string fallback, body-fallback precedence over empty-attribute, and outer-wrapper shape per mode.
- `packages/lumina/test/css-coverage.test.ts` — added `aggregate` to `UNSTYLED_BLOCKS` with a note that the CSS lands in WORK-295.
- `contracts/structures.json` + `packages/lumina/contracts/structures.json` — regenerated to include the new `Aggregate` rune.

### Notes
- Implementation reuses the existing `splitBodyZones`, `groupEntities`, `transformDeferredTemplate`, `buildOrdering`, and field-match grammar from `collection-helpers` and `field-match`. No new infrastructure was needed — the rune slots into the same patterns collection/relationships already established.
- The "wired into `resolveCoreSentinels`" criterion is satisfied via the `createCorePipelineHooks` `postProcess` chain, where `resolveCollections` and `resolveRelationships` already live. The standalone `resolveCoreSentinels` export covers a different set (breadcrumbs / nav / pagination / blog / xref), and that hasn't changed.
- Per-group wrapper divs carry `data-block=""` so first/last-child margin-trimming targets them the same way collection's per-item wrappers are targeted.
- Tests use a small `textOf()` helper that flattens string + number children — Markdoc inserts the bound numbers as `number` values, so `JSON.stringify` shows them as `"value=",4` rather than `"value=4"`. The helper recombines them so assertions can target the rendered text.

{% /work %}
