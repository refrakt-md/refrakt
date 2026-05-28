{% work id="WORK-294" status="ready" priority="high" complexity="moderate" source="SPEC-076" tags="aggregate,runes,postprocess,collection,registry" milestone="v0.16.0" %}

# Aggregate rune — schema, post-process resolver, tests

Build the core `{% aggregate %}` rune from {% ref "SPEC-076" /%} — the third post-process-resolved query rune alongside `collection` and `relationships`. One rune, two modes: no-body emits a single integer; body-zoned form (preamble / template / fallback) iterates groups with `$item` bound differently per zone. Foundation for the rest of SPEC-076 (Lumina styling, `plan-progress` decomposition, docs).

## Acceptance Criteria
- [ ] `aggregate` schema in `packages/runes/src/tags/aggregate.ts` accepts `type`, `filter`, `value`, `group`, `sort`, `limit`, `empty` attributes; uses `deferBody` to capture the body source.
- [ ] No-body form (`{% aggregate type=… filter=… /%}`) renders a sentinel that the resolver replaces with a single integer — the count of entities matching the query.
- [ ] Body-zoned form splits the source on top-level `hr` into preamble / template / fallback zones, reusing `splitBodyZones` from `collection-helpers`.
- [ ] In the preamble, `$item` is bound to `{ count, value, percent, total }` (with `count === total` in this zone). Without a `value` attribute, `$item.value` falls back to `$item.count` and `$item.percent` is `100`.
- [ ] In the template, `$item` is bound to `{ key, count, value, percent, total, shown }`; the template is reparsed per group via `transformDeferredTemplate`. `$item.count` is this group's count; `$item.total` is the all-groups total (a constant across iterations).
- [ ] In the fallback, all numeric fields are `0`.
- [ ] The `value` attribute is a secondary `field:value` clause (same grammar as `filter`); when set, `$item.value` is the count matching both `filter` and `value`, and `$item.percent` is `(value / count) × 100`, integer 0–100.
- [ ] `group` is optional — without it, the body renders **once** with the in-context projection (no per-group iteration).
- [ ] `sort` / `limit` apply over groups; `sort` honors {% ref "SPEC-072" /%} domain-aware ordering when the group field has one.
- [ ] Self-closing `empty="…"` attribute works as a string fallback; the body's fallback zone wins when both are present (same precedence as `collection`).
- [ ] A new resolver `resolveAggregates` (parallel to `resolveCollections` / `resolveRelationships`) is wired into `resolveCoreSentinels` and runs at phase 4 with the full registry available.
- [ ] Engine config entry for `Aggregate` in `packages/runes/src/config.ts` so the BEM block / data-rune is registered.
- [ ] Catalog entry in `packages/runes/src/index.ts` via `defineRune`.
- [ ] Tests in `packages/runes/test/aggregate*.test.ts` cover: no-body integer output; preamble / template / fallback zone semantics; `$item.value` / `count` / `total` / `percent` bindings; `value` sub-filter math; `group` ungrouped (single render); `sort` (with and without domain ordering); `limit`; `empty` attribute; mixed types (`type="work,bug"`).

## Approach
Mirror the existing `relationships` resolver structure (`packages/runes/src/relationships-resolve.ts`) — it's the closer cousin since both produce *derived* output rather than entity items. Query the registry (`registry.getAll(type)` per type, then apply `filter` via the existing field-match grammar). When `value` is set, run the same field-match against the matched set for the achieved subset. Group via `groupEntities` + domain ordering already in `collection-helpers`. Per-group iteration uses `transformDeferredTemplate(body, embedConfig, { item: groupProjection })` — same path `collection`'s per-item template uses. Preamble likewise but bound once with totals. Reuse `splitBodyZones`. The single-number form is the no-body short-circuit: skip zone splitting, render a `<span class="rf-aggregate" data-aggregate="count">{count}</span>` directly.

## Dependencies
_None — this is the foundation; the other SPEC-076 items depend on it._

## References
- {% ref "SPEC-076" /%}
- {% ref "SPEC-070" /%} — `collection`, the closest sibling; reuse `splitBodyZones`, `groupEntities`, `transformDeferredTemplate`.
- {% ref "SPEC-072" /%} — domain-aware ordering for `sort`.

{% /work %}
