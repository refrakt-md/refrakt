{% spec id="SPEC-070" status="draft" tags="runes, registry, listing, core" %}

# Collection rune

A generic core rune that renders a **list, table, or grid of registry entities** — the plural counterpart to `{% ref %}` (one entity → a link) and `{% expand %}` (one entity → inlined content). Where those consume a single entity, `collection` queries the registry for *many* and projects them into a chosen layout, with filter / sort / group / limit and declarative field selection.

Generic over entity type: works for plan specs, storytelling characters, places events, design tokens, commerce products, externally-registered CMS / database rows — anything in the `EntityRegistry`. Replaces hand-maintained lists that mirror structured data with a live query, the same way `{% backlog %}` does for plan content — but for every entity type, core and plugin alike.

## Problem

The registry is refrakt's substrate for structured, addressable content. Three families of rune consume it for a *single* entity — but nothing consumes it for *many*:

| Rune | Cardinality | Output |
|------|-------------|--------|
| `{% ref %}` | one | a link |
| `{% expand %}` | one | inlined content |
| — | **many** | **(missing)** |

The only plural lister today is `{% backlog %}` (in `@refrakt-md/plan`), and it's hardcoded to plan entity types (`work`/`bug`/`spec`/`decision`/`milestone`) with plan-specific card chrome. Every other domain that registers entities has no listing surface:

- **Storytelling** can register characters, realms, factions — but can't render "all characters in realm X".
- **Places** registers events and venues — but can't render "events this month".
- **Design** could register tokens — but can't render a token reference table.
- **External-data plugins** (SPEC-069: Notion, Airtable, SQL) register rows — but for *tabular* sources, the listing **is the primary view**. Without a generic lister, an Airtable integration can only produce a route per row, never the inline table/grid that's the whole point of a spreadsheet source.

Today the options are: hand-maintain a markdown list that drifts from the data; write a bespoke listing rune per plugin (as plan did with backlog); or give every row its own page just so `{% blog folder %}` can list them. All three are worse than a generic query.

`{% collection %}` is the missing third member of the registry-consumer family: **many entities, projected into a layout, from a live query.**

-----

## Design Principles

**Plural counterpart to ref / expand.** Same registry substrate, same lookup vocabulary. An author who knows `{% ref %}` and `{% expand %}` understands `{% collection %}` as "the same thing, for a list". The three compose: a `collection` of cards each linking via the entity's resolved URL; a `collection` inside a `{% drawer %}`; a `collection` filtered by the same `field:value` syntax backlog and xref patterns already use.

**Generic over entity type; told what to show.** backlog can hardcode "id, status badge, priority" because it knows plan entities. `collection` can't assume the shape of a `product` or `character`, so display is *configured*, not baked in. This forces a zero-config → full-config progression (see Authoring Surface) rather than a fixed card template.

**Zero-config baseline always works.** `{% collection type="character" /%}` with no other attributes renders each entity's title as a link to its resolved URL. No knowledge of the entity's fields required. Everything past that (field projection, layouts, templates) is opt-in sophistication.

**Backlog becomes a preset, not a peer.** Once `collection` exists, `{% backlog %}` is conceptually `collection` specialized to plan types with nicer default chrome. It stays as a convenience (plan users keep writing `{% backlog %}`), but it's no longer a parallel implementation — ideally it delegates to the shared collection resolver. `{% blog %}` is *not* absorbed: it lists pages from the content corpus by folder, a different substrate (page entities with folder semantics) than collection's type-based registry query.

**Build-time, registry-driven, no manual maintenance.** Like backlog, the list is resolved from the registry during the cross-page pipeline. Add an entity anywhere — a new plan file, a new CMS row, a new character — and every `collection` that matches picks it up on the next build. No list to maintain.

-----

## Authoring Surface

### Attributes

```markdoc
{% collection
   type="product"              {# entity type(s) to list — required #}
   filter="category:tools"     {# field:value pairs; AND across fields, OR within a field #}
   sort="price"                {# sort by an entity data field #}
   group="category"            {# group into sections by a field #}
   limit=20                    {# cap the rendered count (post-sort, pre-group) #}
   layout="table"              {# table | cards | list | grid #}
   fields="name,price,stock"   {# which data fields to project, in order #}
/%}
```

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `type` | string | **required** | Entity type to list. Comma-separated for multiple types (`"spec,decision"`). |
| `filter` | string | — | Space-separated `field:value` pairs. Same-field values OR; different fields AND. Same syntax as `{% backlog %}` / xref patterns. |
| `sort` | string | — | Entity `data` field to sort by. Unset preserves registration order. |
| `group` | string | — | Group into sections by a `data` field. |
| `limit` | number | — | Cap rendered count, applied post-sort, pre-group (same semantics as backlog's `limit`). |
| `layout` | `table` \| `cards` \| `list` \| `grid` | `list` | Presentation. |
| `fields` | string | — | Comma-separated `data` field names to project. Required for `table`; optional enrichment for `cards`/`grid`; ignored by `list` (title-only). |

### Three levels of display control

**1. Zero-config — directory of links.**

```markdoc
{% collection type="character" /%}
```

Each entity renders as its title (`data.title` / `data.name`) linking to its resolved URL (`sourceUrl` → `canonicalUrl` → pattern, same chain as xref). Works for any entity type with no knowledge of its fields. The fallback baseline.

**2. Field projection — tables and enriched cards.**

```markdoc
{% collection type="product" layout="table" fields="name,price,stock" sort="price" /%}
```

Projects the named `data` fields into the layout: table columns, or labeled card rows. Covers the bulk of tabular / catalog use without per-item templating.

**3. Item template *(future / escape hatch)*.**

A rune body acting as a per-item template with `$item.*` access, for full control of each entity's rendering. Deferred — same config-vs-function layering as `entityRoutes` (SPEC-069). Ship levels 1–2 first; add templates only if declarative projection proves insufficient.

### Layouts

| Layout | Renders | Field use |
|--------|---------|-----------|
| `list` | compact title (+ optional one-line description), each a link | title only |
| `cards` | a card per entity, backlog-style chrome | optional projected fields |
| `grid` | card grid (for entities with images/media) | optional projected fields |
| `table` | one row per entity, columns from `fields` | required |

Per-item rendering delegates to the layout — an item is a link (`list`), a card (`cards`/`grid`), or a row (`table`). An item is **not** rendered via full `{% expand %}` by default: too heavy for a list, and many listable entities aren't embeddable. (A future item-template level could opt into richer per-item rendering.)

-----

## Output Contract

```html
<section class="rf-collection rf-collection--table"
         data-rune="collection"
         data-type="product"
         data-layout="table">
  <table class="rf-collection__table">
    <thead>
      <tr><th>Name</th><th>Price</th><th>Stock</th></tr>
    </thead>
    <tbody>
      <tr class="rf-collection__row" data-entity-id="widget">
        <td><a href="/products/widget/">Widget</a></td>
        <td>$20</td>
        <td>14</td>
      </tr>
      …
    </tbody>
  </table>
</section>
```

```html
<!-- layout="cards" -->
<section class="rf-collection rf-collection--cards" data-rune="collection" data-type="character" data-layout="cards">
  <div class="rf-collection__items">
    <article class="rf-collection__card" data-entity-id="veshra">
      <a class="rf-collection__title" href="/cast/veshra/">Veshra</a>
      <div class="rf-collection__field" data-field="realm">Sanctuary</div>
    </article>
    …
  </div>
</section>
```

BEM:
- `.rf-collection` — wrapper
- `.rf-collection--{layout}` — layout modifier
- `.rf-collection__items` — item container (cards/grid/list)
- `.rf-collection__card` / `.rf-collection__row` — per-entity item
- `.rf-collection__table` — table layout
- `.rf-collection__title` — entity title link
- `.rf-collection__field` — a projected field (carries `data-field`)
- `.rf-collection__group` / `.rf-collection__group-title` — grouping (when `group` set)

Data attributes: `data-rune="collection"`, `data-type`, `data-layout` on the wrapper; `data-entity-id` per item; `data-field` per projected field; `data-group` on group containers.

-----

## Resolution

Like backlog, `collection` is a sentinel rune: the schema emits a placeholder with the attributes as meta tags; a postProcess pass resolves it against the registry.

1. **Collect** — registry entities of the requested `type`(s).
2. **Filter** — apply `field:value` clauses against entity `data`.
3. **Sort** — by `sort` field (string / number / date inferred from value).
4. **Limit** — slice post-sort, pre-group.
5. **Group** — partition by `group` field if set.
6. **Render** — per the layout, projecting `fields`. Each item's title links to the entity's resolved URL via the standard xref chain (`sourceUrl` → `data.url` → patterns → unresolved-but-still-render-as-text).

The resolver is shared, type-agnostic core code. It lives wherever the cross-page registry-consuming runes live (alongside the xref / expand resolvers in `@refrakt-md/runes`), so it sees the fully-populated registry — including externally-contributed entities (SPEC-069) and plan entities (SPEC-064) — uniformly.

-----

## Relationship to existing runes

- **`{% backlog %}`** (`@refrakt-md/plan`) — becomes a preset of `collection`: plan-type defaults, status/priority/severity badge chrome, the milestone-aware grouping. Reimplement it as a thin wrapper over the shared collection resolver (so plan keeps its nice chrome but stops duplicating filter/sort/group/limit logic), or leave it as-is and share only the resolver internals. Either way, `collection` is the general primitive; backlog is the plan-flavored convenience.
- **`{% blog %}`** (core) — stays separate. It lists *pages* from the content corpus by folder + frontmatter, not *entities* by type. Different substrate, different query model. A contributed page (SPEC-069) shows up in `{% blog %}` because it's a page; a registered entity shows up in `{% collection %}` because it's an entity. Both can be true of the same underlying thing.
- **`{% datatable %}`** (core) — renders an *authored* markdown table with interactivity (sort/filter client-side). `collection` with `layout="table"` renders a table from *registry data*. Different inputs (authored vs. queried); a future enhancement could let a `collection` table opt into datatable's client behaviors.
- **`{% ref %}` / `{% expand %}`** — the singular members of the same family; `collection` is the plural one.

-----

## Engine Changes

- New rune schema `packages/runes/src/tags/collection.ts` — sentinel emitter (placeholder + attribute meta tags), following the backlog pattern.
- New resolver `packages/runes/src/collection-resolve.ts` (or fold into the existing registry-consumer resolver module) — generic filter/sort/group/limit/project over `registry.getAll(type)`. Shares the filter-parse + sort helpers with backlog rather than duplicating them; those helpers move to a shared location if they currently live inside the plan plugin.
- `corePipelineHooks.postProcess` gains a collection-resolution step (after expand + xref so item links resolve through the same chain).
- `Collection` engine config entry in `packages/runes/src/config.ts` (`block: 'collection'`, layout modifier from meta).
- CSS `packages/lumina/styles/runes/collection.css` — the four layouts (list/cards/grid/table) + grouping + field projection.
- `@refrakt-md/plan` — optionally refactor `{% backlog %}` to delegate to the shared resolver. Not required for collection to ship; can follow.

-----

## Use Cases

The justification for core rather than per-plugin: *every plugin that registers entities gets a listing surface for free.*

**Refrakt domain plugins (no listing surface today):**
- Storytelling — character rosters, faction listings, "characters in realm X"
- Places — "events this month", venue directories, itinerary listings
- Business — team directories from `cast`, org listings, timelines-as-lists
- Design — token reference tables, swatch grids, component indexes
- Media — track listings, episode archives

**External data (SPEC-069 sources):**
- Tabular sources (Airtable / Sheets / SQL) — price lists, comparison matrices, directories, inventory tables rendered inline *without* per-row routes (the case `{% blog %}` and `entityRoutes` can't cover)
- Commerce — product catalog grids, featured-product strips, category pages

**Plan / docs cross-cutting:**
- Flexible plan indexes beyond backlog's fixed type set
- A glossary — `term` entities as a definition list
- A tag index — every entity (any type) carrying tag X, a cross-type archive

**Refrakt-internal:**
- "All runes" as a live catalog (replacing the hand-maintained rune-catalog table)
- "All installed plugins" — self-documenting index
- API symbol indexes from a typedoc plugin's entities

**People / contributors:**
- Blog-author grids, GitHub-contributor listings

The throughline: anywhere a hand-maintained list mirrors structured data, `collection` replaces it with a live query.

-----

## Acceptance Criteria

- [ ] `{% collection type="X" /%}` lists registry entities of type X
- [ ] Zero-config (type only) renders each entity's title as a link to its resolved URL (xref chain: `sourceUrl` → `data.url` → pattern → text fallback)
- [ ] `type` accepts comma-separated multiple types
- [ ] `filter` applies `field:value` clauses (AND across fields, OR within) against entity `data` — same syntax as backlog
- [ ] `sort` orders by a `data` field; string / number / date ordering inferred from the value
- [ ] `limit` caps the rendered count post-sort, pre-group (degenerate values treated as unset, matching backlog's defensive parse)
- [ ] `group` partitions into sections by a `data` field
- [ ] `layout` supports `list` (default), `cards`, `grid`, `table`
- [ ] `fields` projects named `data` fields; required for `table`, optional for `cards`/`grid`, ignored by `list`
- [ ] Output carries `data-rune="collection"`, `data-type`, `data-layout`; items carry `data-entity-id`; projected fields carry `data-field`
- [ ] Resolution runs in postProcess after expand + xref so item links resolve through the same chain
- [ ] Works for plan entities, externally-contributed entities (SPEC-069), and any plugin-registered type — no type-specific code in the resolver
- [ ] Lumina ships CSS for all four layouts + grouping + field projection
- [ ] `refrakt inspect collection` shows the expected HTML
- [ ] CSS coverage tests pass for `.rf-collection*`
- [ ] Empty result (no matching entities) renders a stable empty state, not a broken/blank section
- [ ] Authoring docs cover the rune, the three display levels, the layouts, the relationship to `backlog` / `blog` / `datatable`, and the registry-driven "no manual list maintenance" model

-----

## Out of Scope

- **Item templates** (`$item.*` per-item body templating). Deferred to a follow-up; levels 1–2 (zero-config + field projection) ship first. Add only if declarative projection proves insufficient.
- **Client-side interactivity** (sortable columns, live filtering). `collection` is build-time static. A future enhancement could bridge a `table`-layout collection into `{% datatable %}`'s client behaviors, but that's its own design.
- **Pagination UI** (page 1 / 2 / 3 of a large collection). `limit` caps the set; rendering N pages of navigation is a separate concern. Large collections either cap or render fully.
- **Cross-site collections** in a monorepo. Each site queries its own registry.
- **Joins / computed columns across entity types.** A `collection` lists one logical set; combining fields from related entities (the linked-record / rollup case) is a richer query than this rune takes on. Relations surface as links (via the entity's resolved URL), not as joined columns.
- **Backlog removal.** `{% backlog %}` stays as the plan-flavored preset; this spec doesn't deprecate it, only positions `collection` as the general primitive it could delegate to.

-----

## Open Questions

**Should `backlog` be refactored to delegate to the collection resolver in the same milestone, or later?** Refactoring shares the filter/sort/group/limit logic and removes duplication, but it's a behavior-preserving change to a shipped rune with its own tests. Recommend: ship `collection` standalone first (sharing the *helper* functions, not the whole resolver), refactor backlog to fully delegate in a follow-up once collection's resolver has proven out. Avoids coupling a new rune's launch to a refactor of an existing one.

**How does `sort` infer type (string vs number vs date)?** Entity `data` values are untyped at the registry boundary. Options: sniff the value (numeric string → number sort; ISO-date-shaped → date sort; else lexical), or add a `sortType` attribute. Recommend sniffing for v1 with `sortType` as a future override — matches the "zero-config works" principle.

**What's the empty-state contract?** A `collection` that matches nothing should render *something* stable (an empty container with a class themes can style, or an optional `empty=` message attribute) rather than a blank gap. Recommend an empty container with `data-empty` so themes decide; revisit an `empty=` message attribute if authors want inline copy.

**Should `fields` support dotted paths** (`author.name` for nested `data`)? Entity `data` can be nested. Tempting, but adds projection complexity. Recommend flat fields for v1; nested access waits for the item-template level (which has full `$item` access anyway).

**Should `collection` default `layout` differ by entity type?** A `character` might want cards; a `product` a table. Tempting to let plugins declare a preferred default layout per type. Recommend no for v1 — explicit `layout` keeps the rune predictable; per-type defaults are a plugin-config concern that can come later.

**Does `collection` participate in `data-outline-scope`** (SPEC-066)? Its items are links/cards/rows, not headings, so it doesn't introduce outline entries — no interaction expected. Confirm there's no heading leakage from card titles (they should be links/spans, not `<hN>`).

-----

## References

- {% ref "SPEC-066" /%} — expand rune (the singular content member; collection is the plural one)
- {% ref "SPEC-065" /%} — configurable xref resolution (item links use the same chain; same `field:value` filter syntax)
- {% ref "SPEC-069" /%} — plugin-contributed routes (external entities collection lists; the source that made collection non-optional for tabular data)
- {% ref "SPEC-064" /%} — plan plugin registration (plan entities collection can list)
- `plugins/plan/src/tags/backlog.ts` + `plugins/plan/src/pipeline.ts` — the plan-specific lister collection generalizes; source of the shared filter/sort/group/limit helpers
- `packages/runes/src/xref-resolve.ts` — the resolver pattern collection follows

{% /spec %}
