{% milestone name="v0.40.0" status="complete" %}

# v0.40.0 — The first composed rune

v0.38.0 and v0.39.0 built the prerequisites: the ownership marker, declarative
registration, slot labelling and tree-order preprocess. This milestone uses them to
ship the mechanism they were for. A rune defined as a Markdoc template placing other runes
({% ref "SPEC-145" /%}), proved on two real runes from the storytelling plugin, with the
packaging groundwork composed runes will need to be delivered ({% ref "SPEC-153" /%}).

The decision pass that settled SPEC-145's blocking questions is done (D2a, D10a–c, D25,
D26). What remains open in the spec does not block the two slices below.

## Why

**Two runes are waiting for it.** {% ref "WORK-617" /%} was cancelled because
`character`, `realm` and `faction` could not be expressed in the declared tier. The
answer recorded then was "replace them with compositions". Until composition exists, that
answer is a promise.

**The spec has reached the point where only code can test it.** SPEC-145 is a long
spec, and its worked examples have been run against today's pipeline by hand. The next
useful information comes from building it: whether the markers survive every primitive,
whether node-sourced registration holds, and whether the `character` expansion matches its
baseline.

## What lands

Eleven work items in four groups, plus one bug rider:

- **Prerequisite** (1). {% ref "WORK-619" /%}: the identity guard becomes path-granular
  ({% ref "SPEC-158" /%}). It is a pure tightening, inert today, and SPEC-158 D7 puts it
  first.
- **The mechanism** (4). Two foundations land inert and gated by "nothing moves":
  - {% ref "WORK-620" /%} makes a config's `block` optional;
  - {% ref "WORK-621" /%} makes `data-owner` / `data-slot` survive a primitive's
    transform.

  Then {% ref "WORK-622" /%} renders the template, and {% ref "WORK-623" /%} rejects bad
  definitions at construction, each by name. {% ref "WORK-630" /%} adds `{% metablock %}`
  (D7). It was pulled in on 2026-10-08, when WORK-622 showed that a composed rune's declared
  meta blocks cannot render without it and `character` needs its `blocks.metadata`.
- **The slices** (2), both beside the plugin, not in place of it ({% ref "SPEC-147" /%} D1):
  - {% ref "WORK-624" /%} composes `bond`: attributes, one slot, an edge, no schema;
  - {% ref "WORK-625" /%} composes `character`: `Person` schema, `sections` with `each`,
    and the SEO baseline as the reference.
- **Delivery groundwork** (2). {% ref "WORK-626" /%} makes every plugin export its
  manifest and publish what `files` declares. {% ref "WORK-627" /%} builds the
  `npm pack` → install → load harness that catches what monorepo tests cannot.
- **Spike** (1). {% ref "WORK-628" /%} runs `@adobe/structured-data-validator` over the
  SEO baseline. It is the evidence for or against lifting D25's ban on `schema` in user
  definitions.
- **Rider** (1). {% ref "BUG-032" /%}: `sandbox`'s `context` attribute is never emitted, so
  every sandbox gets the default design tokens. It is independent and `major`.

## The acceptance test, again

| Item | Contracts | SEO baseline |
|---|---|---|
| WORK-619, WORK-620, WORK-621 | none | none — each is inert today |
| WORK-622, WORK-623, WORK-630 | none | none — no shipped rune is composed |
| WORK-624, WORK-625 | none | none — the slices ship beside the plugin, and are *compared* with its baseline in their own fixtures |
| WORK-626, WORK-627, WORK-628 | none | none |
| BUG-032 | expected to move; reviewed | expected to move; reviewed |

As before, a row that should not move and does has changed behaviour. The slices'
deliverable is a written comparison: every difference from the plugin's output is
explained, not eliminated (SPEC-147 D2).

## Sequencing inside the milestone

- WORK-620 and WORK-621 → WORK-622 → WORK-623 → WORK-624 → WORK-625, with WORK-630 → WORK-625.
- WORK-619 is first by SPEC-158 D7 but blocks nothing here, so it can run in parallel with
  WORK-620/621.
- WORK-626 → WORK-627.
- WORK-628 and BUG-032 are independent.

So three tracks can run in parallel: the mechanism, delivery, and the spike plus the rider.

## Outcome

Every item is done, and BUG-032 is fixed. PRs #675–#681 and #683–#686.

- **Composition works end to end.** `bond` reproduces the storytelling registry snapshot
  exactly (#684). `character` matches the recorded JSON-LD at both harvest points, and its
  slot-placed portrait now reaches the graph as `image` (#686). The plugin is unchanged, and
  each slice's rendered differences are listed and asserted.
- **Three decisions changed on contact:**
  - the D10a two-namespace rule for doubly-marked nodes (#680);
  - `{% metablock %}`, pulled in as WORK-630 when WORK-622 showed declared blocks could not
    render without it;
  - both worked examples in SPEC-145, rewritten to the definitions that were proved.
- **The D25 spike kept the ban** on `schema` in user definitions. The validator catches
  typo-class errors, 3 of 17 recorded defects. WORK-629 runs it in CI on first-party rows.
- **Filed along the way:**
  - BUG-033 (playlist/track domain errors) and BUG-034 (tokens never reach the sandbox
    iframe), deferred by decision;
  - WORK-631 (content no field matches is silently dropped);
  - WORK-632 (`rows` coverage of `matches`).
- **Recurring local flake:** `plan-site-dogfood-real` and `plugins/plan/test/pipeline` time
  out at 30s under full-suite load in 4-core containers. CI is unaffected.

## Deliberately not here

**Loading definitions from a directory.** `Plugin.runeDir`, `runes.dir`, project runes
through `ProjectFiles`, precedence and dev invalidation are SPEC-153's steps 3–5. Here a
first-party definition reaches the pipeline as a `PluginRune` carrying a template. That
also means D25's user-definition ban has no loader to enforce it yet, and needs none,
because no user path exists.

**The rest of SPEC-145's surface.** None of these is needed by `bond` or `character`:

- multiple templates (D15)
- the chrome carrier (D14, D24)
- the i18n keying (D13)
- editor affordances (D11's editor half)
- `$slots` conditionals
- `refrakt inspect` showing the expansion

They stay open in the spec for the milestone that composes a rune which needs them.

**The rest of SPEC-147.** `realm`, `faction` and `lore` follow once `character` has shown
the pattern. Also deferred: `plot`'s `sequence` extension, the `segmented` content model,
core entity auto-linking, and `storyboard`'s relocation. Retiring the plugin is
not in scope at all (SPEC-147 D1).

**{% ref "SPEC-156" /%}, {% ref "SPEC-159" /%}, {% ref "SPEC-142" /%}**, SPEC-144's sentinel
resolution, {% ref "SPEC-139" /%}, and the v1.0 re-scope. None of them is a prerequisite
for the first composed rune.

{% /milestone %}
