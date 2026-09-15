{% bug id="BUG-016" status="confirmed" severity="major" tags="runes,media,schema-org,seo,docs" milestone="v0.35.0" %}

# A track inside a playlist is not one of its tracks

`/runes/media/track` tells authors that *"tracks can be used independently or
inside a `playlist` rune"*. The composition does not work. A `{% track %}`
inside a `{% playlist %}` is not a track of that playlist in the rendered HTML
or in the structured data — it renders as a bare `<li>` in the prose body and
publishes a **detached top-level entity**.

Found while settling {% ref "SPEC-130" /%}'s open question about the two
`MusicRecording` emitters. The question turned out to rest on this composition
working; it does not.

## Actual

```markdoc
{% playlist type="podcast" artist="Acme" %}
# The Sunday Show

- **Episode One** *Acme* (30:00)

{% track type="episode" artist="Acme" duration="42:30" %}
## Episode Two
{% /track %}
{% /playlist %}
```

Structure — the track lands in the body zone, not the track list:

```
playlist → section → div[data-name=body] → li[data-rune=track]
```

The `<ol data-name="tracks">` contains **one** item (the markdown-list episode).
The `{% track %}` is not in it. So the page carries an `<li>` that is not inside
any list, which is invalid HTML.

Structured data — two unrelated entities instead of one:

```json
[
  { "@type": "MusicPlaylist", "name": "The Sunday Show", "byArtist": "Acme",
    "track": { "@type": "MusicRecording", "name": "Episode One", … } },
  { "@type": "MusicRecording", "name": "Episode Two" }
]
```

The second entity is related to nothing. `collectJsonLd` nests a typed child
only when the same node carries **both** `typeof` and `property`
(`packages/runes/src/seo.ts:109`); `playlist` stamps `property` on the items it
builds itself and never sees the `{% track %}`, so the track floats up.

## Expected

**Decided: the composition works.** `track` is useful standalone *and* useful
inside a playlist when the list format is too limited and the author wants full
control — that is the escape hatch the docs were describing, and it is worth
having. So `playlist`'s content model accepts `track` tags into its `tracks`
field, they render inside the `<ol>`, and they nest in the playlist's structured
data like any other item.

The bar is equivalence: **a nested track with no explicit `type` produces the
same schema as the same content written as a list item.** The fuller form may
carry more (`url`, `position`); it may not carry less.

Withdrawing the composition was the cheaper option and was considered. It was
rejected because the feature is genuinely wanted — the item model cannot express
body content, cue points with prose, or per-track links, and an author who needs
those has nowhere else to go.

Fixed by {% ref "WORK-572" /%}.

## Why this is `major` rather than `minor`

Unlike {% ref "BUG-013" /%}, this one is not merely imprecise. It emits invalid
HTML (`<li>` outside a list), publishes a detached entity that asserts a
standalone recording exists where the author described a playlist item, and it
is **actively recommended by the documentation** — so an author following the
docs produces all three.

## Root cause

`playlist`'s content model matches its track list as `{ name: 'tracks', match:
'list' }` and builds items exclusively from `itemModel`-extracted data
(`plugins/media/src/tags/playlist.ts:121-155`). There is no field matching a
`track` tag, so a `{% track %}` falls through to `{ name: 'body', match: 'any',
greedy: true }`.

Nothing in `playlist` references the `track` rune at all. The composition was
documented but never built.

## Steps to reproduce

Render the markdoc above through `extractSeo` and inspect the tree. Measured
directly against the built packages, not inferred from the source.

## Acceptance Criteria
- [ ] `{% track %}` children render inside the `<ol data-name="tracks">` and nest under the playlist's track property, with no detached entity
- [ ] No `<li>` is emitted outside a list
- [ ] A nested track with no explicit `type` produces the same JSON-LD as the same content written as a list item, asserted directly
- [ ] `/runes/media/track`'s claim that the composition works is true, with a worked example
- [ ] A test covers a `{% track %}` inside a `{% playlist %}`, asserting the JSON-LD has no detached entity
- [ ] {% ref "BUG-013" /%}'s "two emitters" reasoning is corrected to match this resolution

## Approach

See {% ref "WORK-572" /%} for the mechanics. The two facts that shape it:

- **The parent supplies the collection property; the child may supply its own
  type.** Nesting requires both `typeof` and `property` on the same node and
  only the parent knows the relationship, so the parent already has to touch
  every nested child — type inheritance then costs nothing extra. The child
  declares nothing about its parent, exactly as {% ref "SPEC-130" /%} D9 has it.
- **`track`'s `?? 'song'` default currently hides the absence** it would need to
  detect, so the inheritance cannot fire until that moves to a fallback row.

This lands **before** {% ref "WORK-569" /%}. Structure first, schema second: a
`children:` mapping written while tag-built children are still not children
covers half the population and gets revised the moment this ships.

Note this is **not** blocked on {% ref "SPEC-130" /%}. The invalid `<li>` and
the detached entity are wrong today regardless of how the schema channel is
expressed.

## References

- {% ref "SPEC-130" /%} — D9, which this finding produced
- {% ref "WORK-572" /%} — the fix
- {% ref "BUG-013" /%} — the sibling defect; its "two emitters" section assumed this composition worked
- {% ref "WORK-569" /%} — takes over the stamping once the table exists
- `plugins/media/src/tags/playlist.ts:121` — items built from `itemModel` only
- `packages/runes/src/seo.ts:109` — the nesting rule the detached entity falls out of
- `site/content/runes/media/track.md:16` — the claim

{% /bug %}
