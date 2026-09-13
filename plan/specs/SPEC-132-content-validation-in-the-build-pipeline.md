{% spec id="SPEC-132" status="draft" tags="validation, markdoc, pipeline, runes, dx" %}

# Content validation in the build pipeline

Every rune schema in refrakt declares required attributes, typed attributes and
`matches` enums. Markdoc can check all of them. Nothing in the build asks it to,
so the declarations are documentation that the pipeline itself ignores —
`{% ref "BUG-014" /%}`.

This spec wires `Markdoc.validate()` into the content pipeline and routes its
findings through the diagnostics surface that already exists.

## Problem

{% ref "BUG-014" /%} carries the full evidence. In summary: `Markdoc.validate()`
never sees site content, four error classes pass through
`transform()` in silence, the custom attribute-type validators in
`packages/runes/src/attributes.ts` and `plugins/media/src/attributes.ts` never
execute in a build, and `refrakt validate` checks theme config rather than
content.

The sharpest consequence is `tag-undefined`: a mistyped or renamed rune is not
an error, it **renders its children as prose and vanishes**. A site author sees
a page missing a block, with nothing anywhere telling them why.

### The absence already distorts a shipped design

{% ref "BUG-011" /%}, fixed in v0.33.0, is this spec's thesis arrived at
independently from the other end. `{% data %}`'s empty-result **error** was
doing double duty as a typo detector, because `applyWhere` had no warning of its
own for a clause naming a field the data lacks:

| `where` | author meant | before the fix |
|---|---|---|
| `scope:nope` | valid field, legitimately no matches | **error** |
| `scop:own` | typo'd field name | **error** |

Two conditions, one signal, and it was wrong about the legitimate one. The bug
puts it plainly: the check "cannot be relaxed on its own, because it is the only
thing standing between an author and a silently wrong page."

That is what a missing validation layer costs. With nothing catching a typo,
an unrelated check gets overloaded into the role and fails at its own job. The
fix gave `data` its own per-clause warning — the right answer locally, and also
a demonstration that this keeps being solved one rune at a time.

### This is a product defect before it is a repo defect

Scanning `site/content` found **zero** genuine unknown tags across 124 distinct
tags in prose. There is no backlog of latent breakage in our own documentation,
and this spec should not be sold as if there were.

The case rests on users. Refrakt ships to sites we never see, authored by people
who mostly do not have the VS Code extension installed. For them the entire
validation surface is currently unreachable. Every rune schema's `required`,
`matches` and type declarations are promises the framework does not keep.

## What already exists

Almost all of it, which is why this is wiring rather than construction:

| Piece | State |
|---|---|
| `Markdoc.validate()` | Called in the language server, and over the fixture corpus in `packages/runes/test/fixture-corpus.test.ts` — never on site content |
| A working precedent | `fixture-corpus.test.ts` already does validate + transform-does-not-throw over 40 fixtures, under `npm test`, with a variables bag and no false positives |
| Rune attribute schemas (`required`, `matches`, types) | Complete, ~175 tags |
| Custom attribute validators | Written; never execute in a build |
| Diagnostics surface (`ctx.info` / `warn` / `error`) | Exists — `packages/content/src/site.ts:301` |
| `PipelineWarning` — severity, phase, `pluginName`, url, message | Exists — `packages/types/src/pipeline.ts:156` |
| A display surface for those warnings | Planned — {% ref "WORK-395" /%}'s editor validation rail, which {% ref "SPEC-098" /%} also depends on |

The gap is a call and a routing decision, not a new subsystem.

## Proposal

### Validate where the tag set is assembled

`packages/content/src/site.ts` builds the merged tag set, nodes, functions and
variables into one config and hands it to `Markdoc.transform`. Validation goes
at that same point, against that same config — the only place guaranteed to see
what the transform actually sees, including plugin runes.

Findings map onto the existing diagnostics surface rather than a new channel:
`ValidateError.error.level` (`critical` / `error` / `warning` / `info`) drives
`ctx.error` / `ctx.warn` / `ctx.info`, carrying the page URL that surface
already takes.

### Nothing is rendered into the page

Findings become `PipelineWarning`s and go no further. Display is
{% ref "WORK-395" /%}'s editor validation rail, which already exists as planned
work — see D9 for why that is the right surface rather than a fallback.

Two earlier drafts of this section are withdrawn, and both for the same reason.
The first routed findings into the `error` rune ({% ref "WORK-555" /%} now
removes it); the second reached for `snippet`'s error fence. Neither fits: both
*replace* content that could not be produced, whereas a validation finding
annotates content that rendered perfectly well. Putting a diagnostic into the
flow of a page that is otherwise fine is worse than putting it beside the page.

Whether the *build* also fails is deliberately not decided here — see D3.

### Stage the error ids

Not all at once, because they carry different risk:

| Phase | Error ids | Why this order |
|---|---|---|
| 1 | `tag-undefined`, `attribute-undefined` | No prerequisites. Highest value — the vanishing-rune case. |
| 2 | `attribute-value-invalid`, `attribute-missing-required`, `attribute-type-invalid` | Activates the dormant custom validators; needs the blast radius measured first. |

`variable-undefined` is **not staged here at all**. An earlier draft had it as a
third phase; D4 explains why it is not sequenced work but an unanswered
research question.

## Design decisions

**D1 — Validate in the pipeline, not as a CLI command.** {% ref "SPEC-126" /%}
established that this repo's `--check` flags do not run and its tests do.
A `refrakt validate --content` would be a third guard nobody invokes. Validation
belongs where the content is already being processed, so it cannot be skipped.

This also means `refrakt validate`'s current scope (theme config + manifest)
should be documented as what it is, or the command renamed. Adding content
validation *to* it would deepen the confusion, not fix it.

**D2 — Reuse the diagnostics surface; invent nothing.** `ctx.error` / `warn` /
`info` already exist, already carry a page URL, and already funnel to callers.
Wiring into them is strictly less work than any new mechanism and leaves one
place to reason about.

**D3 — Whether errors fail the build is out of scope until
{% ref "WORK-554" /%} answers what error severity currently does.** This spec
deliberately does not assert that validation "fails CI", because nobody has
established that an error-severity diagnostic fails anything. Asserting it would
repeat {% ref "SPEC-126" /%}'s finding in a new place: a guard that reports into
a void.

{% ref "WORK-554" /%} settles it, including the blast radius — how many error
diagnostics a clean build already emits. Phase 1 can land as diagnostics
regardless; the consequence is a separate, informed decision.

**D4 — `variable-undefined` is out of scope, and not because it is large.**
An earlier draft of this spec called it "blocked on a complete per-page variable
bag". That was wrong: **there is no bag that completes.**

Markdoc's variable checking is all-or-nothing, measured:

| config | result |
|---|---|
| no `variables` key | check skipped entirely |
| `variables: {}` | *every* reference flagged |
| incomplete bag | false positives on the missing ones |

The fatal detail is that it validates the **full path**, not the root. Seeding
the roots does not rescue it:

```js
variables: { item: { data: { title: 'x' } }, row: {} }
→ "Undefined variable: 'item.data.description'"
→ "Undefined variable: 'row.name'"
```

And most variable use in real content is **scope-local**, bound per iteration
inside a rune's body template rather than in the page config. Counting roots
across `site/content` with fences stripped: `$item` 88 uses, `$row` 62,
`$page` 37, `$file` 35, then a tail of `$r`, `$count`, `$shown`, `$kind`, `$q`,
`$amount`, `$fieldName`, `$heading`. `$item` and `$row` alone are about 150 of
roughly 260 references, and both come from collection templates, deferred
bodies, entity routes, and — since {% ref "SPEC-127" /%} shipped in v0.33.0 —
`data`'s per-row templates.

`Markdoc.validate()` has no scope model. It cannot know that a subtree has extra
variables bound, and the valid paths under `$item.data.*` are whatever each
entity's frontmatter happens to contain: author-defined, per page, per
collection, **not knowable statically**.

That leaves three options, none of them a phase of this spec:

1. Teach validation about rune-local scopes — walk the tree, have each rune
   declare what it binds. A real feature with a declarative surface.
2. Skip validation inside template subtrees — which is where most variables
   live, leaving the check nearly worthless.
3. Drop `variable-undefined` permanently.

{% ref "SPEC-127" /%} adding `$row` shows the scope-local surface is growing, so
option 1 gets more expensive over time rather than less. Deciding between them
needs its own investigation and its own spec; sequencing it as "phase 3" would
imply it is scheduled work when it is an open question.

**D5 — Validation must be disableable, and the escape hatch must be narrow.**
Users have content we cannot anticipate, and a framework that refuses to build
their site over a diagnostic they disagree with is worse than one that stays
quiet. A config switch (per-site, and per-error-id) is required. It should not
be per-page or per-tag: that granularity invites suppressing the symptom at the
one call site that revealed a real bug.

**D6 — The language server's variable blind spot is correct behaviour, not a
bug.** It passes `tags` and `nodes` with no `variables`, so by D4's table it
skips variable checking entirely. An earlier draft called this a blind spot to
fix "once the pipeline assembles a complete bag". Given D4, that moment never
arrives — and skipping the check is exactly what avoids flagging every
`$item.data.*` in an author's collection template while they type it.

So the LSP is left alone here. What does still hold is the narrower point
underneath: the LSP and the pipeline should not disagree about which **tags and
attributes** are valid. If they drift, that is a bug — but they currently build
their tag sets from the same catalog, so there is nothing to fix today. Recorded
so a future change that gives one of them a different tag set is recognised as a
regression.

**D7 — Fenced examples must stay exempt.** `escapeFenceTags` already neutralises
tags inside fences before parsing, so `site/content`'s 152 markdoc fences are not
at risk. Recorded because it is the first thing that would break if fence
handling were ever reordered relative to validation, and because a validation
pass that flagged every documentation example would be abandoned within a day.

**D8 — Follow `fixture-corpus.test.ts`, which already proves the pattern.**
`packages/runes/test/fixture-corpus.test.ts` (WORK-414 / {% ref "SPEC-102" /%})
runs `Markdoc.validate()` over 40 rune fixtures with a variables bag, filters to
error/critical, asserts empty, and additionally asserts `transform` does not
throw. It runs under `npm test` and it works. This spec is largely that test's
approach pointed at content instead of fixtures.

Two things it does **not** prove, and which should not be inferred from it. Its
fixtures do not use `$item`, so its clean run says nothing about D4's false
positives on collection templates. And a test over a fixed corpus is not the
same as validation inside the pipeline a user runs — the corpus test protects
*our* fixtures, which is why it did not catch any of this.

**D9 — Findings go to the warning channel; display belongs to the editor, not
this spec.** The earlier open question — page, log, or both? — is answered by
work that already exists.

{% ref "WORK-395" /%} pipes `PipelineWarning`s through to an editor validation
rail: severity, message, source plugin, a count badge, and inline indicators on
the specific block a warning is attributable to. {% ref "SPEC-098" /%} names it
"the warning channel" and depends on it. So the in-page surface is a planned
feature with an owner, and it is a *better* surface than anything this spec
would invent: a rail beside the page beats an error row wedged into content that
rendered fine.

This spec therefore emits `PipelineWarning`s and stops. No error fence, no
in-page node, no new display. That also settles the objection that raised the
question: a validation finding annotates working content rather than replacing
broken content, so it does not belong *in* the flow.

Two concrete consequences for the implementation:

- `PipelineWarning.phase` is `'register' | 'contribute' | 'aggregate' |
  'postProcess'`. Validation is none of these, so the union needs a new member.
- `PipelineWarning.pluginName` is required, and core validation findings come
  from no plugin. They need an agreed value — `'core'` matches how
  `reference.ts` already groups core runes.

**D10 — Plugins need no new validation surface, because they already have two.**
Every pipeline hook receives a `ctx` carrying `info` / `warn` / `error`, and
`PipelineWarning` already has a `pluginName` field, so a plugin can emit a
validation-shaped diagnostic today and have it attributed. Separately, Markdoc's
validation is schema-driven and plugins already supply their own schemas — a
plugin wanting stricter checking tightens its own `required` and `matches`,
declaratively, with no API at all.

What is deliberately not offered is plugin-contributed *Markdoc validators*
(custom rules run inside `validate()`). Nothing needs it, both existing routes
cover the real cases, and adding it would mean versioning a rule API.

**D11 — `critical`, `error` and `warning` are distinct, and must not be
collapsed.** Extracted from Markdoc's own source, every id it can emit:

| level | ids | meaning |
|---|---|---|
| `critical` | `parse-error`, `missing-closing`, `missing-opening`, `table-syntax`, `tag-placement-invalid`, `tag-selfclosing-has-children`, `function-undefined` | the document could not be **understood** |
| `error` | `attribute-undefined`, `attribute-missing-required`, `attribute-type-invalid`, `attribute-value-invalid`, `variable-undefined`, `slot-*`, `parameter-*`, `href-format-invalid`, `no-inline-annotations`, `fence-tag-error` | it parsed, but violates a **schema** |
| `warning` | `child-invalid`, `duplicate-attribute` | suspicious, not wrong |

The split is real and useful: `critical` is structural and not a matter of
preference, so it should **not** be suppressible through D5's per-error-id
switch. `error` is the configurable band. Note that all four of this spec's
phase 1 and 2 ids are `error`, never `critical`.

**This surfaces a defect.** Refrakt's own custom validators — both in
`packages/runes/src/attributes.ts` and both in `plugins/media/src/attributes.ts`
— return `id: 'attribute-type-invalid'` at `level: 'critical'`, while Markdoc
emits that same id at `level: 'error'`. The same failure is reported at two
different severities depending on which code path produced it. Harmless while
nothing reads severity; wrong the moment this spec makes severity load-bearing.
Correct them to `'error'` as part of phase 2, when those validators first
execute.

## Non-goals

- **Deciding build-failure semantics.** D3; {% ref "WORK-554" /%} first.
- **`variable-undefined`, and scope-aware variable validation generally.** D4. Not deferred to a later phase of this spec — it needs its own spec, starting from whether scope-aware validation earns its cost.
- **Validating the docs' fenced examples.** A related and worthwhile guard — the
  markdoc-fence test — but a repo script over `site/content`, not a pipeline
  feature. Separate work.
- **Renaming or repurposing `refrakt validate`.** Noted in D1 as a follow-up.
- **New error classes.** This wires up what Markdoc already reports; it does not
  invent refrakt-specific validations.
- **Fixing the `NaN` in `SpaceSeparatedNumberList.transform`.** Enabling
  validation makes the guard fire, but the unguarded `parseInt` is its own small
  defect; see {% ref "BUG-014" /%}.

## Acceptance Criteria

- [ ] `Markdoc.validate()` runs in the content pipeline against the same assembled config the transform uses, including plugin runes
- [ ] Findings route to the existing `ctx.error` / `ctx.warn` / `ctx.info` surface, mapped from `ValidateError.error.level`, carrying the page URL
- [ ] Findings are emitted as `PipelineWarning`s and nothing is rendered into the page — display is {% ref "WORK-395" /%}'s (D9)
- [ ] `PipelineWarning.phase` gains a member for validation, and core findings carry an agreed `pluginName`
- [ ] `critical` findings are not suppressible by the D5 switch; `error` findings are (D11)
- [ ] The four custom validators emitting `attribute-type-invalid` at `critical` are corrected to `error`, matching Markdoc (D11)
- [ ] Phase 1 ids (`tag-undefined`, `attribute-undefined`) are enabled and covered by tests
- [ ] Phase 2 ids are enabled only after the blast radius across `site/` and `plan-site/` is measured and recorded
- [ ] The dormant custom attribute validators demonstrably execute once phase 2 lands — a test proves `SpaceSeparatedNumberList` rejects non-numeric input in a build
- [ ] `variable-undefined` is never enabled, and a test pins that — asserting no findings on a collection template using `$item.data.*` (D4)
- [ ] Validation is disableable per site and per error id; not per page or per tag
- [ ] A test asserts fenced examples are exempt, pinning the `escapeFenceTags` ordering
- [ ] A clean build of `site/` and `plan-site/` emits zero unexpected findings

## Approach

0. **{% ref "WORK-554" /%} first.** Everything about consequence depends on it.
1. **Phase 1** — the call, the severity mapping, the `PipelineWarning` phase
   member, and the two safe ids. Independently shippable and already the
   majority of the value.
2. **Phase 2** — measure the blast radius, then enable the attribute ids, and
   correct the four over-escalated custom validators (D11). This is where the
   dormant validators wake up, so expect findings.

There is no phase 3. The two phases above are the whole spec, which makes its
acceptance criteria usable as milestone exit conditions rather than a mix of
scheduled and speculative work.

**Budget the blast radius, not the wiring.** The call itself is a few lines.
The work is whatever phase 2 turns up across two dogfooded sites.

## Open questions

All three questions this spec opened are now answered — in D9 (display belongs
to {% ref "WORK-395" /%}), D10 (plugins already have two routes) and D11 (the
levels are distinct, and our own validators over-escalate). One question
surfaced while answering them:

- **Are plugin-contributed virtual pages validated?** {% ref "SPEC-069" /%}'s
  `contributePages` synthesizes pages that "flow through the rest of the
  pipeline exactly like file-backed pages". If validation sits where the tag set
  is assembled, they get validated too — and a finding on one is a *plugin*
  bug, not an author's, reported against a page whose source the author cannot
  open. Either they are exempt, or their findings need to say plainly that the
  page was generated and by whom. `PipelineWarning.pluginName` already carries
  the attribution needed for the second option, which makes it the cheaper one.

## References

- {% ref "BUG-014" /%} — the defect and all supporting measurements
- {% ref "WORK-554" /%} — the prerequisite question about error severity
- {% ref "SPEC-126" /%} — established that guards only work when something runs them
- {% ref "BUG-011" /%} — the same thesis from the other end: with no typo detector, `data`'s empty-result error was overloaded into the role and failed the legitimate case
- {% ref "BUG-010" /%} — an unresolvable `data` `where` value silently matching every row; another instance of the class
- {% ref "SPEC-131" /%} — depends on the same diagnostics surface via its D6
- {% ref "WORK-395" /%} — the editor validation rail that displays these findings (D9)
- {% ref "SPEC-098" /%} — also depends on that warning channel
- `packages/types/src/pipeline.ts:156` — `PipelineWarning`, whose `phase` union this spec extends
- {% ref "WORK-555" /%} — removes the `error` rune this spec no longer routes into
- `packages/content/src/site.ts` — where the config is assembled and diagnostics defined
- `packages/runes/test/fixture-corpus.test.ts` — the working precedent (D8)
- `packages/language-server/src/parser/markdoc.ts` — the other existing validate call

{% /spec %}
