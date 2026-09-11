{% spec id="SPEC-130" status="draft" tags="runes, schema-org, seo, config" %}

# Declarative schema.org mapping

Move the schema.org channel from 29 imperative call sites into declarative
data, keyed by `data-name` — the same shape BEM, modifiers and `editHints`
already use.

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

Three consequences:

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

The mapping is therefore **data consulted at transform time**, not engine
behaviour. `createContentModelSchema` is the single place that sees every rune —
it wraps each rune's transform and already post-processes the result (the tint
and bg meta injection). Every one of the 29 schema emitters goes through it;
none is a raw `Schema`. So schema application is one step there, not 29 edits.

The rune's own table is reachable from its definition. Where a *merged* view is
needed — for `contracts` and `reference` — it arrives the way
`__backgrounds` and `__securityPolicy` already do, through `config.variables`.
A module-level registry would not do: this repo builds two sites in one
process.

Relocating `extractSeo` to after the engine is the alternative. It is a larger
change — content loading is framework-agnostic — and it is not obviously
better, so it is recorded as rejected rather than unconsidered.

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

Surveyed across all 21 `schema:` maps in the codebase, the values split two ways:

| Kind | Examples | Declarative? |
|------|----------|--------------|
| Named refs | `nameTag`, `titleTag`, `tiers`, `trackItems` | Yes — already carry `data-name` / `data-field` |
| Computed metas | `parsedPriceMeta`, `resolvedCurrencyMeta`, `estimatedTimeMeta` | Yes, by reference — the tag carries `data-field`; only its *value* is computed |

So the split is clean: **the transform computes values, the table names their
schema roles.** No case requires the table to compute anything, which is what
makes this tractable.

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
| `mix` | `MusicPlaylist` | `MusicRecording` | `track` | today's default |
| `podcast` | `PodcastSeries` | `PodcastEpisode` | `hasPart` | **branch switch** |
| `audiobook` | `Audiobook` | `Chapter` | `hasPart` | **branch switch** |
| `series` | `CreativeWorkSeries` | `CreativeWork` | `hasPart` | **branch switch** |

Note that even the *default* is imprecise: `album` is a `MusicAlbum`, a subtype
of `MusicPlaylist`, so the safe narrowing is already available and unused.

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
closes a real gap in what `contracts` claims to cover.

## Open questions

- **Is `none` a type or a mode?** `schema="none"` suppresses; every other value
  names a type. Reads fine, but it makes the attribute's vocabulary a union of
  two kinds of thing.
- **Validation.** Narrowing to a subtype is always safe (schema.org properties
  are inherited); switching branches is not. With a per-type table the rune only
  offers types it has mappings for, so the unsafe case stops being expressible —
  which may make validation unnecessary rather than deferred. Confirm.
- **Migration shape.** 29 call sites. Whether the imperative form stays
  supported alongside config, or is removed in one pass, decides whether this is
  one work item or several.

## Acceptance Criteria
- [ ] A rune's schema.org type and property mapping are expressible in config, keyed by `data-name` / `data-field`
- [ ] The mapping is applied at transform time, so `extractSeo` still sees it — a test asserts the JSON-LD, not just the HTML attributes
- [ ] A rune can offer more than one type, with per-type property names *and* per-type child mappings
- [ ] Suppressing schema entirely is expressible, and strips the whole subtree rather than just the root
- [ ] `schema` joins `IDENTITY_FIELDS`, so no merge path — theme override or variant delta — can redefine what a rune means
- [ ] `refrakt contracts` describes the schema.org output it currently omits
- [ ] Every one of the 21 existing `schema:` maps is expressible, including the computed-meta cases
- [ ] The imperative form either still works or is fully migrated — not half of each

## References

- {% ref "WORK-552" /%} — `schema="none"` on accordion, shipping ahead of this
- {% ref "WORK-548" /%} — the ~970 fabricated `Question` entries that surfaced it
- {% ref "SPEC-082" /%} — the schema.org channel this reworks
- {% ref "ADR-028" /%} — rune identity is not theme configuration; why the table belongs to the rune
- {% ref "BUG-013" /%} — the mistyped playlists this would fix

{% /spec %}
