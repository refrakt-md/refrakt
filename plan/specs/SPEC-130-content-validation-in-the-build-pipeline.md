{% spec id="SPEC-130" status="draft" tags="validation, markdoc, pipeline, runes, dx" %}

# Content validation in the build pipeline

Every rune schema in refrakt declares required attributes, typed attributes and
`matches` enums. Markdoc can check all of them. Nothing in the build asks it to,
so the declarations are documentation that the pipeline itself ignores —
`{% ref "BUG-010" /%}`.

This spec wires `Markdoc.validate()` into the content pipeline and routes its
findings through the diagnostics surface that already exists.

## Problem

{% ref "BUG-010" /%} carries the full evidence. In summary: `Markdoc.validate()`
never sees site content, four error classes pass through
`transform()` in silence, the custom attribute-type validators in
`packages/runes/src/attributes.ts` and `plugins/media/src/attributes.ts` never
execute in a build, and `refrakt validate` checks theme config rather than
content.

The sharpest consequence is `tag-undefined`: a mistyped or renamed rune is not
an error, it **renders its children as prose and vanishes**. A site author sees
a page missing a block, with nothing anywhere telling them why.

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
| Error-fence precedent for in-page failure | Shipped, in `snippet-pipeline.ts` |

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

### In-page display follows the snippet precedent

Where a finding is shown in the page as well as the log, it follows
`snippet`'s established shape: the build continues, the page renders, and the
failure is visible where the mistake is rather than only in a build log.

An earlier draft routed findings into the `error` rune, which renders a
`ValidationError` as a table row. That is withdrawn — {% ref "WORK-550" /%}
removes the rune. Its `<tr>` output presumes a page-level report collected into
a table, and adopting that model because a leftover row happened to exist would
be letting legacy shape a design. If a findings table is later wanted, it gets
designed as one.

Whether the *build* also fails is deliberately not decided here — see D3.

### Stage the error ids

Not all at once, because they carry different risk:

| Phase | Error ids | Why this order |
|---|---|---|
| 1 | `tag-undefined`, `attribute-undefined` | No prerequisites. Highest value — the vanishing-rune case. |
| 2 | `attribute-value-invalid`, `attribute-missing-required`, `attribute-type-invalid` | Activates the dormant custom validators; needs the blast radius measured first. |
| 3 | `variable-undefined` | Blocked on a complete per-page variable bag — see D4. |

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
{% ref "WORK-549" /%} answers what error severity currently does.** This spec
deliberately does not assert that validation "fails CI", because nobody has
established that an error-severity diagnostic fails anything. Asserting it would
repeat {% ref "SPEC-126" /%}'s finding in a new place: a guard that reports into
a void.

{% ref "WORK-549" /%} settles it, including the blast radius — how many error
diagnostics a clean build already emits. Phase 1 can land as diagnostics
regardless; the consequence is a separate, informed decision.

**D4 — `variable-undefined` last, and only behind a complete variable bag.**
Markdoc's variable checking is all-or-nothing, measured:

| config | result |
|---|---|
| no `variables` key | check skipped entirely |
| `variables: {}` | *every* reference flagged |
| incomplete bag | false positives on the missing ones |

`site.ts:75` already passes a bag, so enabling this today would flag every
`$item.*` in collection templates and deferred bodies — `$item` binds later and
per-entity. A validation pass that cries wolf on correct content gets switched
off, which costs more than never having enabled it.

**D5 — Validation must be disableable, and the escape hatch must be narrow.**
Users have content we cannot anticipate, and a framework that refuses to build
their site over a diagnostic they disagree with is worse than one that stays
quiet. A config switch (per-site, and per-error-id) is required. It should not
be per-page or per-tag: that granularity invites suppressing the symptom at the
one call site that revealed a real bug.

**D6 — Fix the language server's blind spot in the same pass.** It passes `tags`
and `nodes` only, so by D4's table it cannot report `variable-undefined` at all.
Once the pipeline assembles a complete bag, the LSP should consume the same
assembly rather than building a second, weaker config. Two validators
disagreeing about what is valid is its own bug in waiting.

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

## Non-goals

- **Deciding build-failure semantics.** D3; {% ref "WORK-549" /%} first.
- **Validating the docs' fenced examples.** A related and worthwhile guard — the
  markdoc-fence test — but a repo script over `site/content`, not a pipeline
  feature. Separate work.
- **Renaming or repurposing `refrakt validate`.** Noted in D1 as a follow-up.
- **New error classes.** This wires up what Markdoc already reports; it does not
  invent refrakt-specific validations.
- **Fixing the `NaN` in `SpaceSeparatedNumberList.transform`.** Enabling
  validation makes the guard fire, but the unguarded `parseInt` is its own small
  defect; see {% ref "BUG-010" /%}.

## Acceptance Criteria

- [ ] `Markdoc.validate()` runs in the content pipeline against the same assembled config the transform uses, including plugin runes
- [ ] Findings route to the existing `ctx.error` / `ctx.warn` / `ctx.info` surface, mapped from `ValidateError.error.level`, carrying the page URL
- [ ] In-page display, if included, follows `snippet`'s error-fence precedent and does not reintroduce a `ValidationError` table row
- [ ] Phase 1 ids (`tag-undefined`, `attribute-undefined`) are enabled and covered by tests
- [ ] Phase 2 ids are enabled only after the blast radius across `site/` and `plan-site/` is measured and recorded
- [ ] The dormant custom attribute validators demonstrably execute once phase 2 lands — a test proves `SpaceSeparatedNumberList` rejects non-numeric input in a build
- [ ] `variable-undefined` stays off until the per-page variable bag is complete, with a test asserting no false positives on `$item.*` in collection templates and deferred bodies
- [ ] Validation is disableable per site and per error id; not per page or per tag
- [ ] The language server consumes the same config assembly as the pipeline rather than its own
- [ ] A test asserts fenced examples are exempt, pinning the `escapeFenceTags` ordering
- [ ] A clean build of `site/` and `plan-site/` emits zero unexpected findings

## Approach

0. **{% ref "WORK-549" /%} first.** Everything about consequence depends on it.
1. **Phase 1** — the call, the severity mapping, and the two safe ids. Independently shippable and already the majority of the value.
2. **Phase 2** — measure the blast radius, then enable the attribute ids. This
   is where the dormant validators wake up, so expect findings.
3. **Phase 3** — complete the variable bag, then `variable-undefined`, then the
   language-server unification (D6).

**Budget the blast radius, not the wiring.** The call itself is a few lines. The
work is in whatever phase 2 turns up across two dogfooded sites, and in the
variable-bag completion phase 3 needs — which is also the prerequisite for
generated inline values, so it pays for itself twice.

## Open questions

- **Does a validation finding belong in the page, the log, or both?** D2 says
  both, following `snippet`. But `snippet`'s error fence replaces content that
  could not be resolved, whereas a validation finding annotates content that
  rendered anyway. Rendering an error table row *next to* working output may be
  more confusing than a build-log entry. Worth prototyping before committing.
- **Should plugin authors be able to contribute validations?** The pipeline-hook
  surface makes it natural, and `Plugin` already carries hooks. Out of scope
  here, but the wiring should not foreclose it.
- **Is `critical` distinct from `error` in practice?** Markdoc emits both; the
  custom validators in `attributes.ts` use `critical`. If the mapping collapses
  them, say so explicitly rather than leaving two levels that behave identically.

## References

- {% ref "BUG-010" /%} — the defect and all supporting measurements
- {% ref "WORK-549" /%} — the prerequisite question about error severity
- {% ref "SPEC-126" /%} — established that guards only work when something runs them
- {% ref "SPEC-129" /%} — depends on the same diagnostics surface via its D6
- {% ref "WORK-550" /%} — removes the `error` rune this spec no longer routes into
- `packages/content/src/site.ts` — where the config is assembled and diagnostics defined
- `packages/runes/test/fixture-corpus.test.ts` — the working precedent (D8)
- `packages/language-server/src/parser/markdoc.ts` — the other existing validate call

{% /spec %}
