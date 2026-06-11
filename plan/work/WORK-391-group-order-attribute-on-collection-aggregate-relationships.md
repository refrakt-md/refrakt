{% work id="WORK-391" status="ready" priority="medium" complexity="moderate" source="SPEC-095" tags="registry,collection,aggregate,relationships,grouping,ordering" %}

# group-order attribute on collection, aggregate, relationships

Implements {% ref "SPEC-095" /%}: an explicit `group-order` attribute so authors
can sequence groups over a **non-enum** field (e.g. `category`, `plugin`, edge
`kind`), which today render in arbitrary insertion order.

## Approach

- **Shared helper** — add `orderGroups(groups, explicitOrder)` to
  `packages/runes/src/collection-helpers.ts`: takes a grouped
  `Map<string, T[]>` (already in domain/insertion order) + the parsed key list,
  returns a `Map` with listed keys first (in order), the rest appended in their
  incoming order. Unknown keys skipped. Generic over the value type so all three
  runes share it.
- **Schemas** — add `'group-order': { type: String, default: '' }` to
  `tags/collection.ts`, `tags/aggregate.ts`, `tags/relationships.ts`; emit a
  `*-group-order` meta tag (follow the existing `group` / `group-display` pattern).
- **Resolvers** — parse the comma list in each `readQuery()`; apply `orderGroups`:
  - `collection-resolve.ts` — after `groupEntities()` in `renderGroupOrFlat()`.
  - `aggregate-resolve.ts` — after `groupEntities()`, before `sortGroups()`; an
    explicit metric `sort` (`count`/`value`/`percent`) still wins. Covers both the
    body-zoned and `layout="chart"` paths.
  - `relationships-resolve.ts` — wrap its `groupBy()` result (the one path not
    using `groupEntities()` today).
- **Docs** — `group-order` row + example on all three rune pages; switch
  `runes/rune-catalog.md` core section to
  `group-order="Content,Registry,Layout,Code & Data,Site"`.
- **Changeset** — minor (`@refrakt-md/runes`).

## Acceptance Criteria
- [ ] `collection`, `aggregate`, and `relationships` accept `group-order` (comma-separated group keys); ignored when ungrouped.
- [ ] Listed keys order groups first; unlisted groups follow in their existing (domain/insertion) order; unknown keys are tolerated (skipped).
- [ ] A single shared `orderGroups()` helper does the reordering and is used by all three runes (relationships routed through it).
- [ ] In `aggregate`, `group-order` orders both the body-zoned per-group output and the `layout="chart"` bars; an explicit metric `sort` takes precedence.
- [ ] Domain-aware ordering ({% ref "SPEC-072" /%}) is unchanged when `group-order` is absent; `group-order` layers on top when present.
- [ ] Unit tests cover partial ordering, unlisted-tail fallback, and unknown-key tolerance (for collection + aggregate + relationships).
- [ ] Documented on all three rune pages; the rune catalogue renders core categories in reading order via `group-order`.

## References
- {% ref "SPEC-095" /%} · {% ref "SPEC-072" /%}
- `packages/runes/src/collection-helpers.ts`, `collection-resolve.ts`, `aggregate-resolve.ts`, `relationships-resolve.ts`

{% /work %}
