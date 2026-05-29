{% work id="WORK-276" status="done" priority="high" complexity="complex" source="SPEC-072" tags="collection,ordering,runes" milestone="v0.16.0" %}

# Domain-aware (type, field) ordering for collection sort and group

Teach `collection` sort/group to order enum fields (priority, status, severity, …) in a meaningful, domain-defined order instead of lexically. This is the one true parity gap blocking ADR-012 (collapsing `backlog`/`decision-log` onto `collection`): `sort="priority"` must yield critical→low, not alphabetical, and status groups must appear in a defined order.

## Acceptance Criteria
- [x] Sort and group consult an ordering lookup keyed by `(type, field)` — never `field` alone.
- [x] The default order for a `(type, field)` is derived from that rune attribute's schema `matches` array (the existing ordered enum), with no registration required.
- [x] A plugin can register an explicit `(type, field) → string[]` override for when presentation order differs from declaration order.
- [x] An unregistered `(type, field)` falls back to the current generic lexical/numeric sort.
- [x] Mixed-type queries use rank-normalization: each entity's value resolves to its index within its own `(type, field)` ordering; sort by that integer rank, and order groups by their representative (minimum) rank. Unranked values sort after ranked ones, then lexically.
- [x] The same ordering applies to both `sort` and `group` (group display order), in `collection` and `relationships`.
- [x] Tests cover: single-type enum sort, group display order, schema-`matches` default, explicit override, lexical fallback, and a mixed work+bug set by `status`.

## Approach
Build a `(type, field) → string[]` ordering registry threaded through the pipeline to the collection resolver (mirror how `embedConfig` is threaded). Populate defaults automatically by reading each registered rune's attribute `matches`; merge plugin-supplied overrides on top. In the shared sort/group helpers (WORK-274), resolve each entity's value to a rank via its `(type, field)` ordering and compare by rank, with the documented fallbacks. Group display order sorts group keys by representative rank.

## Dependencies
WORK-274 — the shared sort/group helpers this modifies.

## References
- {% ref "SPEC-072" /%} — Capability 3 (keying, source of order, rank normalization).
- {% ref "ADR-012" /%} — why this is the enabling parity item.

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/collection-helpers.ts` — added an `Ordering` class (`order(type,field)` / `rank(type,field,value)`) keyed by `(type, field)`, layering explicit overrides over `matches`-derived defaults; `buildOrdering(embedConfig)` derives the matches map from each tag schema's attribute `matches` and merges `embedConfig.orderings` overrides. `sortEntities`/`groupEntities` now take an optional `Ordering`: rank within each entity's own type (mixed-type-safe), ranked-before-unranked (direction-independent), lexical/numeric fallback; groups emit in representative-(min)-rank order.
- `CollectionEmbedConfig` gained an optional `orderings` override map.
- `collection-resolve.ts` builds the ordering once per page and threads it through `sortEntities`/`groupEntities`.
- `packages/runes/src/index.ts` — export `Ordering`/`buildOrdering`/`sortEntities`/`groupEntities`/etc.
- `packages/runes/test/collection-ordering.test.ts` — matches default, override, lexical fallback, mixed-type rank, group order, back-compat.

### Notes
- The override *surface* is `embedConfig.orderings`; deriving the default from `matches` means priority/severity order for free. Wiring the plan plugin's actionable-first **status** override into `embedConfig.orderings` (via site.ts) is done in WORK-279.
- Back-compat: with no `Ordering` (e.g. unit calls without embedConfig), behavior is the prior lexical/numeric sort and insertion-order groups. Full runes suite (635) green.

{% /work %}
