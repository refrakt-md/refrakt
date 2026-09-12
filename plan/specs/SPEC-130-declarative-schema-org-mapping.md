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
`postProcess` hole. Keeping the harvest where it is means this spec ships a
mechanism with a known gap, which is defensible but must be said out loud —
see the open question.

### Nothing needs threading

The obvious guess is that the table is passed to `createComponentRenderable`.
It cannot be: picking a row needs `attrs` (for `by: 'type'`), and that function
receives only the assembled result.

The wrapper has both. So `schema` is an **option to `createContentModelSchema`**,
sitting with the rune-identity declarations already there — `sections`,
`mediaSlots`, `provides`, `base`:

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
they already read `sections`.

The 35 call sites get *simpler*: they stop passing `schemaOrgType` and `schema`
entirely rather than gaining an argument.

The child mapping works because Markdoc transforms bottom-up. By the time the
wrapper sees `result`, the children carry their own `typeof`, so it rewrites
them — the move `stripSchemaOrg` already makes for `schema="none"`
({% ref "WORK-552" /%}).

Relocating `extractSeo` is the alternative. It is a larger change — content
loading is framework-agnostic — but it is no longer "not obviously better": it
is what would let `postProcess`-injected schema be harvested. Note that moving
it after *the pipeline* (recompute `seo` from `enrichedPages`) is a much smaller
change than moving it after *the engine*, and closes the whole known gap. The
two should not be conflated when this is decided.

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
none of which the sketched table can express:

| Shape | Where | What it does |
|-------|-------|--------------|
| **Retype + wrap** | `accordion-item`, `recipe`, `how-to` | sets `typeof` on a node it did not create and wraps its children in a `<div property="text">` / `<p property="text">` to supply the value |
| **Synthesise an entity** | `testimonial`, `event` | builds a `Person` / `Rating` / `Place` span from text pulled out of *other* tags (`authorNameTag.children.filter(…)`) or from an attribute (`attrs.location`) |
| **Index-derived values** | `breadcrumb`, `timeline` | the parent emits each child's `position` from the loop index — a value that exists nowhere in the content |
| **Inline property stamps** | `playlist` | writes `property: 'byArtist'`, `property: 'duration'` directly onto the spans it builds for each track |

Two of these break a stated premise. The synthesised entities carry **no
`data-name` and no `data-field`** — `new Tag('span', { typeof: 'Person',
property: 'author' }, …)` — so a table "keyed by `data-name`" has no handle for
them. And the index-derived `position` *is* the table computing something.

This does not sink the design, but it decides its scope. Three honest options,
and the spec should pick one rather than discover it during implementation:

1. **The table covers Groups A and B; Group C keeps a documented imperative
   escape hatch.** Smallest, ships soonest, and explicitly fails the "not half
   of each" criterion — so that criterion would have to be rewritten to "every
   rune is wholly one or wholly the other", which is a weaker but honest bar.
2. **Extend the table** with a wrap/retype form and a `position: 'index'`
   generator, and require every synthesised entity to first gain a `data-name`
   so it is addressable. Larger, and the `data-name`s are worth having anyway
   (they are BEM element handles and `editHints` targets).
3. **Normalise Group C first**, as separate prep work: give every synthesised
   node a `data-name`, move the retype/wrap into a shared helper, and only then
   apply the table. Slowest, but it is the option where the table stays simple.

Option 3 is the recommendation: the per-rune prep is mechanical and individually
reviewable, and it keeps the mapping format from growing a generator vocabulary
on its first outing.

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

**One declaration instead of two.** `defineRune({ schemaOrgType })` already
carries a rune's type in the catalog — `packages/runes/src/index.ts`, nine
entries. Nothing reads `Rune.schemaOrgType`: it is assigned in `rune.ts:59` and
never consumed, by `reference`, `contracts`, the language server or anything
else. It has also drifted — nine entries for thirty emitting runes, and
`Accordion: 'FAQPage'` is no longer unconditional since {% ref "WORK-552" /%}.
The table should replace it and the field should be deleted, or the second stale
declaration outlives the first.

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
- **The `postProcess` emitters.** `breadcrumb auto` builds schema outside any
  Markdoc schema, and its JSON-LD is dropped today. In scope (recompute `seo`
  after `runPipeline`), or explicitly excluded and filed?
- **Validation.** Narrowing to a subtype is always safe (schema.org properties
  are inherited); switching branches is not. With a per-type table the rune only
  offers types it has mappings for, so the unsafe case stops being expressible —
  which may make validation unnecessary rather than deferred. Confirm. Note this
  holds only if the `organization` free-text path closes too.
- **Migration shape.** 35 call sites across 30 runes, split 7 / 14 / 9 by the
  groups above. The natural sequencing follows that split — Group A (decide and
  delete), Group B (mechanical), Group C (per-rune prep, then map) — which
  suggests three or four work items rather than one.

## Non-goals

- **Page- and site-level schema.** `WebSite` and `Organization` entities are
  built in `seoToHtml` and the Next/Nuxt head helpers, not from runes — and are
  absent from the Svelte(Kit) and `html` adapters entirely, so refrakt's own
  site publishes neither. That inconsistency is real but orthogonal; this spec
  is the rune-level channel only, and should say so rather than imply
  `contracts` will answer "what structured data does this page emit?" in full.
- **A schema.org ontology.** See "Curation, not validation" above.

## Acceptance Criteria
- [ ] A rune's schema.org type and property mapping are expressible in config, keyed by `data-name` / `data-field`
- [ ] The mapping is applied at transform time, so `extractSeo` still sees it — a test asserts the JSON-LD, not just the HTML attributes
- [ ] A rune can offer more than one type, with per-type property names *and* per-type child mappings — where a child mapping carries its own property map, not just a type name
- [ ] A child entity is never declared without the property that holds it, so it cannot float up as a detached top-level entity
- [ ] Suppressing schema entirely is expressible on every rune, not just `accordion`, and strips the whole subtree rather than just the root
- [ ] `schema` joins `IDENTITY_FIELDS`, so no merge path — theme override or variant delta — can redefine what a rune means
- [ ] `refrakt contracts` describes the schema.org output it currently omits
- [ ] Every one of the 22 existing `schema:` maps is expressible, including the computed-meta cases
- [ ] The imperative `typeof:` / `property:` stamps and the `attributes.typeof = …` mutations are covered too, or the runes carrying them are named as out of scope with a reason
- [ ] `defineRune({ schemaOrgType })` is deleted or fed from the table — the type is declared once
- [ ] Whether a bare `@type` with no properties is emitted is decided and applied uniformly across the seven Group A runes
- [ ] The imperative form either still works or is fully migrated — not half of each, per rune

## References

- {% ref "WORK-552" /%} — `schema="none"` on accordion, shipping ahead of this
- {% ref "WORK-548" /%} — the ~970 fabricated `Question` entries that surfaced it
- {% ref "SPEC-082" /%} — the schema.org channel this reworks
- {% ref "ADR-028" /%} — rune identity is not theme configuration; why the table belongs to the rune
- {% ref "BUG-013" /%} — the mistyped playlists this would fix

{% /spec %}
