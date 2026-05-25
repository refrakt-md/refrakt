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

**Query engine, not a renderer — delegate deliberate presentation.** collection's real value is the *query* (which entities, filtered/sorted/grouped/limited). Per-item *rendering* is a separate concern that spans from generic (built-in layouts projecting fields) to domain-specific (a deliberate `product-card` / `article-card`). A generic field-projection card is right for a price table; it's *wrong* for a storefront gallery. So collection delegates per-item rendering to a named **item-renderer rune** via `item=`, and the built-in layouts are reserved for generic data display. This separation is what keeps collection from being either too bland (generic-only) or too bloated (knowing every domain's card design).

**Zero-config baseline always works.** `{% collection type="character" /%}` with no other attributes renders each entity's title as a link to its resolved URL. No knowledge of the entity's fields required. Everything past that (built-in layouts, field projection, `item=` delegation) is opt-in sophistication.

**Listers are query-engine + item-card; the existing ones become presets.** Once `collection` + the item-renderer contract exist, `{% backlog %}` and `{% blog %}` are revealed as special cases — query + a domain card (`work-card` / `article-card`). They stay as convenience wrappers (back-compat + nice defaults) but the powerful, composable form is `collection item="…"`. backlog reduces *almost* fully (its aggregations stay bespoke); blog reduces cleanly once "folder" is expressed as a `url` prefix filter rather than a special axis. The refactor is decoupled from collection's launch (see *Sequencing*).

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
| `filter` | string | — | Space-separated `field:value` clauses. Supports exact, prefix/glob, and (future) regex matching — so "folder membership" is just a `url` prefix match, not a special axis (see *Filtering*). Same-field clauses OR; different fields AND. |
| `sort` | string | — | Entity `data` field to sort by. Unset preserves registration order. |
| `group` | string | — | Group into sections by a `data` field. |
| `limit` | number | — | Cap rendered count, applied post-sort, pre-group (same semantics as backlog's `limit`). |
| `item` | string | — | Name of a rune that renders one entity — collection delegates each item to it (e.g. `item="product-card"`). The domain-presentation path. When unset, the built-in `layout` handles rendering. |
| `layout` | `table` \| `cards` \| `list` \| `grid` | `list` | Built-in presentation for the generic-data path. Ignored when `item=` is set (the item rune owns rendering). |
| `fields` | string | — | Comma-separated `data` field names to project into the built-in `layout`. Required for `table`; optional enrichment for `cards`/`grid`; ignored by `list` and when `item=` is set. |

### Display control — generic data vs. domain presentation

collection's real value is the **query** (which entities, filtered/sorted/grouped/limited). *Rendering* spans a spectrum from zero-config to fully domain-specific, and the right level depends on whether you're displaying generic data or a deliberate domain gallery:

**1. Zero-config — directory of links.**

```markdoc
{% collection type="character" /%}
```

Each entity renders as its title (`data.title` / `data.name`) linking to its resolved URL (`sourceUrl` → `canonicalUrl` → pattern, same chain as xref). Works for any entity type with no knowledge of its fields. The always-works baseline.

**2. Built-in layouts + field projection — generic data display.**

```markdoc
{% collection type="product" layout="table" fields="name,price,stock" sort="price" /%}
```

Projects named `data` fields into a built-in layout (table columns, labeled card rows). This is the path for **generic data** — price tables, directories, comparison matrices, reference lists — where functional-but-plain is exactly right. It is *not* the answer for a rich domain gallery (see level 3); a product catalog rendered as generic projected cards reads as bland data, not a storefront.

Levels 3 and 4 are two complementary forms of **custom per-item rendering** — neither is "the real one"; they're points on a spectrum. Use the body template for flexible inline composition; use a named rune for reuse and logic.

**3. Body template — flexible inline composition (`$item` variables).**

```markdoc
{% collection type="product" sort="price" %}
## {% $item.data.title %}
![{% $item.data.title %}]({% $item.data.image %})
**{% $item.data.price %}** {% if $item.data.onSale %}{% badge %}Sale{% /badge %}{% /if %}
{% /collection %}
```

The rune **body is the per-item template**: real Markdoc with `$item` variable references and native `{% if %}`. collection runs the query, then renders the body once per entity with `$item` bound to that entity. "An item can be anything" — a heading, an image, a badge, a link, multiple runes, prose — composed inline from the entity's fields, with no rune to define. This is the declarative, no-extra-rune path; see *Per-item template mechanism* for how it works and *its one constraint* (no loops).

**4. `item=` delegation — reusable / complex cards.**

```markdoc
{% collection type="product" item="product-card" sort="price" limit=12 /%}
```

collection does the query; a purpose-built **item-renderer rune** (`product-card`, `article-card`, `character-card`) renders each entity. Reach for this when the card is reused across pages, needs real logic (iterating a sub-array of variants/tags — which the body template can't do), carries interactivity/behaviors, or wants its own tests. The item rune is reusable standalone (to feature one entity) and as collection's `item=` target. See *Item-renderer contract* for the `$item` surface it receives.

Both 3 and 4 run through the same parse+transform (`embedConfig`) path with `$item` bound; the difference is *where the per-item markup lives* — inline in the body (declarative, flexible, no loops) vs. in a named rune (encapsulated, reusable, full logic). This is the same config-vs-component duality as SPEC-069's `entityRoutes` vs `contributePages`.

**The query engine / renderer split is the core of the design:** collection owns the query; the per-item markup comes from a built-in layout (generic), a body template (inline), or a named rune (reusable). It's the same split that lets `{% backlog %}` and `{% blog %}` become presets (see *Relationship to existing runes*).

### Per-item template mechanism (level 3)

The body-template form hinges on one fact about the pipeline and one novel step:

**Variables resolve at transform time, not parse time.** `Markdoc.parse("{% $item.title %}")` produces an *unresolved* `Variable` AST node; it only becomes a value when `Markdoc.transform(ast, config)` looks it up in `config.variables`. A content-model rune receives its body as raw AST and *chooses when to transform it*. So collection simply **does not transform its body** in the schema — leaving the `$item` Variable nodes unresolved — then transforms it later, once per entity, with `$item` bound:

```
schema:      Markdoc.format(resolved.body)  →  markdoc source string  →  stash in the placeholder
postProcess: per entity → Markdoc.parse(stashed) → transform(ast, { …embedConfig, variables: { item: entity } })
```

`Markdoc.format` round-trips the AST back to source (`{% $item.title %}` stays `{% $item.title %}`, *not* resolved), so a plain string crosses the serialization boundary and postProcess re-parses + transforms it per entity. Parse-once-cache + transform-per-item handles efficiency.

**The one genuinely novel step — flag it as "prototype first".** "Capture a rune's *own* body un-transformed and defer it to postProcess" has no direct precedent in refrakt: expand pulls content from an *external file* (not its own body); backlog/blog have no body to preserve; existing content-model runes transform their body immediately. So the `format → stash → reparse` capture-and-carry is the load-bearing unknown. The risk is *not* "variables resolve too early" (they won't, if the schema doesn't transform) — it's the mechanical capture. **This should be prototyped before the body-template form is committed as load-bearing.** If capture proves awkward, the `item=` named-rune form (level 4) still delivers domain rendering, so the spec degrades gracefully to "named runes only" without it.

**The one constraint — no loops.** Markdoc has conditionals (`{% if %}`) but no native loop. collection iterating *entities* is fine (collection does that). But iterating an *array field within one item* — each variant of a product, each tag as a separate element — can't be expressed in a body template. That's the line: flat composition → body template; per-item iteration/logic → `item=` named rune.

### Built-in layouts (the level-2 path)

| Layout | Renders | Field use |
|--------|---------|-----------|
| `list` | compact title (+ optional one-line description), each a link | title only |
| `cards` | a card per entity, generic chrome | optional projected fields |
| `grid` | card grid | optional projected fields |
| `table` | one row per entity, columns from `fields` | required |

These are the *generic* presentations. For deliberate domain cards, use `item=` (level 3) — the built-in `cards`/`grid` are intentionally plain so they don't masquerade as a designed gallery. An item is never rendered via full `{% expand %}` by default (too heavy for a list, many entities aren't embeddable).

### Filtering — field matching, not a folder axis

The `filter` grammar matches entity fields, and "folder membership" falls out of it rather than being a special concept. A `page` entity already carries its URL (`sourceUrl` / `data.url`); a blog folder is just a URL prefix. So:

- **Exact:** `status:ready` — field equals value.
- **Prefix / glob:** `url:/blog/*` — field starts with / matches a glob. This is how `{% blog folder="/blog" %}` reduces to a collection query: `filter="url:/blog/*"`.
- **Regex (future):** `url:~^/blog/[^/]+/$` — full pattern match, if prefix/glob proves insufficient.

Same-field clauses OR (`status:ready status:review`); different fields AND. Membership in array fields (`tags`) tests inclusion. Keeping folder as "a `url` prefix match" rather than a dedicated axis means collection's query model stays one thing — *match fields* — and any entity with a URL (pages, contributed entities) participates uniformly. This is the generalization that lets a single query engine back both `backlog` (type + field match) and `blog` (url prefix match).

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

Data attributes: `data-rune="collection"`, `data-type`, `data-layout` on the wrapper; `data-entity-id` per item; `data-field` per projected field; `data-group` on group containers. When `item=` is set, each item is the item-renderer rune's own output (`.rf-product-card`, etc.) instead of a built-in `.rf-collection__card`/`__row`; the wrapper carries `data-item="product-card"` so themes/tooling can see the delegation.

-----

## Item-renderer contract

For `{% collection item="x-card" %}` to delegate per-item rendering, every item-renderer rune shares a uniform input contract — "given one entity, render it". This is the new design artifact the `item=` mechanism forces into existence, and specifying it is what makes card runes composable rather than each inventing its own surface.

An item-renderer rune:

- **Receives the entity via the `$item` variable.** `$item.id`, `$item.type`, `$item.data.*` (title, price, tags, …), and `$item.url` (the resolved on-site/canonical URL via the standard xref chain). Same shape collection would project into a built-in card, but the rune decides the markup.
- **Is a normal rune otherwise.** It has a schema, an engine config entry (BEM block), CSS. It renders one entity's worth of output (typically an `<article>`/`<a>` card). Nothing about it is collection-specific — which is why it's reusable standalone.
- **Used standalone** by passing an entity id: `{% product-card "SKU-123" /%}` resolves that one entity and renders the same card. (Standalone form resolves the id through the registry the way `{% ref %}` / `{% expand %}` do; the collection form hands the entity in directly.)

So an item-renderer is "a rune whose content is one registry entity". `product-card`, `article-card`, `work-card`, `character-card`, `event-card` all fit this shape. The contract is small (entity in → card out) but uniform, so collection can delegate to any of them without knowing the type.

Mechanically, collection's resolver transforms each item-renderer invocation through the same `embedConfig` transform path expand uses (SPEC-069) — it emits an `item` rune node per entity with `$item` bound, and transforms it. No new transform machinery; it reuses expand's.

-----

## Resolution

Like backlog, `collection` is a sentinel rune: the schema emits a placeholder with the attributes as meta tags; a postProcess pass resolves it against the registry.

1. **Collect** — registry entities of the requested `type`(s).
2. **Filter** — apply field-match clauses (exact / prefix-glob / future regex) against entity fields including `url`.
3. **Sort** — by `sort` field (string / number / date inferred from value).
4. **Limit** — slice post-sort, pre-group.
5. **Group** — partition by `group` field if set.
6. **Render** — one of three paths, all binding `$item` and transforming via the `embedConfig` path:
   - built-in `layout` (project `fields`) — generic data;
   - **body template** — the stashed body source re-parsed + transformed per entity with `$item` bound (see *Per-item template mechanism*);
   - `item=` — the named item-renderer rune transformed per entity with `$item` bound.

   A collection with a body uses the body-template path; with `item=` set, the named-rune path; with neither, the built-in layout. (`item=` and a body together is a conflict — error, naming both.) Each item's title/link resolves to the entity's URL via the standard xref chain (`sourceUrl` → `data.url` → patterns → text fallback).

The resolver is shared, type-agnostic core code. It lives wherever the cross-page registry-consuming runes live (alongside the xref / expand resolvers in `@refrakt-md/runes`), so it sees the fully-populated registry — including externally-contributed entities (SPEC-069) and plan entities (SPEC-064) — uniformly.

-----

## Relationship to existing runes

Once `collection` + the item-renderer contract exist, the existing listers are revealed to be **special cases of "query engine + item card"**. They stay as convenience wrappers (back-compat + nice defaults), but the powerful form is `collection item="…"`:

- **`{% backlog %}`** (`@refrakt-md/plan`) ≈ `collection type="work,bug" item="work-card"` with plan defaults. Reduces *almost* cleanly: the query (filter/sort/group/limit) and the per-item card (`work-card` rendering status/priority/severity badges) both fit the model. The residual that *doesn't* fully reduce is backlog's **aggregations** — milestone auto-backlog, checklist-progress roll-ups across items — which compute derived values, not just query+render. Those stay as wrapper-local logic. So backlog becomes "collection for the listing + a little bespoke aggregation glue", not a 100% preset. Honest about the 10%.
- **`{% blog %}`** (core) ≈ `collection type="page" item="article-card" filter="url:/blog/*" sort="date-desc"`. The "folder" concept dissolves into a `url` prefix match (see *Filtering*) — pages already carry their URL, so blog is just a collection query over `page` entities. `article-card` is the per-item renderer. The draft-exclusion and frontmatter-sort behaviors map onto field filters/sorts. This reduces more cleanly than backlog (no aggregations).
- **`{% datatable %}`** (core) — renders an *authored* markdown table with client-side interactivity. `collection layout="table"` renders a table from *registry data*. Different inputs (authored vs. queried); a future enhancement could let a collection table opt into datatable's client behaviors.
- **`{% ref %}` / `{% expand %}`** — the singular members of the same family; `collection` is the plural one. An item-renderer rune is the third leg: "one entity → a card", reusable standalone or as collection's `item=`.

### Sequencing — don't couple the refactor to the launch

The blog/backlog reduction is a *behavior-preserving refactor of shipped runes* — existing tests, theme CSS, and structure contracts could shift subtly. Decouple it from collection's launch:

1. Ship `collection` with first-class `item=` + the item-renderer contract.
2. Build the first card runes (`article-card` in core; `product-card` etc. in plugins) and prove the delegation path.
3. Refactor `blog` / `backlog` to delegate as a *later, separate* change, diffing output for regressions, keeping the wrapper syntax 100% back-compatible.

Launching a new primitive shouldn't be gated on re-plumbing two existing ones.

-----

## Engine Changes

- New rune schema `packages/runes/src/tags/collection.ts` — sentinel emitter (placeholder + attribute meta tags), following the backlog pattern.
- New resolver `packages/runes/src/collection-resolve.ts` (or fold into the existing registry-consumer resolver module) — generic field-match/sort/group/limit over `registry.getAll(type)`, with three render paths: built-in layout (project `fields`), body template, or `item=` delegation. Shares the filter-parse + sort helpers with backlog rather than duplicating them; those helpers move to a shared location if they currently live inside the plan plugin. The body-template and `item=` paths both reuse expand's `embedConfig` transform with `$item` bound per entity.
- **Body-template capture** — the schema must hold its body *un-transformed* (don't call `Markdoc.transform` on it) and stash it as source (`Markdoc.format(resolved.body)` → string in the placeholder); postProcess re-parses + transforms it per entity with `$item` bound. This "capture a rune's own body and defer it" pattern is **novel** (no current refrakt rune does it) — prototype it first; it's the load-bearing unknown for the body-template form.
- **`$item` variable contract** — bound into `config.variables` for the body-template and `item=` paths. Fields: `$item.id`, `$item.type`, `$item.data.*`, `$item.url` (resolved via xref chain). Same exposure idea as `entityRoutes`' `$entity`, bound at transform time.
- **Item-renderer contract** — a documented convention (not new machinery): a rune that takes one entity via `$item` and renders a card. Schema + engine-config + CSS like any rune; usable standalone (`{% product-card "id" /%}`) or as collection's `item=`. The first core card rune (`article-card`) ships alongside collection as the reference implementation.
- `corePipelineHooks.postProcess` gains a collection-resolution step (after expand + xref so item links resolve through the same chain).
- `Collection` engine config entry in `packages/runes/src/config.ts` (`block: 'collection'`, layout modifier from meta).
- Filter grammar extension — exact + prefix/glob matching (regex deferred) so `url:/blog/*` expresses folder membership. Shared with backlog's filter parser.
- CSS `packages/lumina/styles/runes/collection.css` — the built-in layouts (list/cards/grid/table) + grouping + field projection. Card-rune CSS lives with each card rune.
- `@refrakt-md/plan` — `{% backlog %}` refactor to delegate is a *separate, later* change (see *Sequencing*); not required for collection to ship.

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
- [ ] `filter` applies field-match clauses (AND across fields, OR within) against entity fields including `url`
- [ ] `filter` supports exact (`status:ready`) and prefix/glob (`url:/blog/*`) matching; folder membership expresses as a `url` prefix match with no special folder axis
- [ ] `sort` orders by a `data` field; string / number / date ordering inferred from the value
- [ ] `limit` caps the rendered count post-sort, pre-group (degenerate values treated as unset, matching backlog's defensive parse)
- [ ] `group` partitions into sections by a `data` field
- [ ] **Body template**: a collection with a body renders that body once per entity with `$item` bound (`$item.id`, `$item.type`, `$item.data.*`, `$item.url`); `{% $item.data.x %}` and `{% if $item.data.x %}` resolve per entity
- [ ] Body-template capture holds the body un-transformed (variables not pre-resolved) and defers it to postProcess — verified by a prototype before this form is relied on
- [ ] **`item=` delegates** per-item rendering to the named rune, transformed with `$item` bound via the `embedConfig` path
- [ ] `item=` together with a body is a build error naming both
- [ ] When `item=` is set, `layout` / `fields` are ignored and each item is the item-renderer's own output; the wrapper carries `data-item`
- [ ] Item-renderer runes receive the entity via `$item` and work standalone (`{% x-card "id" /%}`) as well as via `item=`
- [ ] Built-in `layout` (no `item=`) supports `list` (default), `cards`, `grid`, `table`
- [ ] `fields` projects named `data` fields; required for `table`, optional for `cards`/`grid`, ignored by `list` and when `item=` is set
- [ ] Output carries `data-rune="collection"`, `data-type`, `data-layout` (or `data-item`); items carry `data-entity-id`; projected fields carry `data-field`
- [ ] Resolution runs in postProcess after expand + xref so item links resolve through the same chain
- [ ] Works for plan entities, externally-contributed entities (SPEC-069), and any plugin-registered type — no type-specific code in the resolver
- [ ] Lumina ships CSS for the built-in layouts + grouping + field projection; the reference `article-card` ships with its own CSS
- [ ] `refrakt inspect collection` shows the expected HTML
- [ ] CSS coverage tests pass for `.rf-collection*`
- [ ] Empty result (no matching entities) renders a stable empty state, not a broken/blank section
- [ ] Authoring docs cover the rune, the display levels (zero-config → built-in layouts → `item=` delegation), the item-renderer contract, the relationship to `backlog` / `blog` / `datatable`, and the registry-driven "no manual list maintenance" model

-----

## Out of Scope

- **Raw `{name}` string substitution for the body template.** The body template is in scope (level 3) but implemented via Markdoc `$item` *variables* (parse-once, bind-per-item, injection-safe), not by string-splicing field values into source before parsing. The string-substitution form is explicitly *not* how it works — it re-parses per item and risks injection when a field value contains markdoc syntax.
- **Loops inside a body template.** Markdoc has `{% if %}` but no native loop, so iterating an array field within a single item (variants, per-tag elements) isn't expressible in a body template. That case uses the `item=` named rune. Not a gap to fix — the line between the two forms.
- **Client-side interactivity** (sortable columns, live filtering). `collection` is build-time static. A future enhancement could bridge a `table`-layout collection into `{% datatable %}`'s client behaviors, but that's its own design.
- **Pagination UI** (page 1 / 2 / 3 of a large collection). `limit` caps the set; rendering N pages of navigation is a separate concern. Large collections either cap or render fully.
- **Cross-site collections** in a monorepo. Each site queries its own registry.
- **Joins / computed columns across entity types.** A `collection` lists one logical set; combining fields from related entities (the linked-record / rollup case) is a richer query than this rune takes on. Relations surface as links (via the entity's resolved URL), not as joined columns.
- **Backlog removal.** `{% backlog %}` stays as the plan-flavored preset; this spec doesn't deprecate it, only positions `collection` as the general primitive it could delegate to.

-----

## Open Questions

**Prototype the body-template capture before committing to it.** The body-template form (level 3) depends on "capture the rune's own body un-transformed, stash as source via `Markdoc.format`, re-parse + transform per entity with `$item` bound" — a pattern no current refrakt rune uses. Before speccing it as load-bearing, build a throwaway prototype that confirms: (a) the schema can hold its body without the outer transform pass resolving its variables; (b) `Markdoc.format(body)` round-trips `$item` references as source, not resolved values; (c) re-transforming the same parsed template N times with different `variables.item` produces N independent renderables (no shared node mutation). If any of those proves awkward, the `item=` named-rune form (level 4) still delivers domain rendering, so the spec degrades to "named runes only" without the body template — the build sequence should validate the prototype first and treat the body-template form as contingent on it.

**Should `backlog` be refactored to delegate to the collection resolver in the same milestone, or later?** Refactoring shares the filter/sort/group/limit logic and removes duplication, but it's a behavior-preserving change to a shipped rune with its own tests. Recommend: ship `collection` standalone first (sharing the *helper* functions, not the whole resolver), refactor backlog to fully delegate in a follow-up once collection's resolver has proven out. Avoids coupling a new rune's launch to a refactor of an existing one.

**How does `sort` infer type (string vs number vs date)?** Entity `data` values are untyped at the registry boundary. Options: sniff the value (numeric string → number sort; ISO-date-shaped → date sort; else lexical), or add a `sortType` attribute. Recommend sniffing for v1 with `sortType` as a future override — matches the "zero-config works" principle.

**What's the empty-state contract?** A `collection` that matches nothing should render *something* stable (an empty container with a class themes can style, or an optional `empty=` message attribute) rather than a blank gap. Recommend an empty container with `data-empty` so themes decide; revisit an `empty=` message attribute if authors want inline copy.

**Should `fields` support dotted paths** (`author.name` for nested `data`)? Entity `data` can be nested. Tempting, but adds projection complexity. Recommend flat fields for v1 in the built-in layouts; nested access is available anyway through `item=` (the renderer rune has full `$item` access).

**What exactly is the item-renderer's `$item` shape, and is it stable enough to be a public contract?** `item=` makes the `$item` surface (`id`, `type`, `data.*`, `url`) a contract every card rune depends on. Need to pin it precisely — which fields are guaranteed vs. type-specific (`data.*` is open-ended), how `url` resolves when an entity has neither `sourceUrl` nor a matching pattern (empty? omit the link?), and whether `$item` is frozen/read-only. This is the one genuinely new contract the spec introduces; worth nailing before card runes proliferate against it.

**Should the standalone form of a card rune (`{% product-card "id" /%}`) live in this spec or the card rune's own?** collection defines the `item=` *delegation*; the standalone form is the card rune's own surface. Recommend: this spec defines the `$item` contract and the delegation mechanism; each card rune's spec/docs defines its standalone syntax. Keeps collection from owning every card rune's API.

**Should `collection` default `layout` differ by entity type?** A `character` might want cards; a `product` a gallery via `item=`. Tempting to let plugins declare a preferred default (layout *or* item rune) per type, so `{% collection type="product" /%}` "just works" with the commerce card. Recommend no for v1 — explicit `item=`/`layout` keeps the rune predictable; per-type defaults are a plugin-config concern that can come later (and would pair naturally with SPEC-069's entity registration — a plugin could register a "default card rune" alongside its entity type).

**Does `collection` participate in `data-outline-scope`** (SPEC-066)? Its items are links/cards/rows, not headings, so it doesn't introduce outline entries — no interaction expected. Confirm there's no heading leakage from card titles, including from `item=` card runes (titles should be links/spans, not `<hN>`).

-----

## References

- {% ref "SPEC-066" /%} — expand rune (the singular content member; collection is the plural one)
- {% ref "SPEC-065" /%} — configurable xref resolution (item links use the same chain; same `field:value` filter syntax)
- {% ref "SPEC-069" /%} — plugin-contributed routes (external entities collection lists; the source that made collection non-optional for tabular data)
- {% ref "SPEC-064" /%} — plan plugin registration (plan entities collection can list)
- `plugins/plan/src/tags/backlog.ts` + `plugins/plan/src/pipeline.ts` — the plan-specific lister collection generalizes; source of the shared filter/sort/group/limit helpers
- `packages/runes/src/xref-resolve.ts` — the resolver pattern collection follows

{% /spec %}
