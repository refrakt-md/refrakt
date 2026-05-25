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

**Query engine, not a renderer.** collection's real value is the *query* (which entities, filtered/sorted/grouped/limited). Per-item *rendering* is a separate concern with exactly two inputs: a built-in `layout` (generic field projection — right for a price table, wrong for a storefront gallery) or a **body template** (markdoc with `$item` bound, which can compose anything — including invoking a purpose-built card rune). collection never hard-codes domain card design; that lives in the template, or in a card rune the template invokes.

**Card runes are plain presentational runes — `$item` is just a bound variable.** Deliberate cards (`product-card`, `article-card`) that need loops, computed values, interactivity, or schema.org structured data are *runes with ordinary attributes* — they know nothing about `$item`, the registry, or collection. The body template wires entity fields into a card's attributes: `{% product-card title=$item.data.title price=$item.data.price href=$item.url /%}`. So `$item` is a bound *variable* (like `$page` / `$file`), not a card ABI; collection's entire render job is "bind `$item`, transform the template", and a card rune stays a self-contained component usable standalone with hand-authored data (`{% product-card title="Widget" price="$20" /%}`). The verbose field-mapping lives once in an `item-template` partial (see *Display control*), so decoupling doesn't cost verbosity in practice. There is no `item=` attribute and no card contract for the rune to implement.

**Zero-config baseline always works.** `{% collection type="character" /%}` with no other attributes renders each entity's title as a link to its resolved URL. No knowledge of the entity's fields required. Everything past that (built-in layouts, field projection, body template) is opt-in sophistication.

**Listers are query-engine + item-card; the existing ones become presets.** Once `collection` exists, `{% backlog %}` and `{% blog %}` are revealed as special cases — query + a body template invoking a domain card (`work-card` / `article-card`). They stay as convenience wrappers (back-compat + nice defaults) but the powerful, composable form is `collection` with a template. backlog reduces *almost* fully (its aggregations stay bespoke); blog reduces cleanly once "folder" is expressed as a `url` prefix filter rather than a special axis. The refactor is decoupled from collection's launch (see *Sequencing*).

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
| `item-template` | string | — | Path/name of a markdoc partial used as the per-item template (the reusable alternative to an inline body). Mutually exclusive with an inline body. |
| `layout` | `table` \| `cards` \| `list` \| `grid` | `list` | Built-in presentation for the generic-data path. Ignored when a body template (inline or `item-template`) is present. |
| `fields` | string | — | Comma-separated `data` field names to project into the built-in `layout`. Required for `table`; optional enrichment for `cards`/`grid`; ignored by `list` and when a body template is present. |

A per-item **rune** (`product-card` etc.) is not its own attribute — invoke it inside the body template: `{% collection type="product" %}{% product-card /%}{% /collection %}`. See *Display control*.

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

Projects named `data` fields into a built-in layout (table columns, labeled card rows). This is the path for **generic data** — price tables, directories, comparison matrices, reference lists — where functional-but-plain is exactly right. It is *not* the answer for a rich domain gallery (see the body template); a product catalog rendered as generic projected cards reads as bland data, not a storefront.

**3. Body template — custom rendering (`$item` bound; inline or partial).**

The single custom-render path. The rune **body is the per-item template** — real Markdoc with `$item` variable references and native `{% if %}` — rendered once per entity with `$item` bound to that entity. "An item can be anything", composed inline from the entity's fields:

```markdoc
{% collection type="product" sort="price" %}
## {% $item.data.title %}
![{% $item.data.title %}]({% $item.data.image %})
**{% $item.data.price %}** {% if $item.data.onSale %}{% badge %}Sale{% /badge %}{% /if %}
{% /collection %}
```

Because the body is just markdoc, it can **invoke any rune** — including a purpose-built card rune — and that *is* how you get a deliberate domain card. The template wires entity fields into the card's plain attributes:

```markdoc
{% collection type="product" sort="price" limit=12 %}
{% product-card title=$item.data.title price=$item.data.price image=$item.data.image href=$item.url /%}
{% /collection %}
```

`product-card` is an *ordinary presentational rune* — it takes `title` / `price` / etc. as attributes and knows nothing about `$item` or the registry, so it's equally usable standalone with hand-authored data (`{% product-card title="Widget" price="$20" /%}`). The template, not the rune, reads `$item`. And because the body is a full template, you can wrap or augment the card — follow `{% product-card … /%}` with a conditional `{% badge %}`, etc.

The explicit field mapping is verbose; the fix is to write it **once in a partial** and reuse it:

```markdoc
{% collection type="product" item-template="cards:product.md" sort="price" /%}
```

where `cards/product.md` contains the `{% product-card title=$item.data.title … /%}` mapping. Same mechanism — the source is a partial (loaded via the existing partial + file-roots machinery) instead of the inline body — so you get the decoupled pure card rune *and* a terse per-collection invocation.

So custom rendering is one concept — a per-item markdoc template — with two sources (inline body, or a partial). `$item` is a bound variable the template consumes; card *runes* are ordinary runes the template feeds attributes to. The built-in layout (level 2) remains the zero-template path for generic data.

**The query engine / renderer split is the core of the design:** collection owns the query; per-item markup comes from a built-in layout (generic) or a body template (custom), and the template composes whatever — plain markdoc, conditionals, and card-rune invocations. It's the same split that lets `{% backlog %}` and `{% blog %}` become presets (see *Relationship to existing runes*).

### Per-item template mechanism

The body-template form hinges on one fact about the pipeline and one novel step.

**Variables resolve at transform time, not parse time.** `Markdoc.parse("{% $item.title %}")` produces an *unresolved* `Variable` AST node; it only becomes a value when `Markdoc.transform(ast, config)` looks it up in `config.variables`. A content-model rune receives its body as raw AST and *chooses when to transform it*. So collection simply **does not transform its body** in the schema — leaving the `$item` Variable nodes unresolved — then transforms it later, once per entity, with `$item` bound:

```
schema:      Markdoc.format(resolved.body)  →  markdoc source string  →  stash in the placeholder
postProcess: per entity → Markdoc.parse(stashed) → transform(ast, { …embedConfig, variables: { item: entity } })
```

`Markdoc.format` round-trips the AST back to source (`{% $item.title %}` stays `{% $item.title %}`, *not* resolved), so a plain string crosses the serialization boundary and postProcess re-parses + transforms it per entity. Parse-once-cache + transform-per-item handles efficiency. A card rune invoked inside the template transforms normally as part of that per-entity pass, reading `$item` from the same bound variables.

**The novel step — and why the partial form is the safe fallback.** "Capture a rune's *own inline* body un-transformed and defer it" has no direct precedent in refrakt: expand pulls content from an *external file* (not its own body); backlog/blog have no body to preserve; existing content-model runes transform their body immediately. So the inline form's `format → stash → reparse` capture is the load-bearing unknown — **prototype it first**. Crucially, the **partial form sidesteps it entirely**: a partial is loaded from a file as source (the existing partial machinery), never went through the outer transform pass, so there's nothing to "capture" — parse it, transform per entity. So if inline capture proves awkward, the partial template (and card runes invoked within it) still delivers custom rendering with no novel mechanism. The capture risk is isolated to the inline-body convenience, not to custom rendering as a whole.

**The constraint — no loops in templates.** Markdoc has conditionals (`{% if %}`) but no native loop, *by design* (it's a content language; iteration is a developer concern expressed as a tag). collection iterating *entities* is fine — that's collection's resolver code, not template syntax. But iterating an *array field within one item* — each variant of a product, each tag as a separate element — can't be expressed in a template. That case is exactly what a card **rune** is for: its transform iterates freely. So the line is principled, not a limitation: flat composition → template; per-item iteration/logic/interactivity/structured-data → a card rune (invoked in the template).

### Built-in layouts (the level-2 path)

| Layout | Renders | Field use |
|--------|---------|-----------|
| `list` | compact title (+ optional one-line description), each a link | title only |
| `cards` | a card per entity, generic chrome | optional projected fields |
| `grid` | card grid | optional projected fields |
| `table` | one row per entity, columns from `fields` | required |

These are the *generic* presentations. For deliberate domain cards, use a body template that invokes a card rune (level 3) — the built-in `cards`/`grid` are intentionally plain so they don't masquerade as a designed gallery. An item is never rendered via full `{% expand %}` by default (too heavy for a list, many entities aren't embeddable).

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

Data attributes: `data-rune="collection"`, `data-type`, `data-layout` on the wrapper; `data-entity-id` per item; `data-field` per projected field; `data-group` on group containers. When a body template is used, each item is the template's own output (including any card-rune output like `.rf-product-card`) rather than a built-in `.rf-collection__card`/`__row`.

-----

## The `$item` variable and card runes

There is **no card-rune contract** — that's the point of this section. Two independent things, deliberately decoupled:

**`$item` is a bound variable, not a rune ABI.** Before transforming the body template for each entity, collection binds `$item` into `config.variables` — exactly like `$page`, `$file`, `$version`. Its shape:

- `$item.id`, `$item.type`
- `$item.data.*` — the entity's payload (title, price, tags, …)
- `$item.url` — the resolved on-site/canonical URL via the standard xref chain

The *template* consumes `$item` — interpolating it into text, conditionals, or the attributes of whatever rune it invokes. Nothing about `$item` is a contract any rune must implement; it's just data in scope for the template. So the only thing to pin down is the variable's *field shape* (above), a template-author-facing surface, not a rune ABI.

**Card runes are ordinary presentational runes.** A `product-card` takes plain attributes (`title`, `price`, `image`, `href`) and knows nothing about `$item`, the registry, or collection. Consequences:

- **Decoupled + reusable.** Drop a single hand-authored card anywhere (`{% product-card title="Widget" price="$20" /%}`); test it with plain attrs; distribute it as a presentational component independent of the entity machinery.
- **Full rune power.** Being a rune, it can loop, compute, carry behaviors, and emit schema.org structured data — none of which a template can — which is exactly why card runes exist alongside templates.
- **The template wires entity → card.** `{% product-card title=$item.data.title price=$item.data.price href=$item.url /%}`. Verbose inline, so write it once in an `item-template` partial and reuse it concisely. Registry resolution stays in collection/expand; the card resolves nothing.

So the seam is clean: **registry-resolving runes** (ref / expand / collection) bind/resolve entities; **presentational runes** (cards) take attributes; the body template is the wiring between them, with `$item` as the bound variable it reads.

*Optional sugar, with a coupling cost:* a card rune intended to be collection-only **may** read `$item` directly to skip the verbose attribute mapping. This re-introduces coupling to the `$item` convention, so it's a deliberate trade — fine for a rune that's never used standalone, but not the recommended default. Pure-attribute cards stay reusable; `$item`-reading cards are terser but bound to collection.

Mechanically there's no new transform machinery either way: card runes are invoked *inside* the body template, and the whole template is transformed per entity through the same `embedConfig` path expand uses (SPEC-069), with `$item` bound in the variables.

-----

## Resolution

Like backlog, `collection` is a sentinel rune: the schema emits a placeholder with the attributes as meta tags; a postProcess pass resolves it against the registry.

1. **Collect** — registry entities of the requested `type`(s).
2. **Filter** — apply field-match clauses (exact / prefix-glob / future regex) against entity fields including `url`.
3. **Sort** — by `sort` field (string / number / date inferred from value).
4. **Limit** — slice post-sort, pre-group.
5. **Group** — partition by `group` field if set.
6. **Render** — one of two paths:
   - **built-in `layout`** (project `fields`) — generic data, when there's no body template;
   - **body template** (inline body, or the `item-template` partial) — the template source re-parsed + transformed per entity with `$item` bound via the `embedConfig` path (see *Per-item template mechanism*). Any card rune the template invokes transforms as part of that per-entity pass.

   A collection with a body (or `item-template`) uses the template path; with neither, the built-in layout. (An inline body together with `item-template` is a conflict — error, naming both.) Each item's title/link resolves to the entity's URL via the standard xref chain (`sourceUrl` → `data.url` → patterns → text fallback).

The resolver is shared, type-agnostic core code. It lives wherever the cross-page registry-consuming runes live (alongside the xref / expand resolvers in `@refrakt-md/runes`), so it sees the fully-populated registry — including externally-contributed entities (SPEC-069) and plan entities (SPEC-064) — uniformly.

-----

## Relationship to existing runes

Once `collection` exists, the existing listers are revealed to be **special cases of "query engine + a body template that invokes a card rune"**. They stay as convenience wrappers (back-compat + nice defaults), but the powerful form is `collection` with a template:

- **`{% backlog %}`** (`@refrakt-md/plan`) ≈ `{% collection type="work,bug" %}{% work-card /%}{% /collection %}` with plan defaults. Reduces *almost* cleanly: the query (filter/sort/group/limit) and the per-item card (`work-card` rendering status/priority/severity badges) both fit the model. The residual that *doesn't* fully reduce is backlog's **aggregations** — milestone auto-backlog, checklist-progress roll-ups across items — which compute derived values, not just query+render. Those stay as wrapper-local logic. So backlog becomes "collection for the listing + a little bespoke aggregation glue", not a 100% preset. Honest about the 10%.
- **`{% blog %}`** (core) ≈ `{% collection type="page" filter="url:/blog/*" sort="date-desc" %}{% article-card /%}{% /collection %}`. The "folder" concept dissolves into a `url` prefix match (see *Filtering*) — pages already carry their URL, so blog is just a collection query over `page` entities, with `article-card` as the card rune. The draft-exclusion and frontmatter-sort behaviors map onto field filters/sorts. Reduces more cleanly than backlog (no aggregations).
- **`{% datatable %}`** (core) — renders an *authored* markdown table with client-side interactivity. `collection layout="table"` renders a table from *registry data*. Different inputs (authored vs. queried); a future enhancement could let a collection table opt into datatable's client behaviors.
- **`{% ref %}` / `{% expand %}`** — the singular *registry-resolving* members of the family; `collection` is the plural one. Card runes are a *different* axis — presentational components that take attributes, reusable standalone (`{% product-card title="Widget" /%}`) or fed by a collection template. The seam between the two axes is `$item` + attribute wiring.

### Sequencing — don't couple the refactor to the launch

The blog/backlog reduction is a *behavior-preserving refactor of shipped runes* — existing tests, theme CSS, and structure contracts could shift subtly. Decouple it from collection's launch:

1. Ship `collection` with the body template + the `$item` bound variable.
2. Build the first card runes (`article-card` in core; `product-card` etc. in plugins) and prove they render correctly when invoked in a collection template.
3. Refactor `blog` / `backlog` to delegate as a *later, separate* change, diffing output for regressions, keeping the wrapper syntax 100% back-compatible.

Launching a new primitive shouldn't be gated on re-plumbing two existing ones.

-----

## Engine Changes

- New rune schema `packages/runes/src/tags/collection.ts` — sentinel emitter (placeholder + attribute meta tags), following the backlog pattern.
- New resolver `packages/runes/src/collection-resolve.ts` (or fold into the existing registry-consumer resolver module) — generic field-match/sort/group/limit over `registry.getAll(type)`, with two render paths: built-in layout (project `fields`) or body template. Uses the **shared field-match parser** (exact / prefix-glob / future regex; AND across fields, OR within) — *the same parser* that `entityRoutes` (SPEC-069) and `backlog` use, not a duplicate. The string-grammar form is what lets one parser serve both a markdoc attribute (`filter=` here) and a JSON config field (`entityRoutes`' `filter`); backlog's existing parser folds into it, moving to a shared location if it currently lives inside the plan plugin. The body-template path reuses expand's `embedConfig` transform with `$item` bound per entity.
- **Body-template capture (inline)** — the schema must hold its inline body *un-transformed* (don't call `Markdoc.transform` on it) and stash it as source (`Markdoc.format(resolved.body)` → string in the placeholder); postProcess re-parses + transforms it per entity with `$item` bound. This "capture a rune's own body and defer it" pattern is **novel** (no current refrakt rune does it) — prototype it first; it's the load-bearing unknown for the *inline* form. The `item-template` partial form sidesteps it (source already loaded from a file), so custom rendering doesn't depend on the capture working.
- **`item-template` partial loading** — resolve the partial via the existing partial + file-roots machinery; transform it per entity with `$item` bound. No capture step. This is the same inline-vs-partial split SPEC-069 uses for its page templates (inline `render` vs `render-template` partial); both specs share the "a markdoc template, transformed per entity with a bound variable" mechanism — `$item` per collection row here, `$entity` per route there.
- **`$item` bound variable** — bound into `config.variables` for the body-template path; the template reads it. Fields: `$item.id`, `$item.type`, `$item.data.*`, `$item.url` (resolved via xref chain). A *variable* like `$page` / `$file`, not a rune ABI — the only thing to pin is its field shape. Same exposure idea as `entityRoutes`' `$entity`.
- **Card runes are plain presentational runes** — `product-card`, `article-card`, … take ordinary attributes (`title`, `price`, `href`), know nothing about `$item` or the registry, and are usable standalone (`{% product-card title="Widget" /%}`). The template wires entity fields into their attributes; an `item-template` partial holds the verbose mapping once. The first core card rune (`article-card`) ships alongside collection as the reference implementation. No `item=` attribute on collection, and no card contract for the rune to implement. (A collection-only card *may* opt to read `$item` directly for terseness, accepting coupling — not the default.)
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
- [ ] **Body template**: a collection with an inline body renders that body once per entity with `$item` bound (`$item.id`, `$item.type`, `$item.data.*`, `$item.url`); `{% $item.data.x %}` and `{% if $item.data.x %}` resolve per entity
- [ ] A body template can **invoke a card rune** (`{% collection %}{% product-card /%}{% /collection %}`); the card rune reads the entity from `$item` and transforms as part of the per-entity pass — there is no separate `item=` attribute
- [ ] Body-template capture holds the inline body un-transformed (variables not pre-resolved) and defers it to postProcess — verified by a prototype before the inline form is relied on
- [ ] **`item-template` partial**: a collection with `item-template="cards:x.md"` renders that partial per entity with `$item` bound (no capture step; partial loaded from file). An inline body together with `item-template` is a build error naming both
- [ ] Card runes are plain presentational runes (ordinary attributes, no `$item`/registry knowledge); usable standalone with hand-authored attributes (`{% product-card title="Widget" /%}`) and fed by a collection template that maps `$item` fields to their attributes
- [ ] `$item` is a bound variable (fields `id`, `type`, `data.*`, `url`) consumed by the template — not a contract any rune implements
- [ ] Built-in `layout` (no body template) supports `list` (default), `cards`, `grid`, `table`
- [ ] `fields` projects named `data` fields; required for `table`, optional for `cards`/`grid`, ignored by `list` and when a body template is present
- [ ] Output carries `data-rune="collection"`, `data-type`, `data-layout`; items carry `data-entity-id`; projected fields carry `data-field`
- [ ] Resolution runs in postProcess after expand + xref so item links resolve through the same chain
- [ ] Works for plan entities, externally-contributed entities (SPEC-069), and any plugin-registered type — no type-specific code in the resolver
- [ ] Lumina ships CSS for the built-in layouts + grouping + field projection; the reference `article-card` ships with its own CSS
- [ ] `refrakt inspect collection` shows the expected HTML
- [ ] CSS coverage tests pass for `.rf-collection*`
- [ ] Empty result (no matching entities) renders a stable empty state, not a broken/blank section
- [ ] Authoring docs cover the rune, the display levels (zero-config → built-in layouts → body template, incl. invoking card runes and the `item-template` partial), the `$item` variable shape, card runes as plain presentational runes (with the `$item`-reading coupling note), the relationship to `backlog` / `blog` / `datatable`, and the registry-driven "no manual list maintenance" model

-----

## Out of Scope

- **Raw `{name}` string substitution for the body template.** The body template is in scope (level 3) but implemented via Markdoc `$item` *variables* (parse-once, bind-per-item, injection-safe), not by string-splicing field values into source before parsing. The string-substitution form is explicitly *not* how it works — it re-parses per item and risks injection when a field value contains markdoc syntax.
- **Loops inside a body template.** Markdoc has `{% if %}` but no native loop, so iterating an array field within a single item (variants, per-tag elements) isn't expressible in a body template. That case uses a card *rune* (invoked in the template), whose transform iterates freely. Not a gap to fix — the principled line between template and rune.
- **Client-side interactivity** (sortable columns, live filtering). `collection` is build-time static. A future enhancement could bridge a `table`-layout collection into `{% datatable %}`'s client behaviors, but that's its own design.
- **Pagination UI** (page 1 / 2 / 3 of a large collection). `limit` caps the set; rendering N pages of navigation is a separate concern. Large collections either cap or render fully.
- **Cross-site collections** in a monorepo. Each site queries its own registry.
- **Joins / computed columns across entity types.** A `collection` lists one logical set; combining fields from related entities (the linked-record / rollup case) is a richer query than this rune takes on. Relations surface as links (via the entity's resolved URL), not as joined columns.
- **Backlog removal.** `{% backlog %}` stays as the plan-flavored preset; this spec doesn't deprecate it, only positions `collection` as the general primitive it could delegate to.

-----

## Open Questions

**Prototype the inline body-template capture before committing to it.** The *inline* body form depends on "capture the rune's own body un-transformed, stash as source via `Markdoc.format`, re-parse + transform per entity with `$item` bound" — a pattern no current refrakt rune uses. Before speccing it as load-bearing, build a throwaway prototype that confirms: (a) the schema can hold its body without the outer transform pass resolving its variables; (b) `Markdoc.format(body)` round-trips `$item` references as source, not resolved values; (c) re-transforming the same parsed template N times with different `variables.item` produces N independent renderables (no shared node mutation). If any proves awkward, the **`item-template` partial form** (source loaded from a file — no capture) still delivers custom rendering, including card-rune invocation, so the spec degrades gracefully to "partial templates + card runes" without the inline body. Validate the prototype first; treat the inline form as contingent on it.

**Should `backlog` be refactored to delegate to the collection resolver in the same milestone, or later?** Refactoring shares the filter/sort/group/limit logic and removes duplication, but it's a behavior-preserving change to a shipped rune with its own tests. Recommend: ship `collection` standalone first (sharing the *helper* functions, not the whole resolver), refactor backlog to fully delegate in a follow-up once collection's resolver has proven out. Avoids coupling a new rune's launch to a refactor of an existing one.

**How does `sort` infer type (string vs number vs date)?** Entity `data` values are untyped at the registry boundary. Options: sniff the value (numeric string → number sort; ISO-date-shaped → date sort; else lexical), or add a `sortType` attribute. Recommend sniffing for v1 with `sortType` as a future override — matches the "zero-config works" principle.

**What's the empty-state contract?** A `collection` that matches nothing should render *something* stable (an empty container with a class themes can style, or an optional `empty=` message attribute) rather than a blank gap. Recommend an empty container with `data-empty` so themes decide; revisit an `empty=` message attribute if authors want inline copy.

**Should `fields` support dotted paths** (`author.name` for nested `data`)? Entity `data` can be nested. Tempting, but adds projection complexity. Recommend flat fields for v1 in the built-in layouts; nested access is available anyway in a body template (`$item.data.author.name`) or a card rune (full `$item` access).

**Pin the `$item` variable's field shape.** Decoupling cards from `$item` shrinks this from "a rune ABI" to "the shape of a bound variable the template reads" — much smaller, but still worth nailing: which fields are guaranteed (`id`, `type`, `url`) vs. type-specific (`data.*` is open-ended); how `url` resolves when an entity has neither `sourceUrl` nor a matching pattern (empty string? omit the link?); whether `$item` is read-only. A template-author-facing surface, not something runes implement against.

**Should there be a resolve-by-id convenience for cards at all?** With cards as plain-attribute runes, "render the card for registry entity X" isn't a card-rune feature — the card takes attributes, and resolving an id to an entity is collection's / expand's job. If a one-off "feature this single registry product" need appears, the answer is a single-item collection (`{% collection type="product" filter="id:SKU-123" %}…{% /collection %}`) or `{% expand %}`, not a magic `{% product-card "id" /%}`. Recommend *not* giving cards registry-resolution; keep them purely presentational. Revisit only if the single-item-collection ergonomics prove too clunky.

**Should `collection` allow a per-type default body/card so `{% collection type="product" /%}` "just works"?** Tempting to let a plugin register a default template or card rune alongside its entity type, so the bare collection renders the commerce card without an explicit body. Recommend no for v1 — an explicit body (or layout) keeps the rune predictable; per-type defaults are a plugin-config concern that can come later (and would pair naturally with SPEC-069's entity registration — a plugin could register a "default card rune" with its type).

**Does `collection` participate in `data-outline-scope`** (SPEC-066)? Its items are links/cards/rows, not headings, so it doesn't introduce outline entries — no interaction expected. Confirm there's no heading leakage from card titles, including from card runes invoked in templates (titles should be links/spans, not `<hN>`).

-----

## References

- {% ref "SPEC-066" /%} — expand rune (the singular content member; collection is the plural one)
- {% ref "SPEC-065" /%} — configurable xref resolution (item links use the same chain; same `field:value` filter syntax)
- {% ref "SPEC-069" /%} — plugin-contributed routes (external entities collection lists; the source that made collection non-optional for tabular data)
- {% ref "SPEC-064" /%} — plan plugin registration (plan entities collection can list)
- `plugins/plan/src/tags/backlog.ts` + `plugins/plan/src/pipeline.ts` — the plan-specific lister collection generalizes; source of the shared filter/sort/group/limit helpers
- `packages/runes/src/xref-resolve.ts` — the resolver pattern collection follows

{% /spec %}
