{% decision id="ADR-039" status="proposed" date="2026-09-30" source="SPEC-145" tags="runes, plugins, composition, packaging, governance, taxonomy" %}

# Where a rune lives: three kinds of package, and one test

## Context

Nine plugins were audited against {% ref "SPEC-145" /%}
({% ref "SPEC-147" /%}, {% ref "SPEC-148" /%}, {% ref "SPEC-149" /%}, {% ref "SPEC-150" /%},
{% ref "SPEC-151" /%}, {% ref "SPEC-152" /%}, {% ref "SPEC-154" /%}, {% ref "SPEC-155" /%},
{% ref "SPEC-157" /%}), and the result invalidates the axis the plugin set was organised on.

Plugins are grouped by **domain** — marketing, storytelling, places, business, media,
learning, design, docs, plan. Composition removes most of what is in them, and **what survives
in each case is a capability, not a subject**:

| Plugin | What actually keeps it alive |
|---|---|
| design | `design-context` computes tokens from its children's rendered output |
| marketing | `comparison`'s cross-column alignment over the whole child set |
| learning | `quiz` (a behavior + `[x]` parsing), `glossary` (a `postProcess` over other pages' prose) |
| plan | a filesystem scan outside any content tree, prose-parsed edges, a CLI, an MCP surface |
| docs | 73% of the package is a TypeScript/Python source extractor with its own CLI command |
| storytelling, places, business, media | **nothing** — every rune composes or relocates |

Not one of those is a subject. And the runes that *left* a plugin for core —
`storyboard`, `map`, `preview`, `audio` — left because their capability was never
domain-specific in the first place ({% ref "SPEC-148" /%}'s cross-audit finding).

So "which plugin does this belong to?" stopped being answerable, because it was one question
standing in for two.

### The correction that forced this decision

{% ref "SPEC-148" /%} D2 and {% ref "SPEC-155" /%} D6 both say their plugin *"dissolves"*.
Those verdicts reasoned about the **code**, and were allowed to stand as verdicts about the
**package** — even though {% ref "SPEC-153" /%} D1 had already separated the two by making a
plugin-shipped composition byte-identical to a user-authored one.

The cost numbers say why that mattered. `@refrakt-md/media` is 1,278 lines of transform plus
**341 lines of CSS for `playlist` and `track` alone** (188 + 153 across skin and skeleton).
After composition it is two `.rune.md` files, two fixtures, and no CSS at all, because a
composed rune has no block ({% ref "SPEC-145" /%} D2). **The expensive thing was never the
package; it was the code and the theme support inside it.** So "dissolve" was the wrong
default: once a package is nearly free, the bar for keeping it drops with its cost.

## Decision

### 1. Two axes, not one

**Tier** — does it need code? — and **distribution** — how does it reach a site? — are
independent:

|  | **Core** | **Package** | **Project** |
|---|---|---|---|
| **Composition** (no code) | starter set | a pack | the user's `runes/` |
| **Code** (behavior, derived data, pipeline) | domain-agnostic capabilities | domain capabilities | **forbidden** |

Five valid cells. The empty one is deliberate: user-supplied code is what
{% ref "ADR-037" /%} rules out, and `runes.local` is scoped to a plugin author's pre-publish
loop rather than being an exception to it ({% ref "SPEC-153" /%} D7).

### 2. The tier test — does it need code?

Yes if any of the following.

- **A behavior or custom element** — a client lifecycle (`map`, `preview`, `audio`)
- **A value computed from content rather than carried by it** — `design-context`'s tokens,
  `tier`'s `"$29/mo"` parse, `playlist`'s player payload
- **A computation over the whole child set**, not a per-child pass — `comparison` at
  content-model time, and `preview`'s `postTransform`, which states its own reason:
  *"this must happen in postTransform (not the rune) because it needs the fully-transformed
  tree with BEM classes and structural elements"*
- **A content model no declarative matcher reaches** — `bento`'s cascade
- **A cross-page hook beyond declarable registration** — `plan`'s scan

Otherwise it is a composition, with no exception and no judgement call.

**Corrected: an earlier revision of this list claimed *"every entry has two or more
measured instances"*, and three of its citations named two runes that do not exist.**
`quiz` (cited twice) and `glossary` have **zero occurrences** anywhere in `plugins/` or
`packages/runes/src/tags/` — `plugins/learning/src/tags/` contains `howto.ts` and
`recipe.ts` and nothing else, and {% ref "WORK-009" /%} and {% ref "WORK-010" /%} are both
`pending`. They arrived from {% ref "SPEC-154" /%}, which audited them deliberately *as
planned runes*, and the sentence above them called them measured.

A fourth instance was lost separately and for a better reason: {% ref "SPEC-157" /%} D4
established that `symbol`'s attribute-varying model **is** reached by a declarative
matcher, so it is a non-adopter of a shipping primitive rather than evidence that one is
missing.

Measured, the five bullets stand at **3, 3, 2, 1, 1** — the third gaining `preview` to
replace what the fourth and fifth lost. **Both remaining ones are genuine, and `bento`'s
is unreachable for a reason worth stating precisely, because neither
{% ref "ADR-036" /%} nor SPEC-157 stated it:** its thunk does not *branch*. It closes over
attribute values and uses them **inside** `processChildren` —
`const gridPos = attrs['media-position']`, then a seven-key `GRID_CASCADE` consumed off
the grid and defaulted onto cells (`bento.ts:383`) — and `ConditionalContentModel` selects
*between* models rather than parameterising one. No amount of adoption reaches it.

**The test is unharmed; the evidence sentence is retracted.** A blocker with one instance
is still a blocker, because the tier test asks whether code is *needed* — not whether the
need recurs, which is {% ref "ADR-030" /%} rule 5a's question about a different kind of
addition entirely. What the retraction costs is the claim that this list was derived rather
than chosen: two of its five entries rest on a single rune each, and a reader deciding
where their own rune goes is entitled to know which two.

### 3. The distribution test — what would someone otherwise have to get right?

Not "how much code is there". Three things justify shipping first-party, and **any one is
enough**:

- **Code a composition cannot express** (the tier test above)
- **A format, workflow or tooling** — `plan`'s file format and CLI; `docs`'s extractor
- **Curated knowledge that nothing validates**

The third is the criterion an earlier framing of this missed, and it is the one that saves
`media`. `playlistSchema` is a five-row variant table — `album → MusicAlbum/track`,
`podcast → PodcastSeries/hasPart`, `audiobook → Audiobook/Chapter`,
`series → CreativeWorkSeries/CreativeWork` — whose per-child maps drop `byArtist` for spoken
types because a `PodcastEpisode` has no such property. Its own comment says *"`Chapter` for an
`Audiobook` and `CreativeWork` for a `CreativeWorkSeries` are the rows worth a second
opinion. Nothing validates them."*

A composition's frontmatter can express that table — it is data. But a user writing their own
podcast rune would have to curate it, and would get it wrong **silently**, because
{% ref "SPEC-130" /%} D5 trades validation for visibility and JSON-LD is the one output where
a page renders identically whether it is right or ruined.

**The criterion discriminates, which is what makes it usable rather than a licence to keep
everything.** `characterSchema` maps only `name` and `role`, both attributes — thin,
uncurated, nothing lost if a user writes their own. So `storytelling` still has nothing worth
distributing; `places` keeps `event` (Event with a nested Place, start/end/url) and not
`itinerary`, which emits no schema at all.

### 4. Three kinds of package

"Plugin" now covers three distinct things, and saying which one a package is answers most
questions about it:

| Kind | Ships | Members |
|---|---|---|
| **Domain package** | code *and* a format, workflow or tooling | `plan`, `docs` |
| **Capability package** | code a composition cannot express | `design`, `learning`, `marketing` |
| **Pack** | compositions and curated knowledge, no code | what `places`, `business`, `media` become |

A package may be more than one kind. `media` is a capability package **and** a pack, which is
likely the common case rather than an awkward hybrid.

### 5. Nothing currently shipped may become user-supplied

`{% hero %}` resolves today. If it became a composition the user must write, every existing
page breaks. So for a rune that ships now, rule 3 is a constraint rather than a preference:
it stays first-party, in whichever tier. Only **new** shapes are candidates for the project
tier.

### 6. The player splits, as the worked example of rule 3

{% ref "SPEC-155" /%} D5 sent `audio` to core on {% ref "SPEC-154" /%} D7's tier test — *a
player is a primitive, not a domain type.* Half right. `<rf-audio>` does two jobs:

- **A bare player** — `src`, controls, waveform, chapters. Domain-free → **core**, beside
  `diagram` / `nav` / `sandbox`.
- **The playlist binding** — finding a playlist in the document and driving its track rows.
  Even after {% ref "ADR-038" /%} replaces its three rune-specific selectors with a data
  contract, the *contract* is still "a ladder of track-ish items with a `src`". That is media
  vocabulary → **stays in the package**.

## Consequences

**`places` and `media` become packs rather than dissolving.** Both audits' code findings
stand; their package verdicts are superseded by rule 3 and should be corrected in place rather
than silently reinterpreted. `storytelling` still dissolves, which is what shows the rule is
discriminating rather than conservative.

**The headline number is not a count.** "Nine plugins become four" was the wrong summary. Nine
become a mix of three kinds, most of them nearly free, and *which kind* matters far more than
how many there are. `plan` reads as obviously a plugin because it is the clearest domain
package; the others read as ambiguous because the old vocabulary had no word for a pack.

**Discoverability moves rather than disappearing.** Today "I want a hero" is *install
marketing*. Afterwards it is *write a composition* — and if nothing ships one, the lowered
barrier to theme development is paid for with a raised barrier to authoring. That is an
argument for core shipping a real starter set, and for the pack concept being built rather
than left deferred as {% ref "SPEC-153" /%} does.

**A pack needs no JavaScript, which {% ref "SPEC-153" /%} identified and deferred.**
`loadPlugin` requires `import()`, `findPluginExport` and `validatePlugin`, so a JS-free pack
means relaxing three things. Rule 4 makes that a real destination rather than a curiosity, so
the deferral now has a consumer.

**Domain names survive as bundling, not as architecture.** `@refrakt-md/media` is a fine name
for a pack of media compositions plus a player binding. What it no longer means is "the place
where media runes live", because most of them will live in core's vocabulary and the user's
repository.

## Alternatives considered

**Keep grouping by domain and accept thin plugins.** Rejected: four of nine have nothing
domain-specific left, so the grouping would describe history rather than structure — and it is
precisely what made the placement question unanswerable.

**Dissolve every plugin whose code composes away.** Rejected on the cost numbers: a package
that is two `.md` files and a fixture is close to free, and dissolving it discards curated
schema mappings that nothing else protects. This is the alternative an earlier draft of
{% ref "SPEC-148" /%} and {% ref "SPEC-155" /%} chose by default.

**Move everything composable to core.** Rejected: core is paid for by every install, and a
starter set is not the same as every domain shape anyone ever shipped. Rule 3's first
question is what a *user* would have to get right, not what is convenient to bundle.

**One flat "extensions" namespace with no kinds.** Rejected: the kind is what answers the
questions people actually ask — what will this cost me, can I write my own, does it need an
install. Collapsing it saves a word in the docs and costs the reader the answer.

## References

- {% ref "SPEC-145" /%} — composed runes; the mechanism that emptied the plugins, and D2's no-CSS rule behind the cost collapse
- {% ref "SPEC-153" /%} — delivery; D1 separates a composition from its distribution, D7 scopes `runes.local`, and the JS-free pack this decision gives a consumer
- {% ref "ADR-037" /%} — users author composed runes only; why the code/project cell is empty
- {% ref "ADR-036" /%} — name the pattern, do not open a language; the plugin escape hatch the tier test formalises
- {% ref "SPEC-130" /%} — the schema table and its D5 visibility-over-validation trade, which rule 3's third criterion rests on
- {% ref "SPEC-148" /%} — the places audit; the misfiled-capability pattern, and a D2 this decision corrects
- {% ref "SPEC-155" /%} — the media audit; a D6 this decision corrects, and the player split of rule 6
- {% ref "SPEC-152" /%} — the plan audit; the first plugin that stays and ships compositions
- {% ref "SPEC-157" /%} — the docs audit; the second domain package, which is what makes that category a category
- {% ref "SPEC-154" /%} — the learning audit; D7's tier test, which rule 6 refines, and the source of the planned runes rule 2 wrongly counted as measured
- {% ref "WORK-009" /%}, {% ref "WORK-010" /%} — `quiz` and `glossary`; both `pending`, both cited as evidence before being checked
- {% ref "ADR-038" /%} — a behavior binds on a data contract; why the playlist binding is still domain-coupled after the cleanup

{% /decision %}
