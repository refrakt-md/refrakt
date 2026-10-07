{% milestone name="v0.39.0" status="active" %}

# v0.39.0 — Declarations, part two

v0.38.0 deleted what was provably inert and made two declarations reach the
reader and the runtime. This milestone continues on the same line, one level up:
the remaining places where a rune's behaviour is **written as code but is really
data**, plus the one place where the two schema resolvers' disagreement already
publishes wrong structured data.

These are also the self-contained foundations of the composed-runes work
({% ref "SPEC-145" /%}, {% ref "SPEC-153" /%}, {% ref "SPEC-156" /%}). Each one is
valuable on its own and does not depend on composition landing. Composition itself
is deliberately **not** in this milestone.

## Why

**A resolver over-matches today, and it reaches the JSON-LD graph.**
`findChildren` matches a schema `children` key against `data-rune` anywhere in the
subtree, so an author's own `{% track %}` nested inside a `{% playlist %}`'s unrelated
content is published as one of the playlist's tracks
({% ref "SPEC-146" /%} Problem 1). This is the only live correctness defect among the
specs, and it ships first.

**Registration is data tables written as switch statements.** Storytelling's
`register`/`aggregate` hooks are a generic walk plus two switches whose every arm is a
field list ({% ref "SPEC-144" /%}). Three declaration shapes replace them, and once
they exist a rune can enter the cross-page graph without a plugin hook.

**Labelling restates the content model.** 58 of 93 `refs` keys exactly match a
declared content-model field name ({% ref "SPEC-143" /%}). For entity-shaped runes the
transform is four rules and a list, and the declaration already holds most of them.

**Preprocess order is a guess maintained by hand, and it guesses wrong once.**
Three whole-AST passes in a fixed order cannot express `data` → `snippet`
({% ref "BUG-027" /%}). Resolving them in tree order derives the ordering from node
position and fixes that bug as a by-product ({% ref "SPEC-141" /%}). It was held out
of v0.38.0 only because v0.37.0 was rewriting the same file, and that work is finished.

## What lands

Ten work items in four groups, plus four bug riders:

- **Name resolution** (2) — {% ref "WORK-609" /%} fixes the `findChildren` over-match and introduces the ownership marker; {% ref "WORK-610" /%} uses the marker so `findAllByName` can see owner-marked content across a boundary, and must be inert today.
- **Declarative registration** (3) — {% ref "WORK-611" /%} adds `registers.entity` / `registers.edge` and the core hook; {% ref "WORK-612" /%} and {% ref "WORK-613" /%} migrate storytelling and design.
- **Declarative slot labelling** (3) — {% ref "WORK-614" /%} adds the slot declaration and the generated transform; {% ref "WORK-616" /%} (`work`, `bug`, `decision`) proves it on the resolved-entry side of the `emitTag` split. {% ref "WORK-617" /%} (`character`, `realm`, `faction`) is **cancelled**: on contact all three failed SPEC-143's D4 family test (nested named nodes, pick-by-node-kind, filtering rendered output, a merge across two slots), so they are deferred to the composed-runes work ({% ref "SPEC-145" /%} / {% ref "SPEC-147" /%}), which replaces them rather than declaring their current transforms. The `emitTag` side is covered by the mechanism's own tests.
- **Tree-order preprocess** (2) — {% ref "WORK-615" /%} removes snippet's figure wrapper (breaking output change, changeset); {% ref "WORK-618" /%} replaces the three passes with one walk.
- **Riders** (4) — all `major`:
  - {% ref "BUG-027" /%} — closed by WORK-618.
  - {% ref "BUG-018" /%} — `breadcrumb auto` loses every ancestor below depth 1. Check the suspected `pageTree` blast radius first.
  - {% ref "BUG-025" /%} — grouping by a multi-value field keys on the joined string.
  - {% ref "BUG-028" /%} — `figure` drops non-image children. **Decided: `figure` becomes a general captioned container** (see the bug's Decision section). That also gives authors the chrome WORK-615 takes away from standalone snippets.

## The acceptance test does most of the work, again

As in v0.38.0, `contracts/structures.json` and `contracts/seo-baseline/baseline.json`
are the gate. The required diff differs per group, and confusing those
expectations is the main risk in this milestone:

| Item | Contracts | SEO baseline |
|---|---|---|
| WORK-609 | none | **a reviewed diff** — the fix is supposed to move it (SPEC-146 D3) |
| WORK-610, WORK-614/616, WORK-618 (WORK-617 cancelled) | none | none |
| WORK-611/612/613 | none | none — plus a byte-identical **registry** snapshot, order included (SPEC-144 D4) |
| WORK-615 | the wrapper removal only | none |
| BUG-018, BUG-028 | expected to move; reviewed | expected to move; reviewed |

A refactor row that moves either file has changed behaviour, whatever the intent.

## Sequencing inside the milestone

- WORK-609 → WORK-610: the marker is introduced by the first.
- WORK-611 → WORK-612, WORK-613.
- WORK-614 → WORK-616. (WORK-617 was cancelled — see above.)
- WORK-615 → WORK-618 → BUG-027 (SPEC-141 D5: the wrapper goes first, separately).
- WORK-612 and WORK-617 both rewrote the storytelling plugin, so they were to land one after the other. With WORK-617 cancelled, WORK-612 has the plugin to itself.

The four groups are independent of one another and can run in parallel.

## Deliberately not here

**Declarable sentinel resolution** — SPEC-144's revised D2 and its two related
criteria. Registration is the self-contained half. The sentinel half migrates five
core `postProcess` instances, `buildAutoBreadcrumb` among them, and BUG-018 changes
that function in this milestone. It stays in the spec for a follow-up.

**{% ref "SPEC-142" /%}** — inferring the transform signature. It would type the slot
declaration, so it reads better after SPEC-143 settles that declaration's shape.

**{% ref "SPEC-145" /%} and the composition programme** (SPEC-147–159). This
milestone builds their prerequisites. The programme is the next milestone's subject.

**`unwrap`, and expected-slot diagnostics.** SPEC-143 names both as candidates and
neither as criteria. The mechanism proves itself on labelling alone first.

{% /milestone %}
