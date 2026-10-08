{% milestone name="v0.41.0" status="planning" %}

# v0.41.0 — Composed runes you can ship

v0.40.0 built composition and proved it on `bond` and `character`. Nobody outside the repo can
use it yet: a definition reaches the pipeline only as a string passed to `defineComposedRune`.
This milestone closes that gap. A plugin ships definitions from a declared directory, a project
writes its own in `runes.dir`, and the authoring guide makes it a documented feature
({% ref "SPEC-153" /%}, {% ref "SPEC-145" /%}).

It also takes the storytelling replacement ({% ref "SPEC-147" /%}) from two runes to five,
leaving only the two that need new primitives.

## Why

**Composition only pays off once people can write definitions.** Until it does, its value to
anyone outside the repo is zero, however well it is tested. The hosted product is the case
SPEC-153 was written for, and it needs the project path to work under `memoryProjectFiles`.

**The safety rails have to be in place before users arrive.** Two silent failures came out of
v0.40.0:

- content that no content-model field matches is dropped without a word ({% ref "WORK-631" /%});
- a `by` schema table with a misspelt row falls back to the default type
  ({% ref "WORK-632" /%}).

A maintainer finds these with a test. A user writing their first definition does not, so both
land in the same milestone that lets them write one.

## What lands

Seven work items in four groups:

- **Delivery** (2):
  - {% ref "WORK-633" /%}: a plugin declares `runeDir`, proved through the `npm pack`
    harness;
  - {% ref "WORK-634" /%}: a project's `runes.dir`, read through `ProjectFiles`, with D8's
    precedence, D10's dev invalidation and the enforcement of SPEC-145 D25's ban on `schema`
    in user definitions.
- **Safety rails** (2): {% ref "WORK-631" /%} reports unmatched content, and
  {% ref "WORK-632" /%} checks `rows` against `matches`.
- **Storytelling, beside the plugin** (2):
  - {% ref "WORK-635" /%} composes `lore`;
  - {% ref "WORK-636" /%} composes `realm` and `faction`.

  With `bond` and `character`, that is five of the seven runes. Only `plot` and `storyboard`
  remain.
- **Docs** (1): {% ref "WORK-637" /%} writes the user-facing authoring guide, with worked
  examples taken from the tested fixtures.

## The acceptance test

| Item | Contracts | SEO baseline |
|---|---|---|
| WORK-633 | none, unless plan's chosen rune moves it; reviewed | same |
| WORK-634, WORK-637 | none | none |
| WORK-631 | none | none |
| WORK-632 | none, unless a shipped table is fixed; reviewed | same |
| WORK-635, WORK-636 | none | none; compared in their own fixtures |

## Sequencing inside the milestone

- WORK-633 → WORK-634 → WORK-637.
- WORK-631 should land before WORK-634 merges if it can, because it is the rail users need
  most. It is not a hard block.
- WORK-632, WORK-635 and WORK-636 are independent. WORK-635/636 use a fixture plugin's
  `runeDir` if WORK-633 has landed, and a string otherwise.

So three tracks can run in parallel: delivery, the rails, and storytelling.

## Deliberately not here

**Swapping the plugin's runes for the composed ones.** SPEC-147 D1 keeps the plugin until a
separate decision. That decision also has to settle the cross-link constraint
{% ref "WORK-625" /%} found: auto-linking skips nested runes, and composed prose sits inside
`card`.

**`plot` and `storyboard`.** They need `sequence`'s modifier-source form and a `segmented`
content model (SPEC-147 implementation notes 1, 2 and 4). Promoting entity auto-linking to core
(note 3) waits on the same swap decision.

**The rest of SPEC-145's surface.** None of these is needed by the five runes here:

- D27 (a)/(b): variant schema for `playlist`;
- D13: i18n keying;
- D14/D24: the chrome carrier;
- D15: multiple templates;
- D11's editor half;
- `$slots`;
- `inspect` showing the expansion.

**{% ref "BUG-033" /%}, {% ref "BUG-034" /%}, {% ref "WORK-629" /%}**, SPEC-144's sentinel half,
{% ref "SPEC-156" /%}, {% ref "SPEC-159" /%}, and the v1.0.0 re-scope.

{% /milestone %}
