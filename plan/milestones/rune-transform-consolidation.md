{% milestone name="v0.38.0" status="planning" %}

# v0.38.0 — Rune transform consolidation

Across 121 runes, `transform()` is 3,955 lines. A measurable share of that is
not logic — it is dead code, guards that guard nothing, and the same four
gestures retyped. Separately, the declarative content model already states more
about a rune's authoring syntax than any tool surfaces, and one field of it
silently eats authored content.

This milestone removes what is provably inert, names the idioms that are merely
repetitive, and closes the two gaps where a declaration exists and does not
reach either the author or the runtime.

## Why

Three things were established by measurement rather than argument, and each one
is a deletion rather than a feature:

**100 metas across 24 files are emitted into `children` after being mapped in
`properties`, where `createComponentRenderable` filters them straight back out.**
133 other metas already omit that emission and render identically. A 57/43 split
on a distinction with no observable effect is not a convention.

**The schema.org channel on `createComponentRenderable` has zero callers.**
{% ref "SPEC-130" /%} migrated every rune to the declarative table; the
imperative surface was never removed. That also makes the point above
structural rather than empirical: `schemaTags` can never be non-empty, so every
property meta is necessarily a pure-data meta.

**59 conditional spreads inside `refs` and `properties` are redundant**, because
the helper already skips `undefined`.

Alongside those, two declarations that exist and do not arrive:

**A mixed `list|tag:x` field with `emitTag` drops the authored tags**
({% ref "BUG-030" /%}) — silent content loss, and the reason `playlist`
reimplemented by hand what `cast` gets in three lines.

**The reference never renders the field-level authoring grammar**
({% ref "BUG-031" /%}) — `emitTag` and `template` are serialized and dropped at
the renderer, `itemModel` is not projected at all. So for a rune whose primary
syntax is a Markdown list, the docs say a list is accepted and nothing about
what goes in it.

## What lands

Ten items in three groups, plus one unrelated rider:

- **Deletion** (3) — the inert metas, the dead schema channel, the redundant guards. Output-identical; `contracts --check` and `seo:baseline:check` must report no diff.
- **Consolidation** (3) — one `extractText`, `renderNodes` + `bodyOnly`, `metaFields` + `groupByHeading`.
- **Declarations that arrive** (3) — the mixed-field fix, `playlist` adopting it, and the reference projecting the item grammar.
- **Rider** (1) — {% ref "BUG-026" /%}, `plan migrate ids` renumbering the published claimant. Unrelated to the rune work; small, self-contained, and already understood.

## The acceptance test does most of the work

`contracts/structures.json` and `contracts/seo-baseline/baseline.json` already
describe every rune's complete output — structure on one side, structured data
on the other, both generated. For the deletion and consolidation groups the
required result is **no diff in either**. A refactor that moves either file has
changed behaviour, whatever the intent, and that is a stronger check than the
unit tests for this class of change.

## Sequencing inside the milestone

Two orderings are load-bearing; the rest is independent.

Removing the dead schema channel reads more clearly once the metas are out of
the children, because the `pureDataMetas` filter has less to do. And `playlist`
cannot adopt field-level `emitTag` until the resolver stops dropping authored
tags.

## Deliberately not here

**{% ref "SPEC-141" /%}** — preprocess in tree order. It rewrites
`packages/runes/src/snippet-pipeline.ts`, which is exactly what five of
v0.37.0's twelve items are doing. Two branches rewriting one file is not a
schedule. It waits, wrapper removal included.

**{% ref "SPEC-142" /%}** — inferring the transform signature. It wants this
milestone to go first: both touch `ContentModelSchemaOptions` and
`createComponentRenderable`, and removing the dead surface here shrinks what
there is to type.

**{% ref "BUG-028" /%}** — `figure` dropping non-image children. The fix is a
product decision about what `figure` *is* (a general captioned container, or
image-only with a warning), so it wants deciding before scheduling.

**{% ref "BUG-029" /%}** — `knownSections` inert under `emitTag`. Latent, minor,
and its two fixes are materially different work. Not worth spending a decision
on to round out a count.

## What this milestone does not claim

`playlist`'s hand-written merge shrinks; it does not vanish.
{% ref "BUG-030" /%} makes the two syntaxes structurally uniform and correctly
ordered, but `adoptNestedTrack` exists for **attribute inheritance** — defaulting
a track's `type` from the playlist's, and passing down the playlist's `artist` —
and `emitAttributes` cannot express that: its refs reach the extracted item
data, never the parent rune's attributes. Roughly 55 lines become roughly 20.
Whether `emitAttributes` should reach a parent at all is
{% ref "SPEC-130" /%} D9's question, and is not asked here.

{% /milestone %}
