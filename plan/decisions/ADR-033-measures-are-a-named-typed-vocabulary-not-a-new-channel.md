{% decision id="ADR-033" status="proposed" date="2026-09-21" source="SPEC-094" tags="theme, css, custom-properties, measures, vocabulary, naming, architecture" %}

# Measures are a named, typed vocabulary — not a new channel

## Context

Numbers reach CSS today through two paths, and both work.

**`config.styles`** — declarative, engine-emitted, mapping a modifier value to a
custom property, with optional `template` and `transform`:

```ts
{ columns: '--sb-columns' }                                    // → style="--sb-columns: 3"
{ columns: { prop: 'grid-template-columns', template: 'repeat({}, 1fr)' } }
```

**A rune transform writing the style directly** — `progress.ts:120`:

```ts
out.attributes.style = `--rf-progress: ${pct}%`;
```

The mechanism exists twice over. What does not exist is a **vocabulary**, and
the inventory shows the cost. One concept, five consumers, four spellings, two
of them abbreviated, one bypassing config entirely:

| Rune | Property | Source |
|---|---|---|
| `Gallery` | `--gallery-columns` | `packages/runes/src/config.ts:445` |
| `Bento` | `--bento-columns` | `plugins/marketing/src/config.ts:109` |
| `Storyboard` | `--sb-columns` | `plugins/storytelling/src/config.ts:310` |
| `BentoCell` | `--cell-cols` | `plugins/marketing/src/config.ts:139` |
| `Palette` | `--rf-palette-cols` | `plugins/design/src/tags/palette.ts:226` — from the transform |

Eleven further properties carry no prefix at all — `--separator`,
`--highlighted`, `--callout`, `--pass`, `--fail`, `--check`, `--cross`,
`--empty`, `--negative`, `--collapsible`, `--type` — sitting in the global
cascade namespace where any page author can collide with them.

### What was originally proposed, and why it shrank

The first sketch of this idea added a fourth channel to {% ref "SPEC-124" /%}'s
`FacetResult`, alongside `axes` / `state` / `styles`, carrying numeric custom
properties — so that a generic primitive could be written against
`--rf-index` / `--rf-count` / `--rf-min` / `--rf-max`.

Investigating it reduced the proposal to roughly a quarter of that. The
emission machinery already exists; the ambitious half either duplicates
`config.styles` or belongs to the browser. This ADR records the small true
version, and the reasoning that cut the rest, so the larger idea is not
rediscovered from scratch.

It is the third time on this branch that the mechanism turned out to already
exist and only the vocabulary was missing — after presentational groups
({% ref "ADR-029" /%}) and arrangements ({% ref "ADR-030" /%}). That should now
be the prior, not the finding.

## Decision

### 1. A registry and a prefix rule — no fourth channel

Measures are **a registry of standard names with declared types**, emitted
through the existing `config.styles`. `FacetResult` gains nothing.

The opt-in is the prefix:

```ts
styles: { columns: '--rf-columns' }   // registered measure — validated
styles: { gap: '--bento-gap' }        // rune-local — unchecked
```

Any `--rf-`-prefixed property in a `styles` entry must resolve to a registered
measure; an unregistered one is a build error. Everything else is untouched.
Zero new config surface, and the migration is "move shared concepts onto
`--rf-*` names, leave genuinely local ones alone."

A second channel would be strictly worse: `styles` already carries ordered
`[prop, value]` pairs, so a parallel `measures` channel doing the same thing
forces the engine to arbitrate precedence between them.

### 2. Measures declare a type; `@property` registration is deferred

The registry records each measure's CSS type — `--rf-index` is `<integer>`,
`--rf-progress` is `<percentage>`. That is what makes the `calc()` question
answerable and gives the validator something to check.

**Registering them with `@property` is a separate change.** It is the right end
state, but it alters runtime behaviour: registered properties gain initial
values and become animatable, so an element that previously inherited nothing
computes a value, and a `calc()` that was invalid-at-computed-value-time may
start resolving. Across 132 runes that is a real rendering risk and belongs in
its own change with the gallery harness covering it.

Types are data. `@property` is behaviour. They ship separately.

### 3. No positional measures

Per-child `--rf-index` / `--rf-count`, computed by the engine from a node's
place among its siblings, are **not built**.

Their only consumer was a radial cycle, and {% ref "ADR-030" /%} concluded
`radial` is a ladder direction rather than a topology. Rule 5b asks for a
concrete design that wants it; a wheel in a plugin that does not exist is not
one.

The decisive reason is different. CSS has `sibling-index()` and
`sibling-count()` — the native answer to exactly this problem. Their support is
narrower than `:has()` and wants verifying before anything relies on them, but
building a per-child positional computation into the transform without first
checking whether the platform already does it is the kind of thing that is
regretted later. **When a real consumer appears, evaluate the native functions
first.**

### 4. The admission test: does CSS compute with it?

**A measure is a quantity a stylesheet computes with** — it appears inside
`calc()`, or drives a length, angle, count or proportion. If CSS only
*substitutes* or *compares* the value, it is not a measure.

Applied to the current inventory:

| Property | Verdict |
|---|---|
| `--sb-columns` → `repeat(var(…), 1fr)` | measure |
| `--rf-progress` → width | measure |
| `--jx-position`, `--grid-ratio`, `--grid-min`, `--grid-gap` | measure |
| `--highlighted`, `--pass`, `--check`, `--separator` | flags and glyphs — not measures |
| `--split-valign` → `align-items: var(--split-valign, start)` | keyword substitution — **not a measure** |

`--split-valign` is the most-used custom property in the codebase (8 entries)
and the test excludes it cleanly. That is not a defect finding — keyword
substitution is a legitimate use of `config.styles`. It is evidence the boundary
is real rather than drawn to fit.

### 5. The initial registry is small

Entries are admitted on {% ref "ADR-030" /%} rule 5a's bar — three or more
existing implementations. On today's inventory that is essentially **`columns`**
(five consumers, tabled above). `gap` has two (`--bento-gap`, `--grid-gap`) and
waits. Everything else has one.

A registry of one entry looks absurd and is the correct starting point: it is
the concept whose fragmentation is already costing something, and admitting more
would be inventing a vocabulary rather than recording one.

## Consequences

**The drift instrument gains a third check.** {% ref "SPEC-137" /%} already
covers per-rune CSS shadowing a dimension, and theme CSS for a dimension nothing
emits. Measures add: every `--rf-`-prefixed property in a `styles` entry
resolves to a registered measure, and every registered measure has at least one
consumer. Same instrument, same allowlist discipline, no new machinery.

**Unprefixed globals become visible as a problem.** Eleven properties in the
global cascade namespace are not measures under decision 4 and are not addressed
by this ADR — but naming the boundary makes them legible as a separate cleanup
rather than background noise.

**`Palette` is an outlier worth fixing while nearby.** `--rf-palette-cols` is
emitted from the transform (`palette.ts:226`) rather than through
`config.styles`, and already carries the `--rf-` prefix it has no claim to. It
should move to config and to the registered name.

**This does not unlock arrangements.** `rail` and `track` still want
`min`/`max`/`value` and `parts`, and those are single-consumer concepts that
this ADR declines to admit. Measures and arrangements are independent; neither
gates the other.

## Alternatives considered

**Add a `measures` channel to `FacetResult`.** The original sketch. Rejected: it
duplicates `styles`, which already emits ordered prop/value pairs, and forces
precedence rules between two paths that do the same thing. What measures needed
from the engine was validation and naming, not another emission path.

**Register everything with `@property` in the same change.** Cleaner end state,
one migration. Rejected on risk — see decision 2. The behavioural change is real
and deserves isolation.

**Build positional measures now, since the engine already walks children.**
Tempting, and the walk does exist. Rejected: no consumer, and the platform may
already provide it. Building it would make `sibling-index()` unadoptable later
without a second migration.

**Skip the registry; just impose the `--rf-` prefix.** Cheapest possible
version, and it fixes the global-namespace problem. Rejected as insufficient: a
prefix without a registry gives `--rf-gallery-columns` and `--rf-bento-columns`,
which is the same fragmentation with better hygiene. The shared *name* is the
point.

## References

- {% ref "SPEC-094" /%} — theme system foundations
- {% ref "SPEC-124" /%} — facet registry; the `axes` / `state` / `styles` channels this declines to extend
- {% ref "ADR-030" /%} — arrangements; the source of the three-implementation bar and the vocabulary-versus-mechanism split
- {% ref "SPEC-137" /%} — dimension adoption drift detection; where the measure checks belong
- {% ref "ADR-032" /%} — kebab-case rune config keys; the other naming-convention decision on this branch

{% /decision %}
