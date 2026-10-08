{% spec id="SPEC-147" status="draft" tags="runes, composition, storytelling, plugins, feasibility, 1.0" %}

# Replacing the storytelling plugin with composed runes

## Summary

The storytelling plugin is the best candidate for retirement in favour of
author-defined composed runes ({% ref "SPEC-145" /%}): eight runes, entirely
domain-specific, with no consumer outside its own fixtures. This spec audits whether
that is achievable, and finds it is — with three small additions and one relocation,
two of which turn out to be adoption problems rather than missing capability.

It also argues for **replace rather than delete**, and treats that distinction as the
substance rather than a caveat.

## Replace, not delete

The obvious framing — remove `plugins/storytelling/` before 1.0 — is the wrong one,
because those runes are not a cost. They are the reference implementation and part of
the drift-detection corpus: `character`, `faction`, `lore`, `plot` and `realm` are
**5 of the 30 emitting runes** in `contracts/seo-baseline/`, and that baseline is what
proves {% ref "SPEC-146" /%}'s zero-diff gate and SPEC-145's no-drift criteria. Delete
the plugin and the evidence that the replacement works goes with it.

So: **reimplement storytelling as composed runes alongside the plugin**, as a parallel
fixture set, and require the composed output to be explained against the plugin's
recorded baseline. Every bit of validation, none of the risk, and deletion becomes a
separate one-line decision available at 1.0 or deferrable indefinitely.

This is {% ref "ADR-035" /%}'s argument applied to runes rather than themes: a format
the reference implementation does not use is a format that rots. Storytelling is the
largest coherent body of runes available to exercise composition, and exercising it is
worth more than the lines saved by removing it.

## What the plugin actually contains

2,106 lines: 319 config, 319 pipeline, 1,132 across the eight files in `tags/` — of which `common.ts` is 122 lines of shared helpers, so the seven rune modules are 1,010 — and 336 elsewhere
helpers and manifest. The imperative residue across all eight runes is **one** custom
content model (`storyboard`) and **one** `postTransform` (`plot`).

| Rune | Status against what is specced |
|---|---|
| `lore` | Clean — simplest shape |
| `bond` | Clean — {% ref "SPEC-144" /%}'s `edge` declaration; already SPEC-145's worked example |
| `character` | Registration ✓; its `character-section` child rune is replaceable by `{% section %}`; CSS caveat below |
| `realm`, `faction` | Same shape; their split maps to `{% mediatext %}` |
| `beat` | Carried by `plot`'s item model, not separately blocked |
| `plot` | Two apparent blockers, **both already have core primitives** — see below |
| `storyboard` | Genuinely blocked, and probably not a storytelling rune at all |

## Finding 1 — `plot` needs no new primitive; it bypasses two that exist

**The marker grammar is already core and already generic.** `checklist?: boolean`
(`packages/transform/src/types.ts:444-449`): *"When true, the identity transform scans
`<li>` text for `[x]`, `[ ]`, `[>]`, `[-]` markers, strips them, and emits
`data-checked`… Detection also applies **generically to all list items**."* Those are
plot's four beat markers exactly. Plot's `itemModel` regex `/^\[(x|>|\s|-)\]\s*/` is a
second implementation — plot wants the status as a *typed attribute* on `beat`, which is
a real and different requirement, but the vocabulary was never plot's to invent.

**The connected-sequence rendering is already core, and six runes use it.**
`sequence?: 'numbered' | 'connected' | 'plain'` (`types.ts:451-455`) emits
`data-sequence` on `<ol>` via `annotateSequence`, which recurses through wrappers:

| Value | Runes |
|---|---|
| `connected` | `business/Timeline`, `places/ItineraryDay` |
| `numbered` | `learning/HowTo`, `learning/Recipe`, `marketing/Steps`, `media/Playlist` |

`plot` is the seventh and the only imperative one. **The gap is one field lacking its
sibling's shape:** `sequence` takes a literal, while `sequenceDirection` two lines below
takes `{ fromModifier: string; default?: string }`. Plot needs the value keyed on
`structure === 'linear'`, so it reached for `postTransform` (`plugins/storytelling/src/config.ts:243`).

Giving `sequence` the form `sequenceDirection` already has deletes that `postTransform`
— one of only four in the codebase — and is exactly {% ref "ADR-036" /%}'s pattern: the
declarative sibling already exists, in the same interface, two lines away.

## Finding 2 — `storyboard` does point at a new primitive, and it is justified by eight sites

`convertStoryboardChildren` (`plugins/storytelling/src/tags/storyboard.ts:54`) is *flush
the current group when a node matching a predicate appears, otherwise append*. Stripped
of domain, that is **segmentation of a flat node sequence on a boundary node type**.

It is the same shape as `groupByHeading`, which {% ref "WORK-603" /%} counts at **seven
sites** — `tint.ts:39`, `map.ts:138`, `palette.ts:132` and `:282`, `spacing.ts:85` and
`:230`, `bento.ts:311`. Storyboard is the eighth, differing only in boundary type:
`heading` for seven, `image` for one.

Eight implementations across core and five plugins clears {% ref "ADR-030" /%} rule 5a's
"three existing implementations" bar for a consolidating addition. And it is a **content
model**, not a topology, so it belongs in {% ref "SPEC-003" /%}'s vocabulary:

```yaml
content:
  type: segmented
  boundary: image          # or: heading
  emitTag: storyboard-panel
```

**This is better value than WORK-603's utility version of the same consolidation**, because
a declarative content model serves composed runes as well as TypeScript ones, while a
utility serves only the latter. Worth weighing against WORK-603 rather than doing both.

## Finding 3 — `storyboard` is not a storytelling rune

Once it is a segmented content model producing captioned panels, it contains no narrative
content of any kind: it is a captioned-media container, which is `gallery`'s
neighbourhood. `gallery` does not do this today — its content model is plain
`body: any, greedy` with an imperative transform — so a segmented model would plausibly
simplify `gallery` rather than merely relocating `storyboard`.

**Moving `storyboard` to core beside `gallery` removes it from this spec's scope
entirely**, which is the cleanest resolution: it stops being something the replacement
has to cover.

## Finding 4 — one capability would be silently lost

`plugins/storytelling/src/pipeline.ts:268-318` does **entity auto-linking**: it walks the
page, finds `<strong>` text matching a registered entity name, and wraps the first
occurrence in a link to that entity's page — skipping headings, code, and nested runes.

SPEC-144 D2 explicitly excludes this: *"this spec does not add a way to declare a
`postProcess` sentinel resolution — that is where the remaining storytelling pipeline
code lives, and it stays imperative."* And core has no equivalent: its `postProcess`
hooks cover `expand`, `collection`, `aggregate`, `file-ref` and breadcrumb, with **no
implicit entity linking anywhere**.

So retiring the plugin as specced *loses a feature*. But the code is entirely
domain-agnostic — nothing in it knows about stories — so the answer is to promote it to
core, opt-in per entity type or per site. `xref` already exists as the **explicit** form,
which gives this a natural name and home as the implicit one. Promoting it removes the
blocker and gives every plugin a capability only storytelling has today.

*Measured by {% ref "WORK-625" /%} (2026-10-08).* The promotion has a constraint the plugin's
walk does not meet. Today's walk skips nested runes and lets only the page's top-level rune
through. A composed `character` places its author's prose inside `{% card %}`, which is nested,
so the two cross-links the registry snapshot records inside character pages are not made. The
core form has to treat a composition's placed primitives as part of the composed rune: for
example, by keying on the slot markers (`data-slot`) rather than on `data-rune` depth.

*Measured again by {% ref "WORK-635" /%}.* The loss follows from the primitive, not from
composition. A composed `lore` places no primitive: its body slot sits directly in the composed
rune's own `<article>`. So the snapshot's cross-link inside the lore page (`Witch`) is made, and
the registry snapshot's `links` are reproduced exactly.

## Finding 5 — the CSS has an answer, and it is {% ref "ADR-035" /%}'s companion

Lumina carries **413 lines** across `character`, `realm`, `faction`, `lore`, `plot`,
`bond` and `storyboard`. Most is shared-dimension routing already — `character.css`'s own
comment says *"the title and the role/status def-list come from the shared dimensions;
only the floated portrait avatar is character-specific chrome."*

The distinctive remainder is real, though: a floated circular avatar,
`character-section`'s border-top separator, and `plot`'s 106 lines. A composed rune ships
no CSS (SPEC-145 D2), so naively this is a visual regression.

**SPEC-145 D16 is the way out.** `contextModifiers` keys on the parent's kebab `data-rune`,
and a composed rune sets its own, so Lumina keeps the CSS and re-keys it:
`.rf-character__portrait` becomes `.rf-figure--in-character`. A mechanical migration, not
a loss, and no new mechanism. This is the strongest practical evidence that D16 was worth
recording.

## Finding 6 — two behaviours of the entity runes have no composed equivalent

Found when {% ref "WORK-617" /%} tried to move `character`, `realm` and `faction` onto
SPEC-143's slot declaration and was cancelled. Most of what blocked that attempt is
answered here already: the nested scene image is `{% mediatext %}`'s ordinary shape;
`extractScene`'s image-or-prose split is the split `mediatext`'s own transform makes;
and the section-type filter is `{% section %}`. Two behaviours were not covered. All
three runes share them through `buildStoryContent`
(`plugins/storytelling/src/tags/common.ts:85`).

**Body content is kept only when there are no sections.** `buildStoryContent` collects
the rune's leftover body nodes. If no child is a section rune, they are appended to
`body`. If any child is one, every non-section leftover is discarded:

```ts
if (!hasSections) bodyNodes.push(...sectionNodes.toArray());
```

So a paragraph an author writes between two `{% character-section %}` blocks renders
without sections and vanishes with them. That is silent content loss of the kind
{% ref "BUG-028" /%} fixed in `figure`, not a design. A Markdoc template cannot
express it either way, because it is a conditional over the content. The composed
runes will render that content. That is the correct behaviour and a recorded
difference, not a regression to preserve.

**Sections are also published as `data-field="section"`.** Each rune passes its
section runes through `properties` as well as `refs`
(`...(hasSections ? { section: sections } : {})`), so `createComponentRenderable` stamps
`data-field="section"` on every child section rune. Nothing in the repository reads
it: no schema row maps `section`, and neither the engine, Lumina's CSS nor the editor
selects on it. The composed runes have no reason to reproduce it, but "nothing in the
repo reads it" is not "nothing reads it". Downstream themes or tooling may select on
it, so dropping it is a difference to state, not to skip.

Neither needs a new primitive. Both are differences under D2, and they are named here
so they are explained rather than rediscovered.

## Decisions

### D1 — replace alongside, delete separately

The composed implementation ships beside the plugin, with its own fixtures, and the
plugin stays until a later explicit decision. Deletion is not part of this spec's scope
and does not gate 1.0.

### D2 — the composed output is compared against the plugin's baseline, difference by difference

Not "byte-identical" — the arrangements will differ, deliberately (`{% section %}` in
place of `character-section`, `{% mediatext %}` in place of the split). The gate is that
**every difference is explained**, in the same spirit SPEC-145 sets for its own spike.
The 5 storytelling fixtures already in `contracts/seo-baseline/` are the reference.

### D3 — `storyboard` leaves storytelling rather than being composed

It is a captioned-media container, not a narrative rune (Finding 3). Relocating it to
core beside `gallery` is a smaller and more honest change than composing it in place,
and it removes the hardest item from this spec.

### D4 — two of the four blockers are adoption, not absence, and are treated as such

`checklist` and `sequence` both exist and are in use. Plot's bespoke versions predate or
bypass them. The work is a one-field extension plus a migration, not a new primitive —
and stating that distinction is the point, because proposing a primitive that already
exists is the failure mode this audit hit twice before catching itself.

### D5 — entity auto-linking is promoted to core before the plugin is retired

Not reimplemented per-composition and not dropped. It is domain-agnostic already, and
`xref` gives it a name as the implicit counterpart to the explicit form.

### D6 — the composed runes keep all authored body content, and drop the `section` field stamp

Finding 6's two behaviours are not reproduced. Content written alongside sections
renders in the composed runes, where the plugin discards it. The plugin is not patched
to match: D1 keeps it unchanged, and its baseline records today's output. The
`data-field="section"` stamp is not emitted. Both are differences explained under D2.
The stamp's removal is also named in the changeset that ships the composed runes,
because it is the one difference a downstream consumer could notice in markup.

## Status after v0.40.0

Two of the thirteen criteria have work behind them, and this spec stays `draft`.
{% ref "WORK-624" /%} composed `bond` and {% ref "WORK-625" /%} composed `character`. Both ship
beside the plugin as test fixtures (D1), and every difference from the plugin is explained (D2).
`plan validate` suggests advancing to `implemented` because both linked items are done. They
cover only the two slices, so that warning is expected until the rest of the runes are composed.

## Implementation notes, deliberately not yet work items

Kept here rather than filed, so the milestone that adopts this decides its own breakdown
rather than inheriting dangling items. Four pieces, in dependency order:

1. **`sequence` gains `{ fromModifier, default }`** — the shape `sequenceDirection`
   already has, in the same interface. Deletes `plot`'s `postTransform`. Small, and
   independently useful to any rune wanting a modifier-keyed sequence style.
2. **A `segmented` content model** in {% ref "SPEC-003" /%}'s vocabulary, with a boundary
   node type. Retires `groupByHeading`'s seven loops as well as unblocking `storyboard`;
   weigh against {% ref "WORK-603" /%}'s utility form rather than shipping both.
3. **Entity auto-linking promoted to core**, opt-in, as implicit `xref` (Finding 4).
4. **`storyboard` relocated** to core beside `gallery`, using (2) (Finding 3).

Plus the dependency chain this spec sits on: {% ref "SPEC-146" /%} →
{% ref "SPEC-145" /%}, with {% ref "SPEC-144" /%} independently.

## Non-goals

- Deleting `plugins/storytelling/` — explicitly out (D1)
- Gating 1.0 on the deletion; this spec gates only on the replacement existing and being explained
- Retiring any other plugin — the same audit would have to be run for each, and their shapes differ
- Composing `storyboard` (D3)
- Declaring `postProcess` in general; only the one named capability is promoted (D5)
- Changing `checklist` or `sequence`'s existing semantics — the extension is additive

## Acceptance Criteria

- [ ] Every storytelling rune except `storyboard` exists as a composed rune, with fixtures
- [ ] The composed fixtures are compared against the plugin's recorded baseline and every difference is explained in writing (D2)
- [ ] `plugins/storytelling/` is unchanged and still passing its own tests at the end of the work (D1)
- [ ] `plot` has no `postTransform`, and its sequence style is declared via `sequence`'s modifier-source form
- [ ] `plot`'s beat markers resolve through the core `checklist` detection rather than a rune-local regex, or the reason they cannot is recorded
- [ ] `groupByHeading`'s seven sites are retired by the same `segmented` model that unblocks `storyboard`, or the decision to keep both forms is recorded with its reason
- [ ] Entity auto-linking works for a non-storytelling entity type, proving it is domain-agnostic (D5)
- [ ] `storyboard` renders from core with its existing fixture unchanged (D3)
- [ ] Lumina's storytelling CSS is re-keyed through `contextModifiers` and the composed runes render with no unstyled regressions, or each accepted visual change is listed
- [ ] A composed `character`, `realm` and `faction` with both sections and other body content renders that content, and the plugin's discarding of it is recorded as an explained difference (Finding 6, D6)
- [ ] The composed runes emit no `data-field="section"` on their sections, and the changeset shipping them names the removal (Finding 6, D6)
- [ ] The `sequence` adoption count is re-measured after the work — six runes today; a seventh that still hand-rolls it is a finding, not a detail
- [ ] The rune authoring guide states the standing rule: measure adoption of an existing primitive before proposing a new one (D4)

## References

- {% ref "SPEC-145" /%} — composed runes; the mechanism this exercises, and D16's CSS answer
- {% ref "SPEC-144" /%} — entity and edge registration; covers storytelling's `register` / `aggregate`
- {% ref "SPEC-146" /%} — name resolution across boundaries; a dependency of SPEC-145
- {% ref "ADR-037" /%} — users author composed runes only; why this is the shape of the replacement
- {% ref "ADR-036" /%} — name the pattern, do not open a language; the rule Finding 1 follows
- {% ref "ADR-030" /%} — arrangements and variants; rule 5a, the bar Finding 2 clears
- {% ref "ADR-035" /%} — a format the reference implementation does not use is a format that rots; `rejected`, and now its own best example
- {% ref "SPEC-003" /%} — the declarative content model the `segmented` addition belongs to
- {% ref "WORK-603" /%} — `groupByHeading`'s seven sites, and the utility form to weigh against
- {% ref "SPEC-148" /%} — the places audit; the second data point for the misfiled-capability finding, and the per-property method this spec predates
- {% ref "SPEC-149" /%} — the business audit; a plugin with no misfiled capability, qualifying the pattern to "at most one"
- {% ref "SPEC-150" /%} — the design audit; contrasts this spec's promotable `postProcess` against one that correctly stays plugin code

- {% ref "SPEC-154" /%} — the learning audit; `glossary` is the unbounded `postProcess` case, against this spec's bounded one
- {% ref "SPEC-158" /%} — the identity guard's granularity, settled alongside SPEC-144 D2's revision
- {% ref "WORK-617" /%} — cancelled; the slot-declaration attempt on the entity runes whose evidence is Finding 6
- {% ref "BUG-028" /%} — `figure`'s silent content loss, the same kind as Finding 6's first behaviour
- {% ref "SPEC-159" /%} — chrome as intent; `storyboard`'s `variant` is removed there, and its chrome is measured to survive composition regardless

{% /spec %}
