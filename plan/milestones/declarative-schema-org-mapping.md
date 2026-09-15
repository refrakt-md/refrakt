{% milestone name="v0.35.0" status="planning" %}

# v0.35.0 — Declarative schema.org mapping

Thirty runes publish structured data. Every one of them writes it by hand,
inside its transform, in a channel no tool can read and no reviewer looks at.
This milestone turns that channel into data keyed by the rune's own names — the
same shape BEM, modifiers and `editHints` already use — and builds the review
surface it has never had.

## Why

A rune's schema.org output is imperative in five different forms, and a survey
of the `schema:` maps sees barely two-thirds of it:

| Form | Sites |
|------|-------|
| `schemaOrgType:` on `createComponentRenderable` | 35 |
| `schema:` property maps | 22 |
| `typeof:` on a hand-built `Tag` | 7 |
| `property:` on a hand-built `Tag` | 16 |
| `node.attributes.typeof = …` mutation | 8 |

The invisible third is the interesting third — nested entities, per-item types,
computed positions. And because it is invisible, it has been wrong in the open
for years:

- **A podcast is published as a music playlist.** `playlist` validates
  `type="podcast"` against a five-value enum and then emits `MusicPlaylist` with
  `MusicRecording` episodes, unconditionally. `track` does the same with its own
  enum ({% ref "BUG-013" /%}).
- **A `{% track %}` inside a `{% playlist %}` is not one of its tracks.** It
  renders as an `<li>` outside any list and publishes a detached entity. The
  docs recommend the composition ({% ref "BUG-016" /%}).
- **`{% breadcrumb auto=true %}` publishes no `BreadcrumbList`.** It renders one
  correctly. `extractSeo` runs in phase 1; the hook that builds it runs in phase
  4. Nothing tests it — no pipeline test asserts on `seo` at all.
- **`organization` offers `NonProfit`,** a type schema.org does not have, inside
  a curated enum enforced by Markdoc. The enum validates against itself.
- **Seven runes assert a type and describe nothing** — `{"@type": "Dataset"}`
  with no `name`, no `description`, no `distribution`.
- **Four Lumina rules select on `property=` attributes that moved.** A `lore`
  title, a `bond` endpoint and a `tier` price render unstyled today
  ({% ref "BUG-015" /%}).

None of these was found by reading code. Every one was found by *running*
`extractSeo`.

## Who this is for

Two audiences, and only one of them is us.

**Search engines and every other consumer of structured data**, which is to say
the users of every site built on refrakt. They receive these claims as fact. A
fabricated `Question` is not a cosmetic defect at that end of the wire — and
{% ref "WORK-548" /%} would have published roughly 970 of them across 88 pages
of our own documentation.

**Plugin authors**, who inherit the same trust with none of the tooling. 67 of
the runes live in plugins, and D7 makes the table part of the public contract.
Today a plugin rune asserts schema.org types on its users' pages by writing them
into a transform, reviewable by nobody. That does not get safer by withholding
the mechanism; it gets safer when `inspect --audit` can print what a rune
claims.

## What lands

Thirteen work items. The first five change no structured data at all — they are
the ground the migration stands on.

**Ground**

- {% ref "WORK-560" /%} — state the `properties` / `refs` rule. Docs only, and
  the one piece of {% ref "SPEC-133" /%} in this milestone. See below.
- {% ref "WORK-562" /%} — baseline the JSON-LD for all 30 emitting runes, before
  anything moves. **Nothing starts before this.**
- {% ref "WORK-561" /%} — make the ~10 sources in neither `properties` nor
  `refs` addressable.
- {% ref "WORK-563" /%} — harvest `seo` after the pipeline, plus the two-point
  drift invariant. Fixes `breadcrumb auto` on its own.
- {% ref "WORK-564" /%} — move Lumina off the schema.org channel
  ({% ref "BUG-015" /%}).

**Mechanism**

- {% ref "WORK-565" /%} — the table, the applier, `entities` / `text` / `index`,
  `IDENTITY_FIELDS`, D4 and D6.
- {% ref "WORK-566" /%} — `inspect`, `contracts` and `reference` show the
  resolved row; `defineRune({ schemaOrgType })` is deleted.

**Migration**

- {% ref "WORK-572" /%} — `playlist` accepts `{% track %}` children
  ({% ref "BUG-016" /%}). A content-model fix, not a schema one, and it lands
  before {% ref "WORK-569" /%} so the table covers the whole track population.
- {% ref "WORK-567" /%} — Group A: seven runes gain a mapping or lose their type.
- {% ref "WORK-568" /%} — Group B: fourteen flat mappings, and `NGO`.
- {% ref "WORK-569" /%} — `playlist` **and** `track`: `by:`, per-type
  `children:`, and {% ref "BUG-013" /%}.
- {% ref "WORK-570" /%} — retype and wrap: `accordion`, `recipe`, `how-to`.
- {% ref "WORK-571" /%} — synthesised entities and `index`; closes Group C.

Plus three bugs: {% ref "BUG-013" /%}, {% ref "BUG-015" /%} and
{% ref "BUG-016" /%}, fixed by {% ref "WORK-569" /%}, {% ref "WORK-564" /%} and
{% ref "WORK-572" /%} respectively.

## The spec's one open question, closed

{% ref "SPEC-130" /%} named the two `MusicRecording` emitters — `playlist`'s own
items and the standalone `track` rune — as "a design question this spec must
answer, not gloss", and then none of D1–D8 answered it. It framed the choice as
shipping `contextProperties` (a child rune declaring what it means inside a
given parent) or narrowing the per-type child-mapping criterion.

Closed as **D9**, measured against the built packages rather than argued from
the source. **Neither option was needed, because the premise was false.**

`playlist` builds its track items exclusively from markdown-list `itemModel`
data. A `{% track %}` inside a `{% playlist %}` is not one of its tracks: it
falls through to the greedy `body` field, renders as an `<li>` outside any list,
and floats up as a detached top-level entity. The two emitters therefore never
populate the same collection, so there is nothing to keep in step. Each keys off
the attribute its author already set — `playlist.type` over five values,
`track.type` over its own five — and neither declares anything about the other.

The general rule D9 records outlives this rune pair: **the parent retypes its
children; a child never declares its context.** `collectJsonLd` nests a typed
node into its parent only when that node carries both `typeof` and `property`,
and only the parent can supply the `property` — so a parent that wants a child
in its graph is already stamping that child's attributes, and `contextProperties`
would be a second mechanism for what `children:` does. Markdoc's bottom-up
transform order agrees: a child cannot see its parent at transform time.

D9 splits into two channels, and the split is what makes the rest fall out:
**`property` — which collection a child joins — is always the parent's**, since
only the parent knows the relationship and nesting fails without its stamp.
**`typeof` is the child's when declared, else the parent's child-row default.**
So a parent is already obliged to touch every nested child, and type inheritance
costs nothing extra.

Two things fell out of asking. `track` ignores its own `type` exactly as
`playlist` does, which folds into {% ref "BUG-013" /%} and widens
{% ref "WORK-569" /%} to cover both runes. And the broken composition is
{% ref "BUG-016" /%} — documented, and wrong in three ways at once.

**{% ref "BUG-016" /%} is resolved by making the composition work**, not by
withdrawing it: `track` is genuinely useful inside a playlist when the list
format is too limited, and the item model cannot express body content, cue
points with prose, or per-track links. {% ref "WORK-572" /%} lands it, to the
bar that **a nested track with no explicit `type` produces the same schema as
the same content written as a list item** — the fuller form may carry more, not
less. None of that disturbs D9; it is D9's rule applied.

## Two deviations from the spec's migration shape

{% ref "SPEC-130" /%} proposes seven items and has tooling ride items 4–7. This
milestone has twelve and pulls tooling forward, for two reasons worth stating
rather than burying in a diff.

**Tooling goes before the migrations, not with them.** D5 dispenses with a
validation mechanism on the grounds that visibility replaces it — `inspect` and
`contracts` print the resolved table, so a wrong row is reviewable. If that
surface arrives with the last migration, then all thirty tables were curated
with no review surface at all, which is the condition this milestone exists to
end. D2 is the proof it matters: `NonProfit` sat inside reviewed first-party
code behind a validator that could not see it.

**The spec's item 4 is three separable things.** Naming the unaddressable
sources ({% ref "WORK-561" /%}) is additive, needs no schema knowledge, and can
land in parallel. Building the applier ({% ref "WORK-565" /%}) is the hard part.
Wiring the tooling ({% ref "WORK-566" /%}) depends on the applier but not on any
migration. Three reviews instead of one large one.

## The SPEC-133 question, answered

{% ref "SPEC-133" /%} covers the same call sites: `data-field` carries six
distinct meanings and its sweep moves ~97 nodes from `properties` to `refs`.
The natural question is whether it should go first. **It should not**, and the
reasoning is worth keeping.

*The coupling is already designed away.* The table keys on a name in the rune's
flat namespace ({% ref "ADR-008" /%}), not on `data-field` or `data-name`, so
SPEC-133's moves change which attribute a name surfaces as and never the name
itself. {% ref "WORK-565" /%} makes that explicit: name resolution is
attribute-agnostic, with a test pinning that a table resolves against a node
moved between maps without edit. That criterion is what keeps the two specs
independent, and it is the seam to watch.

*The order is the useful one.* {% ref "WORK-562" /%} and
{% ref "WORK-563" /%} — the committed baseline and the two-point invariant — are
exactly the net SPEC-133's wide HTML diff needs, and they are independent of the
table. Doing that sweep first means doing it with the coverage that let four
dead CSS rules survive years of review.

*And the readiness is lopsided.* {% ref "SPEC-130" /%} is accepted, has D1–D8
closed, carries a measured prototype, and fixes live defects.
{% ref "SPEC-133" /%} is a draft whose own last open question is "is this worth
doing at all?", and it says plainly that nothing is broken today except a casing
defect and a dead `Page` node. Its cost is a wide HTML diff plus a breaking
component-interface change for every rune whose content markers become slots.

What comes forward is only the rule ({% ref "WORK-560" /%}), because
{% ref "WORK-561" /%} has to choose a map for ten nodes and an unstated rule
means ten ad-hoc choices.

SPEC-130 also gives SPEC-133 an answer it does not have yet: its third open
question — whether a `refs` entry can opt into the bag — is what the applier's
three resolution strategies settle empirically, across thirty real tables.

## Deliberately not here

- **The `contentSection` removal**, and the rest of {% ref "SPEC-133" /%}.
  Deleting `property: 'contentSection'` from 29 transforms changes HTML on every
  section rune — SPEC-133's character, not this milestone's, whose HTML is
  otherwise unchanged except where a dead CSS rule starts applying.
  {% ref "SPEC-130" /%}'s criterion that no invented type survives is satisfied
  meanwhile: `typeof="PageSection"` is emitted only by the `Page` document node,
  which is never registered and has never run.
- **Page- and site-level schema.** `WebSite` and `Organization` entities are
  built in `seoToHtml` and the Next/Nuxt head helpers, not from runes — and are
  absent from the Svelte(Kit) and `html` adapters entirely, so refrakt's own
  site publishes neither. Real, orthogonal, and its own spec.
- **A schema.org ontology.** Nothing checks that `PodcastEpisode` is the right
  item type for `PodcastSeries`. At five rows per rune that is the right trade,
  but it means these tables are human judgement recorded in config, and D5 says
  so rather than implying validation that does not exist.
- **A universal `schema="<Type>"` override.** Deferred by D3. With every
  multi-type rune carrying a table and no free-text path, it has no demonstrated
  use — and dropping it is what lets D5 hold.
- **Moving the harvest past the engine.** Ruled out: there is no post-engine
  seam. In SvelteKit the engine runs in the site's own load function; Eleventy
  never calls it. That is N relocations, several in user-land code.

## The through-line

*The claims were always being published. Nothing could read them back.*

This is the same shape as {% ref "SPEC-132" /%}'s finding one layer over: not a
guard nobody runs, but an output nobody can inspect. A page renders identically
whether its structured data is correct or ruined, so every defect in the "Why"
list above was invisible in review, invisible in the dev server, and invisible
to the site owner — and perfectly visible to the machines the output exists for.

Which is why {% ref "WORK-562" /%} and {% ref "WORK-566" /%} are not
bookkeeping. Converting thirty imperative emitters into thirty declarative
tables, with no baseline underneath and no way to print the result, would
reproduce the disease in a tidier notation.

## Minor, not patch

Structured data changes on most of the catalog: seven entities disappear (D4),
single-item lists change shape (D6), `NonProfit` becomes `NGO`, and four
podcasts' worth of types are corrected. `defineRune({ schemaOrgType })` is
deleted and the plugin contract gains the table (D7), so plugin authors have
work to do. Rendered HTML is unchanged except where {% ref "WORK-564" /%}
revives a dead CSS rule.

Changesets runs in fixed mode, so the release is a minor either way — but the
changeset should say what a site owner will see in their structured data, since
that is the part no build failure will tell them about.

{% /milestone %}
