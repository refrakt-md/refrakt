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
| `filter` | string | — | Space-separated `field:value` clauses. Supports exact, glob, and regex matching — so "folder membership" is just a `url` prefix match, not a special axis (see *Field-match grammar*). Same-field clauses OR; different fields AND. |
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

The body-template form hinges on one fact about the pipeline and one pre-transform capture step.

**Variables resolve at transform time, not parse time.** `Markdoc.parse("{% $item.title %}")` produces an *unresolved* `Variable` AST node; it becomes a value only when `Markdoc.transform(ast, config)` looks it up in `config.variables`. The body template exploits this: parse the template once, transform it once per entity with `$item` bound.

**The capture must happen *before* the page transform — not in the schema** (confirmed by prototype; see the resolved open question). The intuitive approach — "the schema receives its body as raw AST and stashes it via `Markdoc.format(resolved.body)`" — **does not work**: by the time a rune's `transform` runs, Markdoc has already walked the body and resolved its inline `$item` interpolations to `undefined` (because `$item` isn't bound during the page transform). The source is gone at that point — `Markdoc.format` on the body throws (`undefined.replace`), and re-transforming the already-walked AST per entity yields `null` for every field. So capture must operate on **pristine, pre-resolution** nodes:

```
loader (pre-transform):   walk parsed AST → for each deferBody rune,
                          Markdoc.format(its children) → source string,
                          stash on an attribute, then EMPTY the body
                          (so the page transform never resolves $item)
schema transform:         read the stashed source → emit it in the sentinel
postProcess (per entity): Markdoc.parse(stashed) → transform(ast, { …embedConfig, variables: { item: entity } })
```

`Markdoc.format` round-trips pristine AST back to source (`{% $item.title %}` stays `{% $item.title %}`, *not* resolved), so a plain string crosses the serialization boundary and postProcess re-parses + transforms it per entity. **The reparse is mandatory, not an optimization** — reusing the captured AST nodes (skipping `format` → `parse`) resolves every variable to `null`; only a fresh parse-per-entity binds `$item` correctly. Parse-once-cache + transform-per-item handles efficiency. A card rune invoked inside the template transforms normally as part of that per-entity pass, reading `$item` from the same bound variables.

**Two small core additions this requires.** (1) A `deferBody` flag on the rune's catalog entry, so the loader knows which runes' bodies to capture-and-clear before the page transform (there's no `preprocess` plugin hook today). (2) The pre-transform capture pass itself in the content loader. Neither is large, but both are more than "do it inside the schema" — they are the real cost of the inline form, and it's in scope. **The `item-template` partial form needs none of this**: a partial is loaded from a file as source, never enters the page transform, so there's nothing to capture — parse it, transform per entity. Inline and partial converge at postProcess (both become "a source string, transformed per entity with `$item` bound"); they differ only in where the source comes from. So if the inline path ever proves too invasive, partial-template + card runes still delivers custom rendering with no novel mechanism — the fallback is intact, not the plan.

**The constraint — no loops in templates.** Markdoc has conditionals (`{% if %}`) but no native loop, *by design* (it's a content language; iteration is a developer concern expressed as a tag). collection iterating *entities* is fine — that's collection's resolver code, not template syntax. But iterating an *array field within one item* — each variant of a product, each tag as a separate element — can't be expressed in a template. That case is exactly what a card **rune** is for: its transform iterates freely. So the line is principled, not a limitation: flat composition → template; per-item iteration/logic/interactivity/structured-data → a card rune (invoked in the template).

### Built-in layouts (the level-2 path)

| Layout | Renders | Field use |
|--------|---------|-----------|
| `list` | compact title (+ optional one-line description), each a link | title only |
| `cards` | a card per entity, generic chrome | optional projected fields |
| `grid` | card grid | optional projected fields |
| `table` | one row per entity, columns from `fields` | required |

These are the *generic* presentations. For deliberate domain cards, use a body template that invokes a card rune (level 3) — the built-in `cards`/`grid` are intentionally plain so they don't masquerade as a designed gallery. An item is never rendered via full `{% expand %}` by default (too heavy for a list, many entities aren't embeddable).

### Field-match grammar (canonical)

This is the **single source of truth** for the `field:value` selector used by `collection`'s `filter`, `entityRoutes`' `filter` (SPEC-069), and `backlog`. One parser, one set of semantics; `plugins/plan/src/filter.ts` folds into it. SPEC-069 references this section rather than restating it.

**Syntax.**
```
filter   := clause (WS clause)*
clause   := field ":" value          // split on the FIRST colon
field    := [^:\s]+
value    := bareword | '"' .* '"'     // double-quotes allow spaces
```
- Split each clause on its **first** colon, so values may contain colons (`time:12:30`, `url:/a:b`).
- **Double-quoted values** carry spaces: `title:"Getting Started"`. Without quotes, whitespace separates clauses.
- A token with **no colon**, or an **empty field**, is ignored with a **build warning** (diagnosable typo, not a silent drop).
- Empty filter → matches everything.

**The operator is selected by the value's shape** (no separate operator field — this is what lets the same string work in a markdoc attribute *and* a JSON config value):
- **Exact** (default): `status:ready` → field equals value.
- **Glob**: a value containing `*` → `*` matches any run of characters, **anchored full-match** (`url:/blog/*` ⇒ `^/blog/.*$`). Covers prefix (`/blog/*`), suffix (`*/draft`), infix. `?` is not supported in v1.
- **Regex**: a value wrapped in slashes → `id:/^SPEC-\d+$/`, optional trailing flags (`/.../i`). Not auto-anchored — the author controls `^`/`$`. (Build-time, author-authored config; ReDoS is a self-inflicted footgun, not an attack surface.)

**Field resolution** — one helper across all consumers: look up **top-level first** (`id`, `type`, `sourceFile`), then **`data[field]`**. The alias **`url` resolves to `sourceUrl ?? data.url ?? ''`** (consistent with the xref chain). This is what makes `url:/blog/*` work — pages and contributed entities carry their URL, so folder membership is just a `url` prefix match, not a special axis.

**Array fields** — if a resolved value is an array (or the registry's comma-joined string, e.g. `tags`), a clause matches if **any element** matches it (exact / glob / regex). No field is hard-coded; membership follows from the value being array-like.

**Combination & matching.**
- Same field repeated → **OR** (`status:ready status:review`).
- Different fields → **AND**.
- Matching is **case-sensitive** for all operators (predictable for URLs and IDs).
- Unknown field → resolves to `''`, no warning (fields are open-ended via `data`).

**Reserved, deferred to a fast-follow:** **negation** (`status:!done`) — useful but it breaks the clean "same-field = OR" rule (negated same-field clauses want AND), so v1 reserves the leading `!` syntax without implementing it; and **range/comparison operators** (`date:>2024-01-01`) — no current value starts with `>`, so adding them later is non-breaking. Keeping folder as "a `url` prefix match" rather than a dedicated axis means the query model stays one thing — *match fields* — and any entity with a URL participates uniformly, which is what lets a single engine back both `backlog` (type + field match) and `blog` (url prefix match).

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

**`$item` is a bound variable, not a rune ABI.** Before transforming the body template for each entity, collection binds `$item` into `config.variables` — like `$page` / `$file`. It is a **read-only projection** of the matched `EntityRegistration` (`{ id, type, sourceUrl, data }`), with this **canonical field shape** — the same shape `entityRoutes` (SPEC-069) binds, so a template ports between the two:

- **`$item.id`** — string, always present.
- **`$item.type`** — string, always present.
- **`$item.url`** — string, always present; resolved via the xref chain (`sourceUrl ?? data.url ?? ''`) — the *same* resolution the field-match grammar's `url` alias uses. **Empty string**, never `undefined`, when the entity has no on-site URL, so `href=$item.url` is always a safe string. Whether to omit a link on an empty URL is the *template's* call, not the variable's.
- **`$item.data`** — the entity's open-ended payload object. Type-specific fields live here and are accessed explicitly: `$item.data.title`, `$item.data.price`, `$item.data.tags`. A missing field is `undefined` and renders nothing — **no warning** (ordinary Markdoc variable access; distinct from `entityRoutes`' `{name}` *placeholder* substitution, which does warn).

**No field hoisting** — payload fields are *only* under `.data`, never flattened onto `$item.<field>`. Deliberate: hoisting would silently shadow any payload field colliding with a guaranteed name (a product's `data.type` of "physical/digital" masked by the entity `type` `"product"`), so the strict `.data` namespace stays predictable and collision-free. The cost is a small, intentional asymmetry with the *filter* grammar — `filter="status:ready"` matches a bare field name (a flat query string that can't express nesting), while the template writes `$item.data.status` (structured object access). Different surfaces, different jobs.

`$item` is **read-only**; templates read it, never mutate it. Values are whatever the registering plugin stored — scalars interpolate directly; arrays/objects can't be iterated in a template (that's the card-rune boundary, below). Nothing about `$item` is a contract any rune must implement; it's just data in scope for the template.

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
2. **Filter** — apply field-match clauses (exact / glob / regex) against entity fields including `url` (see *Field-match grammar*).
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
- **`{% blog %}`** (core) ≈ `{% collection type="page" filter="url:/blog/*" sort="date-desc" %}{% article-card /%}{% /collection %}`. The "folder" concept dissolves into a `url` prefix match (see *Field-match grammar*) — pages already carry their URL, so blog is just a collection query over `page` entities, with `article-card` as the card rune. The draft-exclusion and frontmatter-sort behaviors map onto field filters/sorts. Reduces more cleanly than backlog (no aggregations).
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
- New resolver `packages/runes/src/collection-resolve.ts` (or fold into the existing registry-consumer resolver module) — generic field-match/sort/group/limit over `registry.getAll(type)`, with two render paths: built-in layout (project `fields`) or body template. Uses the **shared field-match parser** defined in *Field-match grammar* — *the same parser* that `entityRoutes` (SPEC-069) and `backlog` use, not a duplicate. The string-grammar form is what lets one parser serve both a markdoc attribute (`filter=` here) and a JSON config field (`entityRoutes`' `filter`); `plugins/plan/src/filter.ts` folds into it (gaining glob/regex, `url` resolution, and case-consistency), moving to a shared location in `@refrakt-md/runes`. The body-template path reuses expand's `embedConfig` transform with `$item` bound per entity.
- **Body-template capture (inline)** — capture happens in a **pre-transform pass in the content loader**, *not* in the schema (prototype-confirmed: by schema-transform time Markdoc has already resolved the body's `$item` to `undefined`, so the source is unrecoverable there). The loader walks the parsed AST, and for each rune flagged `deferBody`, formats its children to a source string (`Markdoc.format` on pristine nodes), stashes it on an attribute, and **empties the body** so the page transform never resolves `$item`. The schema reads the stashed source and emits it in the sentinel; postProcess does `Markdoc.parse(stashed)` → transform per entity with `$item` bound. **Reparse is required** — reusing the captured AST resolves variables to `null`. Two small core additions: a `deferBody` catalog flag, and the loader capture pass (no `preprocess` plugin hook exists today). The `item-template` partial form needs none of this (source loaded from a file), so custom rendering degrades gracefully to partial-only if the inline pass is ever dropped.
- **`item-template` partial loading** — resolve the partial via the existing partial + file-roots machinery; transform it per entity with `$item` bound. No capture step. This is the same inline-vs-partial split SPEC-069 uses for its page templates (inline `render` vs `render-template` partial); both specs share the "a markdoc template, transformed per entity with the same bound variable" mechanism — `$item` in both (a collection row here, a route's entity there), so a partial authored for one context drops into the other unchanged.
- **`$item` bound variable** — bound into `config.variables` for the body-template path; the template reads it. Read-only projection of the `EntityRegistration`; field shape pinned in *The `$item` variable and card runes* (`$item.id`, `$item.type`, `$item.url` guaranteed; payload strictly under `$item.data.*`, no hoisting). A *variable* like `$page` / `$file`, not a rune ABI. `entityRoutes` (SPEC-069) binds the **same `$item`** with the same shape, so the variable is one concept across both features.
- **Card runes are plain presentational runes** — `product-card`, `article-card`, … take ordinary attributes (`title`, `price`, `href`), know nothing about `$item` or the registry, and are usable standalone (`{% product-card title="Widget" /%}`). The template wires entity fields into their attributes; an `item-template` partial holds the verbose mapping once. The first core card rune (`article-card`) ships alongside collection as the reference implementation. No `item=` attribute on collection, and no card contract for the rune to implement. (A collection-only card *may* opt to read `$item` directly for terseness, accepting coupling — not the default.)
- `corePipelineHooks.postProcess` gains a collection-resolution step (after expand + xref so item links resolve through the same chain).
- `Collection` engine config entry in `packages/runes/src/config.ts` (`block: 'collection'`, layout modifier from meta).
- Filter grammar — exact + glob + regex matching, quoted values, `url`-alias field resolution, case-sensitive, malformed-clause warnings (full definition in *Field-match grammar*). `url:/blog/*` expresses folder membership. Shared with backlog's filter parser, which folds in.
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
- [ ] `filter` supports exact (`status:ready`), glob (`url:/blog/*`), and regex (`id:/^SPEC-\d+$/`) matching, quoted values for spaces, and `url`-alias resolution; matching is case-sensitive; malformed clauses warn; folder membership expresses as a `url` prefix match with no special folder axis
- [ ] `sort` orders by a `data` field; string / number / date ordering inferred from the value
- [ ] `limit` caps the rendered count post-sort, pre-group (degenerate values treated as unset, matching backlog's defensive parse)
- [ ] `group` partitions into sections by a `data` field
- [ ] **Body template**: a collection with an inline body renders that body once per entity with `$item` bound (`$item.id`, `$item.type`, `$item.data.*`, `$item.url`); `{% $item.data.x %}` and `{% if $item.data.x %}` resolve per entity
- [ ] A body template can **invoke a card rune**, feeding it `$item` fields as attributes (`{% collection %}{% product-card title=$item.data.title href=$item.url /%}{% /collection %}`); the card transforms as part of the per-entity pass and reads nothing from `$item` itself — there is no separate `item=` attribute
- [ ] A `deferBody`-flagged rune's inline body is captured as a source string in a pre-transform loader pass and its body emptied (so the page transform never resolves `$item`); postProcess re-parses the stashed source and transforms it per entity with `$item` bound
- [ ] **`item-template` partial**: a collection with `item-template="cards:x.md"` renders that partial per entity with `$item` bound (no capture step; partial loaded from file). An inline body together with `item-template` is a build error naming both
- [ ] Card runes are plain presentational runes (ordinary attributes, no `$item`/registry knowledge); usable standalone with hand-authored attributes (`{% product-card title="Widget" /%}`) and fed by a collection template that maps `$item` fields to their attributes
- [ ] `$item` is a read-only bound variable with the pinned shape: guaranteed `$item.id` / `$item.type` / `$item.url` (string; `url` = `sourceUrl ?? data.url ?? ''`, empty not undefined); payload strictly under `$item.data.*` (no hoisting); missing `data` fields render empty with no warning — not a contract any rune implements
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

**Inline body-template capture — prototyped, resolved, inline kept in scope.** A throwaway prototype (raw Markdoc + the real `createContentModelSchema`) tested the three claims and found:

- (a) **The schema cannot hold its body un-transformed.** ❌ By the time a rune's `transform` runs, Markdoc has already resolved the body's inline `$item` interpolations to `undefined` (it isn't bound during the page transform). `Markdoc.format(resolved.body)` then throws (`undefined.replace`). Confirmed in both raw Markdoc and refrakt's wrapper. → Capture must move to a **pre-transform loader pass** on pristine nodes.
- (b) **`Markdoc.format` round-trips `$item` as source.** ✅ But only on pristine, pre-transform nodes (`{% $item.data.title %}` stays literal).
- (c) **Per-entity independence.** ✅ Via reparse — each `Markdoc.parse(stashed)` + transform with a different `variables.item` is fully isolated and correct. The shortcut of **reusing the captured AST** (skip reparse) ❌ resolves every variable to `null`, so **reparse is mandatory**, not precautionary.

Decision: **the inline form stays in v1 scope.** It costs two small core additions — a `deferBody` catalog flag and a pre-transform capture pass in the content loader (see *Per-item template mechanism* / *Engine Changes*). The `item-template` partial form remains the zero-new-mechanism path (source loaded from a file, never enters the page transform), so the graceful-degradation fallback is intact, but inline is the plan, not a contingency.

**Should `backlog` be refactored to delegate to the collection resolver in the same milestone, or later?** Refactoring shares the filter/sort/group/limit logic and removes duplication, but it's a behavior-preserving change to a shipped rune with its own tests. Recommend: ship `collection` standalone first (sharing the *helper* functions, not the whole resolver), refactor backlog to fully delegate in a follow-up once collection's resolver has proven out. Avoids coupling a new rune's launch to a refactor of an existing one.

**How does `sort` infer type (string vs number vs date)?** Entity `data` values are untyped at the registry boundary. Options: sniff the value (numeric string → number sort; ISO-date-shaped → date sort; else lexical), or add a `sortType` attribute. Recommend sniffing for v1 with `sortType` as a future override — matches the "zero-config works" principle.

**What's the empty-state contract?** A `collection` that matches nothing should render *something* stable (an empty container with a class themes can style, or an optional `empty=` message attribute) rather than a blank gap. Recommend an empty container with `data-empty` so themes decide; revisit an `empty=` message attribute if authors want inline copy.

**Should `fields` support dotted paths** (`author.name` for nested `data`)? Entity `data` can be nested. Tempting, but adds projection complexity. Recommend flat fields for v1 in the built-in layouts; nested access is available anyway in a body template (`$item.data.author.name`) or a card rune (full `$item` access).

**`$item` field shape — resolved** (see *The `$item` variable and card runes*). Guaranteed: `$item.id`, `$item.type`, `$item.url` (all strings; `url` resolves via the xref chain `sourceUrl ?? data.url ?? ''`, **empty string** when there's no on-site URL, never `undefined`). Type-specific payload is strictly under `$item.data.*` — **no hoisting**, to avoid silently shadowing a payload field that collides with a guaranteed name. `$item` is **read-only**. A missing `$item.data.*` field is `undefined` and renders nothing with **no warning** (ordinary Markdoc variable access — *not* the same as `entityRoutes`' `{name}` placeholder substitution, which warns on missing fields; `$item` interpolation and `{name}` substitution are different mechanisms and only the latter warns).

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
