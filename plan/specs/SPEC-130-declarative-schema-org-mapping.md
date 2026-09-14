{% spec id="SPEC-130" status="draft" tags="runes, schema-org, seo, config" %}

# Declarative schema.org mapping

Move the schema.org channel from 35 imperative call sites across 30 runes into
declarative data, keyed by `data-name` — the same shape BEM, modifiers and
`editHints` already use.

**Declared on the rune, not in theme config.** Schema.org output is what a rune
*means*, and {% ref "ADR-028" /%} settles that such facts are rune identity: a
theme may not redefine them. So the table sits beside the rune's other
self-declarations and is referenced from config, exactly as `sections` is.

```ts
// plugins/media/src/tags/playlist.ts — beside playlistSections, playlistMediaSlots
export const playlistSchema = {
  by: 'type',
  album:   { type: 'MusicAlbum',    properties: { track: 'track' },   children: { track: 'MusicRecording' } },
  podcast: { type: 'PodcastSeries', properties: { track: 'hasPart' }, children: { track: 'PodcastEpisode' } },
} as const;
```

## Problem

A rune's structured data is written by hand inside its transform:

```ts
createComponentRenderable({ rune: 'accordion', schemaOrgType: 'FAQPage',
  schema: { mainEntity: items },
  …
});
```

Four consequences:

**It is larger than the `schema:` surface suggests.** The 22 `schema:` maps are
the part that already looks like data. The rest of the channel is written
straight into the tree:

| Form | Sites | Example |
|------|-------|---------|
| `schemaOrgType:` on `createComponentRenderable` | 35 | every emitter |
| `schema:` property maps | 22 | `recipe`, `event`, `track` |
| `typeof:` on a hand-built `Tag` | 7 | `testimonial`'s `Person`, `event`'s `Place` |
| `property:` on a hand-built `Tag` | 16 | `playlist`'s `byArtist` spans |
| `node.attributes.typeof = …` / `.property = …` mutation | 8 | `recipe`'s `<li>`s, `accordion`'s `Answer` |

So roughly **a third of the channel is invisible to a survey of `schema:`**, and
all of it is the interesting third: it is where nested entities, per-item types
and computed positions are produced. A table that only replaces `schema:` would
leave the hard half imperative and the rune half-declarative — the "not half of
each" failure this spec's own acceptance criteria rule out.

**It cannot be overridden.** An accordion is a `FAQPage` on every site, in every
context, forever. Rendering a list of universal attributes as accordion items
({% ref "WORK-548" /%}) therefore publishes roughly **970 fabricated `Question`
entries** across 88 pages — plausible-looking structured data asserting
something untrue.

**It cannot be changed coherently even in principle**, because the type appears
at two levels. `accordion` declares `FAQPage` with `mainEntity`; each
`accordion-item` independently declares `Question` with `name` /
`acceptedAnswer`. Switching to `ItemList` means renaming the parent's property
*and* changing the child's type and both of its properties. An attribute on the
parent cannot reach the child's transform, so the change is not expressible
without the rune carrying a per-type table — which is what this spec proposes
making it.

**It is invisible to tooling.** `refrakt contracts` claims to describe the
complete output of the identity transform and says nothing about schema.org;
`refrakt reference` likewise. Nobody can answer "what structured data does this
page emit?" without reading transforms.

## Constraint: this cannot live in the engine

The obvious home is the identity transform engine, which already walks the tree
reading config. **It does not work**, and the reason is worth stating plainly
because it is not obvious from the architecture diagram.

`packages/content/src/site.ts` never applies the identity transform. It runs
`Markdoc.transform` and then, at line 393, `extractSeo` — and `collectJsonLd`
*derives* the JSON-LD by walking that tree for `typeof` attributes. The engine
runs later, at render time. So schema emitted by the engine would reach the HTML
and never reach the JSON-LD.

`extractSeo` is in fact earlier than "before the engine": it runs **inside the
per-page loop**, before `runPipeline` at line 453, and `page.seo` is never
recomputed from the enriched pages. So the harvest point precedes the whole
cross-page pipeline too.

The mapping is therefore **data consulted at transform time**, not engine
behaviour. `createContentModelSchema` is the place that sees every rune's own
transform — it wraps each one and already post-processes the result (the tint
and bg meta injection). 34 of the 35 emitters go through it, so schema
application is one step there rather than 35 edits.

### The one emitter it does not see

`buildAutoBreadcrumb` (`packages/runes/src/config.ts`) constructs `breadcrumb`
and `breadcrumb-item` renderables from a **`postProcess` pipeline hook**, not
from a Markdoc schema. Two things follow, and the second is a live defect
rather than a design question:

- A wrapper-based mechanism cannot reach it. Either the hook calls the same
  applier directly, or `breadcrumb auto` keeps a hand-written mapping and the
  "not half of each" criterion is already violated on day one.
- **Its structured data never reaches the JSON-LD at all today.** `postProcess`
  is phase 4; `extractSeo` ran in phase 1. `{% breadcrumb auto=true %}` renders
  a correct `BreadcrumbList` in the HTML and contributes nothing to
  `page.seo.jsonLd`. Nothing tests this — no pipeline test asserts on `seo`.

The same blind spot covers every other sentinel resolved in `postProcess`
(collection, pagination, aggregate, drawer) should any of them ever carry
schema.

That reframes the rejected alternative below. "Relocate `extractSeo`" is not
merely a larger change with no upside; it is the only option that closes the
`postProcess` hole — and, as the hidden-carrier section shows, the only one that
lets the rendered node carry the schema. Keeping the harvest where it is means
this spec ships a mechanism with a known gap, which is defensible but must be
said out loud — see the open question, and the two-point invariant that makes
the move testable.

### Selection and application split

An earlier draft of this section was called "Nothing needs threading" and
claimed the table could live wholly in `createContentModelSchema`, with
`createComponentRenderable` untouched. **That is wrong**, and the reason decides
the shape of the mechanism.

`createComponentRenderable` classifies each property `<meta>` by consulting
`schema:` *at build time*:

```ts
const isSeoMeta = n.name === 'meta' && schemaTags.has(n);
if (!isSeoMeta) n.attributes['data-field'] = toKebabCase(k);
…
if (!isSeoMeta) pureDataMetas.add(n);
…
.filter(c => !emptySeoMetas.has(c) && !pureDataMetas.has(c))
```

A property meta that is *not* named in `schema:` gets `data-field` and is
**dropped from the children**. The ones that survive do so precisely because the
rune declares them — visible in today's output:

```html
<meta content="Pink Floyd" property="byArtist" />   <!-- playlist -->
<meta content="PT15M" property="prepTime" />        <!-- recipe -->
```

So if the call sites "stop passing `schema` entirely" and the table is applied
afterwards in the wrapper, those nodes no longer exist by the time the applier
runs. There is nothing left to stamp.

This is not a corner case. It hits every schema value that is a `<meta>` also
listed in `properties` — at least **8 runes and ~16 properties**: `recipe` (3),
`event` (3), `track` (5), `playlist`, `character`, `realm`, `lore`, `howto`.
That is almost exactly the "computed metas — declarative by reference" row of
the survey, the half this spec called easy. The reference only holds while the
rune declares it at build time. (`embed` escapes because its schema metas are
not in `properties`; non-meta nodes escape because only metas are dropped.)

**The fix is the field bag, and it is simpler than it looked.** A prototype
(below) settled this. `data-rune-fields` already carries every scalar property
value, typed, on the rune root — which is exactly what a value-only schema
property needs. The applier does not need the dropped `<meta>` to survive; it
rebuilds a carrier from the bag:

```ts
const node = findByName(root, src);
if (node) { node.attributes.property = prop; return; }   // visible carrier: stamp in place
const v = bag[src];                                       // value-only: rebuild
if (v !== undefined) root.children.push(new Tag('meta', { property: prop, content: String(v) }));
```

So `createComponentRenderable` needs no knowledge of schema at all — it simply
always treats property metas as pure data, which is already what it does when
`schema:` is absent. Selection needs `attrs` and application needs the tree plus
the bag; the wrapper has all three. **Nothing is threaded into
`createComponentRenderable` after all.**

An earlier revision of this section proposed threading the resolved row down one
level, on the assumption that a dropped node was unrecoverable. It is not — the
bag *is* the recovery. Recorded because the reasoning ("the meta is gone,
therefore the applier must run where the meta still exists") is plausible and
wrong, and someone will re-derive it.

So the table is still an **option to `createContentModelSchema`**, sitting with
the rune-identity declarations already there — `sections`, `mediaSlots`,
`provides`, `base` — and the resolved row is threaded one level down:

```ts
export const playlist = createContentModelSchema({
  sections: playlistSections,
  mediaSlots: playlistMediaSlots,
  schema: playlistSchema,        // ← beside its siblings
  attributes: { … },
  transform(resolved, attrs, config) { … },
});
```

Since {% ref "ADR-028" /%} rules out merging, there is no merged view to
assemble and **no `config.variables` threading is required** — the table is a
module constant in lexical scope, and `contracts` / `reference` read it the way
they already read `sections`. The threading is one resolved row, passed one
level, not a table plumbed through the pipeline.

The 35 call sites still get *simpler*: they stop hand-writing `schemaOrgType`
and the `schema` map, and carry a single opaque value they do not construct.

The child mapping works because Markdoc transforms bottom-up. By the time the
wrapper sees `result`, the children carry their own `typeof`, so it rewrites
them — the move `stripSchemaOrg` already makes for `schema="none"`
({% ref "WORK-552" /%}).

Relocating `extractSeo` is the alternative, and it is really two alternatives
that must not be conflated: moving it after *the pipeline* and moving it after
*the engine* differ by an order of magnitude. **Decided below**: the first is
in scope, the second is ruled out.

## Ownership: the rune, not the theme

An earlier draft of this spec put the table in `ThemeConfig.runes` alongside
`block` and `structure`, and listed "a site can restate a rune's schema without
forking it" as a benefit. **That is an anti-feature**, and {% ref "ADR-028" /%}
had already decided against it:

> Attribute applicability is a property of the rune, never of the theme.
>
> Content becomes portable in fact, not just in principle. Today the same
> markdown can mean different things under different themes.
>
> Emission stays theme-agnostic, and no mechanism will be added for a theme to
> suppress it.

Schema.org is the sharpest case that reasoning covers. It is a machine-readable
public claim about what the content *is*; a theme able to change it would mean
the same markdown says different things to a search engine depending on how the
site is skinned. Styling is the theme's business — emission is not.

So `schema` follows the pattern already established for `sections`:

```ts
// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const accordionSections = { … } as const;
```

Declared on the rune, referenced from config so tooling can read it, and added
to `IDENTITY_FIELDS` in `packages/transform/src/identity-fields.ts` so no merge
path can redefine it.

**The legitimate per-site need is already served, at the right layer.** An
author who wants a different type says so in *content* — `schema="none"`,
`schema="<Type>"` — where they are making a claim about their own content. A
theme making that claim on their behalf, for every page, is the thing being
ruled out.

### Key direction: the rune's name, not the schema property

The table is keyed by the rune's own `data-name` and valued by the schema.org
property:

```ts
properties: { 'author-name': 'name', 'author-role': 'jobTitle' }
```

This is deliberate, and it is the **opposite** of the imperative `schema:` map
it replaces (`schema: { reviewBody: quoteTag }` — schema property as key). The
flip is worth stating because anyone who has read the 22 existing maps will read
the new form as backwards.

It goes this way because every declarative join table in the codebase does:

| Table | Key | Value |
|-------|-----|-------|
| `sections` | `headline` | `title` |
| `mediaSlots` | `media` | `cover` |
| `editHints` | `headline` | `inline` |
| `autoLabel` | `summary` | `summary` |
| `contextModifiers` | `parent-rune` | `suffix` |

All keyed by what the rune *has*, valued by what it *means* — which is what
{% ref "SPEC-125" /%} means by "join tables the rune declares about itself". The
imperative `schema:` map is the odd one out, and it is the one going away.

One invariant reinforces it: {% ref "ADR-008" /%} gives `properties` and `refs` a
single flat namespace with uniqueness enforced (`createComponentRenderable`
throws on a collision), so these keys are *guaranteed* unique. Schema property
names carry no such guarantee, and keying by them would forbid two sources
mapping to one property — `recipeIngredient` drawn from two places, say. Neither
multiplicity is needed today, but only one direction has the uniqueness already
enforced.

The cost is real and is accepted: curating a table ("is `PodcastEpisode` right
for `PodcastSeries`?") means scanning schema.org names, which now sit in the
value column. The mitigation is that `inspect` and `reference` render the
*resolved* table, and can order it by schema property regardless of how it was
authored — the review view need not match the authoring view.

## What the table has to express

Surveyed across all 30 emitting runes — not just the 22 `schema:` maps — they
fall into three groups, and only the middle one matches the design as sketched
above.

### Group A — a type and nothing else (7 runes)

`gallery`, `data-table`, `budget`, `itinerary`, `map`, `symbol`, `blog` declare
a `schemaOrgType` and no `schema:` map at all. What reaches the page is an empty
entity:

```json
{ "@context": "https://schema.org", "@type": "Dataset" }
{ "@context": "https://schema.org", "@type": "ItemList" }
```

Checked by running `extractSeo` directly over `gallery`, `data-table`,
`budget`, `itinerary` and `map`; `symbol` and `blog` carry no `schema:` map
either, so nothing stamps a `property` inside them. These assert a type and
describe nothing — a `Dataset` with no `name`, `description` or `distribution`; an
`ItemList` with no `itemListElement`. They are not *wrong* the way a podcast
typed as a music playlist is wrong, but they are pure noise in every consumer.

The table forces the question the imperative form let us skip: **should an
entity with no properties be emitted at all?** Proposed rule — no. A row that
resolves to a bare `@type` emits nothing, and a rune that wants an entity
declares at least one property. That deletes seven meaningless entities across
the catalog for free, and gives Group A a migration that is "write the mapping
or lose the type", which is the right forcing function.

### Group B — a flat map of named refs (14 runes)

`figure`, `embed`, `cast-member`, `character`, `realm`, `faction`, `plot`,
`lore`, `organization`, `pricing`, `tier`, `timeline-entry`, `track`,
`breadcrumb-item`. These are the clean case the original survey describes: the
values are either named refs (`nameTag`, `titleTag`, `tiers`) or computed metas
(`parsedPriceMeta`, `estimatedTimeMeta`) that already carry `data-name` /
`data-field`. **The transform computes values, the table names their schema
roles**, and nothing has to be computed by the table.

### Group C — imperative construction (9 runes)

`accordion`, `accordion-item`, `breadcrumb`, `event`, `how-to`, `playlist`,
`recipe`, `testimonial`, `timeline`. Here the schema is not a map over existing
nodes; the transform *builds* schema-bearing structure. Four distinct shapes,
none of which the table as first sketched expresses — though, as the next
section shows, what each one actually needs differs enormously:

| Shape | Where | What it does |
|-------|-------|--------------|
| **Retype + wrap** | `accordion-item`, `recipe`, `how-to` | sets `typeof` on a node it did not create and wraps its children in a `<div property="text">` / `<p property="text">` to supply the value |
| **Synthesise an entity** | `testimonial`, `event` | builds a `Person` / `Rating` / `Place` span from text pulled out of *other* tags (`authorNameTag.children.filter(…)`) or from an attribute (`attrs.location`) |
| **Index-derived values** | `breadcrumb`, `timeline` | the parent emits each child's `position` from the loop index — a value that exists nowhere in the content |
| **Inline property stamps** | `playlist` | writes `property: 'byArtist'`, `property: 'duration'` directly onto the spans it builds for each track |

### What Group C actually costs

The obvious reading is "these nodes are unaddressable, so give everything a
`data-name` first". That is the wrong diagnosis, and acting on it would be
mostly wasted work. Taken shape by shape:

**Inline property stamps — nothing missing.** `playlist`'s track spans already
carry `data-name="track-name"` / `"track-artist"` / `"track-duration"`, set on
the same line that stamps the RDFa. They are addressable today; they are simply
not *keyed* declaratively. Pure lookup once the table exists.

**Retype + wrap — a `data-name` adds nothing, and the wrapper has to stay.**
`recipe`'s `<li>`s already get `data-name = 'ingredient'` / `'step'` on the line
above the mutation, so addressing is not the obstacle. The wrapper is — and the
tempting move is to delete it by teaching `collectJsonLd` to take a typed node's
own text as a named property:

```js
// seo.ts — collectProperties
if (prop && !childTypeof) { /* extract value */ }
```

**That would break the HTML.** The rule mirrors RDFa rather than deviating from
it. RDFa Core 1.1 §7.5 step 11 resolves a property's object as: `@content` →
literal; else `@typeof` present and `@about` absent → *the typed resource*; else
a plain literal from the text. So an element carrying both `property` and
`typeof` has its object fixed to the typed resource, and its text is unreachable
as a literal. Today's output —

```html
<div typeof="Answer" property="acceptedAnswer"><div property="text">…</div></div>
```

— expresses `_:q acceptedAnswer _:a . _:a a Answer . _:a text "…"`. Without the
inner element it expresses the first two triples and says nothing about the
text. Since {% ref "SPEC-082" /%} chose to render the SEO carriers inline
("Option B" — `component.ts:108`), refrakt publishes the RDFa *and* the JSON-LD
on the same page, so the two would assert different graphs on every accordion,
recipe and how-to.

The wrapper is therefore the conformant idiom, not a workaround. What is wrong
is that runes hand-write it. Move the wrapping into the **applier** and let the
table declare only the role:

```ts
accordionItem: {
  type: 'Question',
  properties: { name: 'name' },
  entities: {
    body: { type: 'Answer', property: 'acceptedAnswer', text: 'text' },
  },
}
```

`text:` names the property that takes the node's own content; the applier emits
the conformant wrapper, the way the engine's `structure` entries already own
injected elements. That keeps the table a lookup, keeps the HTML valid, and
collapses into the `entities:` form below rather than being a fifth concept —
an `Answer` *is* a nested entity built from the body node.

Note the collector is otherwise a fair RDFa subset: `property` + `href` on an
`<a>`, `property` + `src` on an `<img>`, and `<meta property content>` all
resolve as RDFa 1.1 specifies. The one rule worth changing was the one holding
conformance up.

**The other three shapes are already conformant**, checked against `refrakt
inspect` output so the question does not get re-opened:

```html
<li typeof="MusicRecording" data-field="track" property="track">  <!-- typed resource held by a property -->
<span typeof="Person" property="author"><meta property="name" …>  <!-- same, with inner literals -->
<meta content="1" property="position" />                          <!-- plain literal -->
```

So wrapping was the only place where the imperative form was load-bearing for
the standard rather than merely habitual. The rest of Group C is imperative by
accretion, and can be moved into the table without touching what the HTML
asserts.

**Index-derived values — one keyword.** `position: 'index'`. A value that is not
in the content has to be generated, and no amount of naming helps. The
vocabulary is closed: `index` is the only generator anywhere in the codebase,
used by two runes.

**Synthesised entities — one new entry kind, and still not about naming.**
Naming the invented `<span typeof="Person">` is pointless, because under a
declarative table the applier is what creates it. What matters is whether the
*sources* are addressable, and they already are — `testimonial` has
`author-name` / `author-role` refs and a `rating` property; `event` has
`location` as a `data-field` before the `Place` span duplicates the value. So
the gap is a third kind of entry — *group these named nodes into a nested
entity*:

```ts
entities: {
  author: { type: 'Person', property: 'author',
            properties: { 'author-name': 'name', 'author-role': 'jobTitle' } },
  rating: { type: 'Rating', property: 'reviewRating',
            properties: { rating: 'ratingValue' } },
}
```

This is an extension rather than a new concept: `properties` and `refs` already
project over the same nodes twice (tier's `nameTag` is in both). `entities` is a
third projection.

**Total: one new entry kind (`entities`, carrying an optional `text`), one
keyword (`index`), no change to `collectJsonLd`, and no new `data-name`s *for
these runes* — though the prototype later found a separate set that does need
naming, cutting across all three groups.**
Group C is not the hard half of this spec; it is four small, separable
decisions, and only one of them touches the table's shape.

## Constraint: styling already selects on this channel

Surfaced while checking whether the `property="text"` wrappers were safe to
delete. Lumina selects on RDFa attributes in six places:

| Selector | State | Why |
|----------|-------|-----|
| `.rf-tier h1[property="name"]` | **live** | `nameTag` is in both `refs` and `schema` |
| `.rf-plot > span[property="name"]` | **live** | `titleTag` is in both |
| `.rf-tier p[property="price"]` | dead | `property="price"` lands on `parsedPriceMeta`, a `<meta>` — not on the `<p>` |
| `.rf-lore > span[property="title"]` | dead | the span carries `property="headline"` |
| `.rf-bond > span[property="from"]` | dead | `bond` has no `schema:` map at all |
| `.rf-bond > span[property="to"]` | dead | as above |

Confirmed against `refrakt inspect` output for each rune, and none of the four
dead rules has a BEM equivalent elsewhere in its stylesheet — so a `lore` title,
a `bond` endpoint and a `tier` price render unstyled today. The CSS coverage
test does not catch it: it checks that config-derived selectors *exist*, not
that hand-written ones *match*.

Two consequences this spec has to absorb:

- **`schema="none"` is a styling hazard.** `stripSchemaOrg` deletes `property`
  wholesale, so on `pricing` it would unstyle the tier heading. It is benign on
  `accordion` by luck rather than design, and {% ref "WORK-552" /%} has already
  shipped.
- **Any rename in the table silently restyles a rune.** Every live selector is a
  tripwire across the migration, and the four dead ones are what that tripwire
  looks like after it fires — nobody noticed either time.

So the rule this spec should establish: **presentation never selects on the
schema.org channel.** The refs already produce BEM element classes for every one
of these nodes (`.rf-tier__name`, `.rf-lore__title`), which is what the CSS
should have used. Migrating the six rules is small and half of it is a bug fix
regardless of whether this spec ships — filed as {% ref "BUG-014" /%}. Guarding
it afterwards is a one-line assertion in the CSS coverage test.

This also sharpens the ADR-028 argument. The reason a theme may not redefine
schema.org is that emission is a claim about content, not about skin. A theme
that *styles off* emission has the same coupling pointed the other way: it makes
the rune's appearance depend on its SEO channel, so a correction to the
structured data becomes a visual regression.

## Adjacent cleanup: `property: 'contentSection'`

29 runes pass `property: 'contentSection'` to `createComponentRenderable`, on the
line above their `schema:` map. **It is not the schema.org channel**, despite
sitting next to it and sharing the word: `createComponentRenderable` maps the
`property` *field* to `data-field`, kebab-cased, so what ships is

```html
<section data-field="content-section" typeof="FAQPage" class="rf-accordion" …>
```

Two different things called `property` in one call, one of which becomes
`data-field` and one of which becomes RDFa `property`. That alone is worth
fixing while every one of these call sites is open.

**Nothing reads it.** Every reference in the repo, outside the 29 declarations:

| Where | What it is |
|-------|-----------|
| `documents/page.ts` | the `Page` document node — **dead and broken** (below) |
| `transform/test/html.test.ts` | a hand-built fixture checking `$$mdtype` stripping; not pipeline output |
| `plugins/marketing/test/hero-content-model.test.ts` | asserts the attribute exists — a characterisation test of today's output |
| `site/content/extend/rune-authoring/` (4 pages) | documented as part of the output contract |

Zero hits in the engine, the Svelte renderer, the framework adapters, the
editor, behaviors, the language server, any stylesheet, or
`contracts/structures.json` — which is its own small indictment, since
`contracts` claims to describe the complete HTML structure and omits an
attribute present on every section rune on every page.

**The one consumer that ever existed is dead code, and was broken anyway.**
`Page` splits children on `c.attributes['data-field'] === 'contentSection'` —
camelCase, against an attribute that is kebab-cased at emission. It could never
have matched. It is also never registered: `documents` is exported from
`packages/runes/src/index.ts` and no Markdoc config consumes it, so the node
never runs. That is why nobody noticed the case mismatch.

Deleting `Page` has a bonus that *is* squarely this spec's business: it emits
`typeof="PageSection"` on every wrapper it makes, and `PageSection` is not a
schema.org type at all. Dead today, but it is an invented type sitting in the
codebase waiting to be revived. Its config entry (`PageSection: { block:
'page-section' }` in `coreConfig`) and `packages/lumina/styles/runes/page-section.css`
go with it — the CSS exists only because the coverage test derives it from that
config entry, a closed loop of dead code keeping itself alive.

So the removal is: the `property:` line from 29 transforms, the `Page` /
`DocPage` document nodes, the `PageSection` config entry and its CSS, the
marketing characterisation test, and four docs pages. With
`property: 'contentSection'` gone, `TransformResult.property` has exactly one
remaining user — `error.ts`, whose `data-field="error"` is equally unread — so
**the field itself can go**, taking the naming collision with it.

Not the schema.org channel, so it could ship separately. But it rides the same
call-site sweep, and removing a line from 29 files already being edited is
free. `PageSectionSlots` in `packages/types` is unrelated and stays — it types
the `eyebrow` / `headline` / `blurb` header slots.

## The driving case: `playlist`

`accordion` alone would have produced a weaker design. `playlist` is the rune
that shows what the table actually has to express, because it **already
declares what its content is** and emits the wrong schema anyway:

```ts
type: { matches: ['album', 'podcast', 'audiobook', 'series', 'mix'] }  // line 28
…
schemaOrgType: 'MusicPlaylist'                                          // line 237, unconditional
schema: { name, image, byArtist, track: trackItems }
const trackAttrs = { typeof: 'MusicRecording' };                        // line 153, unconditional
```

So `{% playlist type="podcast" %}` publishes a podcast as a music playlist whose
episodes are music recordings. Silently, on every podcast. Filed separately as
{% ref "BUG-013" /%}, since it is wrong today whenever this spec lands.

The correct mapping needs both kinds of change at once:

| `type` | schema.org | Items | Track property | Relation to `MusicPlaylist` |
|--------|-----------|-------|----------------|------------------------------|
| `album` | `MusicAlbum` | `MusicRecording` | `track` | **subtype** — safe narrowing |
| `mix` | `MusicPlaylist` | `MusicRecording` | `track` | today's emitted type, for every row |
| `podcast` | `PodcastSeries` | `PodcastEpisode` | `hasPart` | **branch switch** |
| `audiobook` | `Audiobook` | `Chapter` | `hasPart` | **branch switch** |
| `series` | `CreativeWorkSeries` | `CreativeWork` | `hasPart` | **branch switch** |

Note that even the *default* is imprecise: `album` is a `MusicAlbum`, a subtype
of `MusicPlaylist`, so the safe narrowing is already available and unused. The
attribute's own default is `album` (`attrs.type ?? 'album'`, line 98), not
`mix` — so a table keyed on `type` needs an explicit **fallback row** for the
absent case, and `by:` has to say whether it reads the attribute's default or
requires the row named by the modifier's own `default`.

### Consequence: schema keys off a modifier, not a new attribute

`type` and a `schema` attribute would be the same fact stated twice, and an
author who disagreed with themselves would get no warning. So the mapping keys
off the modifier the rune already has:

```ts
Playlist: {
  schema: {
    by: 'type',
    album:   { type: 'MusicAlbum',    properties: { track: 'track' },   children: { track: 'MusicRecording' } },
    podcast: { type: 'PodcastSeries', properties: { track: 'hasPart' }, children: { track: 'PodcastEpisode' } },
    …
  },
}
```

`by` names an existing entry in the rune's `modifiers` — itself an identity
field under {% ref "ADR-028" /%} — so this reuses the mechanism that already
drives BEM modifiers and data attributes rather than inventing a parallel one.

One wrinkle to settle: *modifiers live in config, and the row is picked in the
wrapper from `attrs`.* `modifiers: { type: { source: 'meta', default } }` is
read by the engine, which has no part in this path. So `by: 'type'` is in
practice "the attribute named `type`", and the claim that it reuses the modifier
mechanism is presentational unless something validates that the key really is a
declared modifier. Either validate it (cheap — both declarations are in scope at
build time) or say plainly that `by` names an *attribute*.

### The child mapping has to remap properties, not just the type

`children: { track: 'PodcastEpisode' }` changes the item's `@type` and nothing
else. But the item's properties are stamped inline, and they are
`MusicRecording` properties. Today's actual output for `type="podcast"`:

```json
{ "@type": "MusicPlaylist", "name": "The Sunday Show", "byArtist": "Acme",
  "track": [ { "@type": "MusicRecording", "name": "Episode One",
               "byArtist": "Acme", "duration": "PT1800S" } ] }
```

Retyping the item to `PodcastEpisode` leaves `byArtist` on it — a property
`PodcastEpisode` does not have. Worse than `MusicRecording`, which at least was
coherently wrong. So a child row is a **type plus a property map**, the same
shape as a parent row, and the design should show it that way:

```ts
podcast: {
  type: 'PodcastSeries',
  properties: { track: 'hasPart' },
  children: {
    track: {
      type: 'PodcastEpisode',
      properties: { 'track-name': 'name', 'track-duration': 'duration' },
      // `track-artist` is dropped: PodcastSeries carries the publisher, not the item
    },
  },
}
```

Which also means those inline spans must be reachable by name. They already
carry `data-name="track-name"` / `"track-artist"` / `"track-duration"` — so
`playlist` is addressable today, and it is the Group C rune that needs the least
prep. That is a point in favour of it as the driving case.

That settles the layering:

- **derive** — a content attribute picks the schema, because the author has
  already said what the thing is
- **override** — `schema="<Type>"` for when the author knows better than the
  mapping; rarely needed once the default is derived
- **suppress** — `schema="none"`, orthogonal to both ({% ref "WORK-552" /%})

### Two emitters, one mapping

`MusicRecording` is stamped in two places: playlist's own `<li>` items (line 153)
and the standalone `track` rune. A per-type child mapping has to reach both, or a
podcast's inline items become `PodcastEpisode` while `{% track %}` children stay
`MusicRecording`. Whether that is one config entry consulted twice or two
entries kept in step is a design question this spec must answer, not gloss.

It is also the same question as **contextual schema**, listed below under "what
it unlocks" — a `{% track %}` inside a podcast is exactly "a child rune declares
what it means inside a given parent". So `contextProperties` is not a later
bonus; the third acceptance criterion (per-type child mappings) cannot be met
for `playlist` without it, because `playlist` accepts both inline list items and
`{% track %}` children. Either the spec includes it or it narrows that criterion
to transform-built children only.

A related structural fact the table compiles down to: `collectJsonLd` nests a
child entity **only when the same node carries both `typeof` and `property`**.
Anything else typed floats up as a detached top-level entity — a `{% figure %}`
inside an `{% accordion %}` currently emits a sibling `ImageObject` related to
nothing. So "declare the child's type" and "declare the property that holds it"
are one operation, and the table must not let a rune do the first without the
second.

### Curation, not validation

These mappings are hand-written per rune. Nothing checks that `PodcastEpisode` is
really the right item type for `PodcastSeries` — refrakt ships no schema.org
ontology and this spec does not propose adding one. At five rows per rune that is
the right trade, but it means the table is a human judgement recorded in config,
and should be reviewed as such.

## What it unlocks

**A safe type override.** The per-type table makes `schema="ItemList"` express
the parent rename and the child's type change together — the thing that is not
expressible today.

**Contextual schema.** A child rune could declare what it means inside a given
parent, mirroring the existing `contextModifiers: { 'parent-rune': 'suffix' }`:

```ts
Accordion: { schema: { …, contextProperties: { recipe: 'recipeInstructions' } } }
```

Worth noting this case is *already* expressible imperatively — a parent can map
a child's tags into its own `schema` map with a cursor. What config adds is
letting the child declare it, so the parent needs no knowledge of every rune
that might appear inside it.

**Tooling.** `contracts` and `reference` can describe the structured data, which
closes a real gap in what `contracts` claims to cover. Both read config, so the
table has to be reachable from config — which it is, by the `sections` pattern.

`refrakt inspect` belongs on that list too, and is the one that matters most in
practice: it is the per-rune tool an author actually reaches for, and every
claim in this spec was verified with it. Today it shows the RDFa only
incidentally, as raw HTML in the rendered output. It should show the resolved
schema row — the type, the property mapping, the child mappings — the way it
already shows BEM classes and data attributes, and `--audit` should be able to
report a rune whose table names a `data-name` the rune does not emit.

**One declaration instead of two.** `defineRune({ schemaOrgType })` already
carries a rune's type in the catalog — `packages/runes/src/index.ts`, nine
entries. Nothing reads `Rune.schemaOrgType`: it is assigned in `rune.ts:59` and
never consumed, by `reference`, `contracts`, the language server or anything
else. It has also drifted — nine entries for thirty emitting runes, and
`Accordion: 'FAQPage'` is no longer unconditional since {% ref "WORK-552" /%}.
The table should replace it and the field should be deleted, or the second stale
declaration outlives the first.

## Prototype: the `entities:` shape, measured

`entities:` carries the whole of shape 2 and had only been sketched, so it was
built throwaway against two runes — `testimonial` (sources are visible nodes)
and `event` (a source that exists only as an attribute value). Both were
rewritten to drop `schemaOrgType`, the `schema:` map and the hand-built entity
spans, declaring instead:

```ts
export const testimonialSchema = {
  type: 'Review',
  properties: { quote: 'reviewBody' },
  entities: {
    author: { type: 'Person', property: 'author',
              properties: { 'author-name': 'name', 'author-role': 'jobTitle' } },
    rating: { type: 'Rating', property: 'reviewRating',
              properties: { rating: 'ratingValue' } },
  },
} as const;
```

**Both reproduced today's JSON-LD.** `testimonial` byte-identical (including its
existing `jobTitle: ", CTO at Acme"` comma defect — the prototype was checked
for equivalence, not improvement); `event` identical under the normalised
comparison, differing only in key order because rebuilt carriers are appended
last. The applier is about 60 lines and needs three resolution strategies: stamp
a named node in place, rebuild a value-only carrier from the bag, or synthesise
an entity span from either.

`testimonial`'s `rating` is the case that mattered: its meta *is* dropped by
`createComponentRenderable` once the rune stops declaring `schema:`, and the
applier recovered the value from the bag. That is what settled the section
above.

### What the prototype found: unaddressable sources

A schema source that is in **neither `properties` nor `refs`** is reachable by
neither route — not in the bag, and carrying no `data-name`. Two kinds recur:

| Kind | Runes | Sources |
|------|-------|---------|
| Metas built only for SEO | `embed`, `tier` | `titleMeta`, `urlMeta`, `embedUrlMeta`; `parsedPriceMeta`, `resolvedCurrencyMeta` |
| Image nodes | `figure`, `recipe`, `playlist`, `realm`, `faction` | `imgs[0]`, `seoImage`, `sceneImgTag` — the node itself is anonymous; only its wrapper is named |

Roughly ten sources across seven runes. Each needs either a `refs` entry (giving
it a `data-name`) or a `properties` entry (putting it in the bag) before the
table can address it — small and mechanical, but it must happen *before* those
runes migrate.

This also corrects an earlier claim in this spec that Group C needed "zero new
`data-name`s". That holds for the runes Group C named; it does not hold for this
set, which cuts across all three groups and was invisible until the mechanism
was built.

### What the prototype did not cover

`by:` row selection from `attrs`, per-type `children:` mappings, and the `text:`
carrier form are all still sketches. `playlist` exercises all three at once and
is the natural second prototype if one is wanted.

## Harvest at both points, and assert they agree

The spec has been treating the harvest point as a decision — keep `extractSeo`
where it is, or move it. It is better as an **invariant**: harvest at both
points and require the two graphs to match. Drift then fails a test instead of
shipping.

**It holds today.** Measured by running `collectJsonLd` over the pre-engine tree
and over the same tree after `createTransform`, across 15 runes spanning core and
five plugins:

| Result | Runes |
|--------|-------|
| Identical | accordion, breadcrumb, figure, embed, gallery, budget, track, testimonial, pricing, timeline, cast |
| Key order only | recipe, howto, playlist, event |
| Semantic drift | *none* |

So the engine is schema-preserving, and the test goes green on day one. It is a
regression net, not a migration.

**The comparison has to sort object keys and preserve array order.** The four
order-only cases are the runes whose metas the engine relocates to the end of
the block, so `collectProperties` meets them later — a difference with no
meaning in JSON-LD. Array order is the opposite: `itemListElement`, `step`,
`track` and `recipeInstructions` are ordered sequences, and a breadcrumb whose
items reversed is a real defect. A naive `JSON.stringify` comparison fails four
runes for nothing; a normalise-keys-keep-arrays comparison fails only on
substance.

**This subsumes the RDFa/JSON-LD question.** The shipped JSON-LD is harvested
pre-engine and the shipped HTML *is* the post-engine tree, so "both harvests
agree" is exactly "the RDFa in the published HTML expresses the same graph as
the published JSON-LD" — the invariant this spec was otherwise going to assert
by hand. With one caveat worth recording: `collectJsonLd` is an RDFa subset (no
`@about`, `@resource`, `@vocab`, prefixes or `@rel`), so it proves *our reader*
sees the same graph at both points, not that a conformant processor would.
Upgrading to a real distiller over the rendered HTML is a later option, not a
prerequisite.

**It also makes relocation safe rather than brave.** Every argument for moving
`extractSeo` — the `postProcess` hole, and stamping the rendered node instead of
a hidden `<meta>` (below) — becomes a change with a net under it instead of a
leap. And the net is not passive: run at page level, through the real pipeline,
the invariant *fails today* on a page using `{% breadcrumb auto=true %}`, because
the post-engine harvest sees a `BreadcrumbList` the pre-engine one never had.
That is the known bug surfacing itself, which is the behaviour wanted.

Hence a scope choice: rune-level (fixtures, cheap, catches engine drift) or
page-level (through `runPipeline`, catches the `postProcess` class too). Both,
ideally — they are the same assertion at two granularities.

## The hidden carrier, and what relocation would buy

A value-only schema property is emitted twice, and neither copy is the one the
reader sees. `recipe`'s rendered output:

```html
<article typeof="Recipe" … data-prep-time="PT15M">
  …
  <dl data-name="metadata">
    <div data-name="row" data-field="prepTime"><dt>Prep</dt><dd data-meta-type="temporal">15m</dd></div>
  …
  <meta content="PT15M" property="prepTime" />   <!-- trailing, after the content div -->
</article>
```

`PT15M` appears three times: the fields bag on the root, the rendered `<dd>`,
and a hidden `<meta>`. The RDFa is correct — the meta is inside the `Recipe`
scope, so the triples are right — but the node a human reads carries no schema,
and the node carrying the schema is invisible.

The cause is the same seam as everything else here, inverted. The transform
stamps a `<meta>` because **at transform time the `<dd>` does not exist** — the
engine builds that `<dl>` later from `data-rune-fields`. Not "the engine cannot
emit schema" but its mirror: the engine's own output cannot carry schema.

RDFa has the right idiom for a human/machine value split — `@content` overriding
the element text:

```html
<dd property="prepTime" content="PT15M" data-meta-type="temporal">15m</dd>
```

One node instead of two. But the engine builds that `<dd>`, so stamping it means
stamping at engine time, which today's pre-engine harvest would never see — you
would need the meta *and* the stamp, worse than now.

This was a second argument for relocating `extractSeo` past the engine. **It is
not enough** — see the decision below. The hidden metas stay, and the table
simply says which kind of carrier a row wants, defaulting to the hidden
`<meta>`: today's behaviour, made explicit rather than incidental.

## Decision: move the harvest after the pipeline, not after the engine

The two relocations differ by an order of magnitude, and the difference is
structural rather than a matter of effort.

### After the pipeline — in scope

Recompute `seo` from `enrichedPages` once `runPipeline` returns, inside
`loadSite`. One change in one place: `extractSeo` is pure, the pages are in
hand, and it stays where content loading already lives — framework-agnostic,
before any adapter sees anything. It closes the `postProcess` hole completely.

### After the engine — ruled out

**There is no post-engine seam to move to.** The engine is not invoked at one
place in the framework; in SvelteKit it runs in the *site's own load function*:

```ts
// site/src/routes/[...slug]/+page.server.ts
const renderable = hl(transform(serialized));   // ← the engine, line 29
…
seo: page.seo,                                   // ← line 41
```

Three lines apart, in code the user owns. Eleventy differs again — it passes
`page.renderable` straight to `renderPage` and reads `page.seo` off the load
result, never calling `createTransform` itself.

So a post-engine harvest is not one relocation but N, several of them in
user-land site code. **The pre-engine harvest exists because it is the last
framework-agnostic point** — which is what this spec's earlier "content loading
is framework-agnostic" line was gesturing at, and it is a structural fact rather
than a preference.

What that forecloses is only the rendered-node carrier, and that is cosmetic:
the RDFa is correct either way, both channels carry the right triples, and the
cost is three hidden elements per rune. Not worth N adapter changes plus churn
in every site's load function.

Detection survives the decision. The two-point invariant runs in tests, where
engine output is available in a harness, so drift is caught without production
harvesting moving at all.

### Two sub-decisions inside the move

- **`extractSeo` returns og metadata as well as JSON-LD.** Recomputing after the
  pipeline re-derives og from the enriched tree, and `extractOgMeta` reads
  hero / first `h1` / first paragraph / first image — all of which `postProcess`
  can touch (collection and pagination sentinels inject content). Recompute
  both and let the baseline show what moves; recomputing only `jsonLd` would
  leave og deriving from a tree that no longer matches the page.
- **This is an output change, by design.** Pages using
  `{% breadcrumb auto=true %}` gain a `BreadcrumbList` they do not publish
  today. That is the fix, but it should land as a visible diff against the
  baseline rather than as a silent side effect — another reason the baseline
  snapshot sequences first.

## Before anything moves: the baseline

This migration rewrites structured data across 30 runes in 10 packages, and the
output is a thing nobody looks at directly — a page renders identically whether
its JSON-LD is right or ruined. Every regression in this spec's history was
found by *running* `extractSeo`, not by reading a transform, and four dead CSS
selectors survived years of review precisely because nothing asserted them.

So the first work item is a **baseline snapshot of today's JSON-LD for every
emitting rune**, before a single call site changes. Per-rune fixtures through
`extractSeo`, committed. Then each migration step is reviewed as a diff against
it: `playlist type="podcast"` *should* change, `recipe` should not, and the
seven Group A entities disappear in exactly one commit.

The existing coverage is not that. `packages/runes/test/seo.test.ts` and the
per-plugin `seo.test.ts` files assert a handful of runes — `accordion`,
`breadcrumb`, `playlist` — with hand-written expectations, and several of the
runes this spec changes have no JSON-LD test at all. Cheap to build now while
the current behaviour is the reference; impossible to reconstruct once the sweep
has started.

## Open questions

- **Is `none` a type or a mode?** `schema="none"` suppresses; every other value
  names a type. Reads fine, but it makes the attribute's vocabulary a union of
  two kinds of thing.
- **`organization` already has an override, under another name.**
  `organization.ts:43` passes `typeof: attrs.type || undefined` — the author's
  `type=` attribute becomes the schema.org type verbatim, uncurated and
  unvalidated. That is the `schema="<Type>"` escape hatch, shipped on one rune
  with a different spelling. Reconcile: either `organization` grows a curated
  `by: 'type'` table like `playlist`, or it is the precedent and `schema=` is
  the one that changes. Two spellings for one thing is the outcome to avoid.
- **Does an empty entity get emitted?** Group A above — seven runes publish a
  bare `@type`. Proposed: no entity without at least one property. Needs a
  decision because it changes seven runes' output, and `refrakt contracts`
  `--check` will show the diff.
- **Arity.** `appendToProperty` stores a single value as a scalar and only
  promotes to an array on the second: a one-track playlist emits
  `"track": { … }`, not `"track": [ … ]`. If the table says a property is a
  list, the emitter can normalise. Cheap to add while the shape is being
  designed; awkward to retrofit.
- **~~The `postProcess` emitters.~~** Settled with the harvest decision: `seo`
  is recomputed after `runPipeline`, so `breadcrumb auto`'s JSON-LD stops being
  dropped. It still builds its renderables outside any Markdoc schema, so the
  applier cannot reach it — the hook must call the same applier directly, or
  that one emitter stays hand-written and the "not half of each" criterion is
  read per rune.
- **Validation.** Narrowing to a subtype is always safe (schema.org properties
  are inherited); switching branches is not. With a per-type table the rune only
  offers types it has mappings for, so the unsafe case stops being expressible —
  which may make validation unnecessary rather than deferred. Confirm. Note this
  holds only if the `organization` free-text path closes too.
- **~~Where does the harvest end up?~~** Settled: after the pipeline, not after
  the engine — see the decision section. What remains is one small divergence to
  fold in: `breadcrumb` emits `<meta property="position" content="1">`, a string
  `"1"` in RDFa against the number `1` in the JSON-LD. Harmless, but the
  invariant should be tuned to either catch it or explicitly tolerate it.
- **Is the table part of the public plugin contract?** It has to be — 67 of the
  runes live in plugins, and a plugin rune must be able to declare its schema
  the same way a core rune does. But that makes "curation, not validation" a
  wider claim than it first looks: a third-party plugin would be asserting
  arbitrary schema.org types on its users' pages, with no ontology to check it
  against and no theme-level way to suppress it (by {% ref "ADR-028" /%}, and
  rightly). Probably acceptable — it is the same trust already extended to any
  plugin's transform code, and `schema="none"` gives the author an out — but it
  should be a decision recorded here rather than a consequence discovered later.
- **Migration shape.** 35 call sites across 30 runes, split 7 / 14 / 9 by the
  groups above. The natural sequencing follows that split — Group A (decide and
  delete), Group B (mechanical), Group C (four separable decisions, not a
  rewrite) — preceded by the baseline snapshot, and with the harvest move and
  the CSS decoupling as their own items. Six or seven work items rather than
  one. The harvest move is independent of the table and can land first: it fixes
  a live bug on its own and puts the drift invariant in place before the sweep
  starts.

## Non-goals

- **Page- and site-level schema.** `WebSite` and `Organization` entities are
  built in `seoToHtml` and the Next/Nuxt head helpers, not from runes — and are
  absent from the Svelte(Kit) and `html` adapters entirely, so refrakt's own
  site publishes neither. That inconsistency is real but orthogonal; this spec
  is the rune-level channel only, and should say so rather than imply
  `contracts` will answer "what structured data does this page emit?" in full.
- **A schema.org ontology.** See "Curation, not validation" above.

## Acceptance Criteria
- [ ] A baseline JSON-LD snapshot covers all 30 emitting runes and is committed before the first call site changes, so every later step is reviewed as a diff against it
- [ ] `seo` is recomputed from `enrichedPages` after `runPipeline`, so `postProcess`-injected schema reaches the JSON-LD — `{% breadcrumb auto=true %}` publishes the `BreadcrumbList` it renders, asserted by a test
- [ ] A rune's schema.org type and property mapping are expressible in config, keyed by `data-name` / `data-field`
- [ ] A schema value whose `<meta>` carrier is dropped as pure data is rebuilt from `data-rune-fields`, so `recipe`, `event`, `track`, `playlist`, `character`, `realm`, `lore` and `howto` keep the RDFa they emit today without `createComponentRenderable` gaining any knowledge of schema
- [ ] Every schema source is addressable — the ~10 sources in neither `properties` nor `refs` (`embed`, `tier`, and the image nodes in `figure`, `recipe`, `playlist`, `realm`, `faction`) gain a name or a bag entry before their rune migrates
- [ ] Plugin runes declare schema the same way core runes do, and the plugin-facing contract says so
- [ ] The mapping is applied at transform time, so `extractSeo` still sees it — a test asserts the JSON-LD, not just the HTML attributes
- [ ] A rune can offer more than one type, with per-type property names *and* per-type child mappings — where a child mapping carries its own property map, not just a type name
- [ ] A child entity is never declared without the property that holds it, so it cannot float up as a detached top-level entity
- [ ] Suppressing schema entirely is expressible on every rune, not just `accordion`, and strips the whole subtree rather than just the root
- [ ] `schema` joins `IDENTITY_FIELDS`, so no merge path — theme override or variant delta — can redefine what a rune means
- [ ] `refrakt contracts` describes the schema.org output it currently omits, and `refrakt inspect` shows a rune's resolved schema row rather than leaving it to be read out of the raw HTML
- [ ] Every one of the 22 existing `schema:` maps is expressible, including the computed-meta cases
- [ ] The imperative `typeof:` / `property:` stamps and the `attributes.typeof = …` mutations are covered too, or the runes carrying them are named as out of scope with a reason
- [ ] A nested entity can name the property that takes its own content, with the applier emitting the RDFa-conformant wrapper — no rune hand-writes one
- [ ] The JSON-LD is harvested at both the pre-engine and post-engine points and the two graphs are asserted equal — object keys normalised, array order significant — so RDFa/JSON-LD divergence fails a test rather than shipping
- [ ] Grouping named sibling nodes into a nested entity is expressible, so `testimonial`'s `Person` / `Rating` and `event`'s `Place` are declared rather than synthesised by hand
- [ ] No stylesheet selects on `property=`; the six Lumina rules move to BEM element classes and a CSS coverage assertion keeps them there
- [ ] `defineRune({ schemaOrgType })` is deleted or fed from the table — the type is declared once
- [ ] `property: 'contentSection'` is gone from all 29 transforms, along with the dead `Page` / `DocPage` nodes, the `PageSection` config entry and its CSS — and `TransformResult.property` with them, so nothing in the call signature shares a name with the schema.org channel
- [ ] Whether a bare `@type` with no properties is emitted is decided and applied uniformly across the seven Group A runes
- [ ] The imperative form either still works or is fully migrated — not half of each, per rune

## References

- {% ref "WORK-552" /%} — `schema="none"` on accordion, shipping ahead of this
- {% ref "WORK-548" /%} — the ~970 fabricated `Question` entries that surfaced it
- {% ref "SPEC-082" /%} — the schema.org channel this reworks
- {% ref "ADR-028" /%} — rune identity is not theme configuration; why the table belongs to the rune
- {% ref "BUG-013" /%} — the mistyped playlists this would fix

{% /spec %}
