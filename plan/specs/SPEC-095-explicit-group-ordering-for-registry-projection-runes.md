{% spec id="SPEC-095" status="accepted" source="SPEC-072" tags="registry,collection,aggregate,relationships,grouping,ordering" %}

# Explicit group ordering for registry-projection runes

The three registry-projection runes — [`collection`](/runes/collection) (items),
[`aggregate`](/runes/aggregate) (numbers), [`relationships`](/runes/relationships)
(edges) — all render **grouped** output, but the order of the groups is only
controllable for *enum* fields (via the domain-aware ordering from
{% ref "SPEC-072" /%}). For a non-enum group field the groups fall back to
**insertion order** — the order each distinct value first appears in the set —
which is effectively arbitrary to an author. Add a `group-order` attribute that
lets a page state the group sequence explicitly.

Target: next minor (post-v0.21.0).

## Motivation

The rune catalogue (`runes/rune-catalog.md`) groups core runes by `category`.
`category` is not an enum, so the sections render in registry-insertion order
(`Layout, Registry, Content, Site, Code & Data`) rather than the intended
reading order (`Content, Registry, Layout, Code & Data, Site`). The only current
workaround is to split into several filtered queries — which doesn't scale and
loses the single-source-of-truth property. The same gap applies to any grouped
view over a non-enum field (`assignee`, `plugin`, `category`, edge `kind`).

## Current state

A single shared brain orders groups — `Ordering` + `groupEntities()` in
`packages/runes/src/collection-helpers.ts`:

- `collection` and `aggregate` both group via `groupEntities(entities, field, ordering)`.
  When the field has a domain ordering (an enum's declared `matches` order, or a
  registered override), groups sort by their representative rank; otherwise the
  grouped `Map` is in insertion order.
- `aggregate` additionally has `sort` (`key`/`count`/`value`/`percent`) which
  re-orders groups by a **metric** (not identity).
- `relationships` is the outlier: it groups edges by `kind`/`type` with the
  generic `groupBy()` and never consults `Ordering` — always insertion order.

## Design

### The `group-order` attribute

- **Type:** string — a comma-separated list of group **keys** in the desired
  order, e.g. `group-order="Content,Registry,Layout,Code & Data,Site"`.
- **Partial ordering:** listed keys come first, in the given order; any group
  **not** listed is appended afterwards in its existing order (domain order if
  the field is an enum, else insertion order). So an author can pin the front of
  the list without enumerating every value.
- **Unknown keys** (a listed value that matches no group) are skipped silently —
  the list is a *preference*, not a constraint, so it survives data changes.
- Only meaningful alongside `group`; ignored (with no error) when ungrouped.

### One shared helper

Add `orderGroups(groups, explicitOrder)` to `collection-helpers.ts`: given a
grouped `Map<string, T[]>` (already in domain/insertion order) and the parsed
key list, return a new `Map` with listed keys first (in order), the rest
appended in their incoming order. All three runes route their grouped map
through it, so the behaviour is identical everywhere:

- `collection` — apply after `groupEntities()` in `renderGroupOrFlat()`.
- `aggregate` — apply after `groupEntities()`. Precedence: an explicit **metric**
  `sort` (`count`/`value`/`percent`) still wins (those reorder by magnitude);
  `group-order` sets the identity baseline used when `sort` is absent or `key`.
  Applies to both the body-zoned iteration and the `layout="chart"` bar order.
- `relationships` — route its `groupBy()` result through the same helper (this is
  the one new code path, since relationships doesn't use `groupEntities()` today).

### Why not extend `sort`?

`aggregate.sort` is metric ordering (by count/value/percent); `collection.sort`
and `relationships.sort` order *items within* a group, not the groups. `group`
*identity* ordering is a distinct axis, so it gets its own attribute on all three
runes rather than overloading `sort`.

## Acceptance Criteria

- [ ] `collection`, `aggregate`, and `relationships` accept a `group-order`
  string attribute (comma-separated group keys).
- [ ] Listed keys order the groups first (in the given order); unlisted groups
  follow in their existing (domain/insertion) order; unknown keys are ignored.
- [ ] A single shared `orderGroups()` helper implements the reordering; all three
  runes use it (relationships routed through it for the first time).
- [ ] In `aggregate`, `group-order` orders both the body-zoned per-group output
  and the `layout="chart"` bars; an explicit metric `sort` still takes precedence.
- [ ] Domain-aware ordering ({% ref "SPEC-072" /%}) is unchanged when `group-order`
  is absent (no regression); `group-order` layers on top when present.
- [ ] Documented on all three rune pages with an example; unit tests cover
  partial ordering, unlisted-tail fallback, and unknown-key tolerance.
- [ ] The rune catalogue uses `group-order` to render core categories in reading
  order (`Content, Registry, Layout, Code & Data, Site`).

## Non-goals

- A `group-order="asc"|"desc"` lexical mode — could be a later convenience; this
  spec is explicit-list only.
- Changing item/edge (`sort`) ordering or the domain-order defaults.
- Ordering for ungrouped output.

## References

- {% ref "SPEC-072" /%} — domain-aware (enum) collection ordering this extends.
- SPEC-070 (`collection`), SPEC-076 (`aggregate`) — the grouped runes.
- `packages/runes/src/collection-helpers.ts` (`Ordering`, `groupEntities`, `groupBy`),
  `collection-resolve.ts`, `aggregate-resolve.ts`, `relationships-resolve.ts`.

{% /spec %}
