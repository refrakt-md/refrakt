{% work id="WORK-556" status="done" priority="high" complexity="moderate" milestone="v0.34.0" source="SPEC-132" tags="validation, markdoc, pipeline, content" %}

# Run `Markdoc.validate` in the content pipeline and route findings to `PipelineWarning`

{% ref "SPEC-132" /%} phase 1. Call the validator that already exists, at the
point the tag set is already assembled, and turn its findings into the
diagnostics the pipeline already carries.

This is the whole mechanism. Everything after it is choosing which error ids to
switch on.

## Scope

`packages/content/src/site.ts` builds the merged tags, nodes, functions and
variables into one config and hands it to `Markdoc.transform`. Validation runs
against **that same config object** — not a reconstruction — so it cannot
disagree with what the transform sees, and so plugin runes are covered without
extra wiring.

Only `tag-undefined` and `attribute-undefined` are enabled here. They need no
prerequisites and they cover the worst failure: a mistyped rune drops its tag
and renders its children as prose, so the block silently vanishes.

## Acceptance Criteria

- [x] `Markdoc.validate()` runs per page in `site.ts` against the same assembled config passed to `Markdoc.transform`
- [x] Findings become `PipelineWarning`s, with `ValidateError.error.level` mapped onto `severity` and the page URL carried through
- [x] `PipelineWarning.phase` gains a member covering validation — the union is currently `'register' | 'contribute' | 'aggregate' | 'postProcess'`
- [x] Core findings carry an agreed `pluginName`; `'core'` matches how `reference.ts` already groups core runes
- [x] Only `tag-undefined` and `attribute-undefined` are reported; every other id is filtered out at this stage
- [x] Nothing is rendered into the page — no error fence, no injected node (D9)
- [x] `critical`-level findings are reported even though no phase 1 id is critical, so the mapping is complete rather than partial
- [x] Tests cover a typo'd rune name, an unknown attribute, and a clean page producing no findings
- [x] A clean build of `site/` and `plan-site/` emits zero findings from these two ids
- [x] Fenced examples produce no findings, with a test pinning the `escapeFenceTags` ordering (D7)

## Approach

The filtering matters as much as the call. Enabling every id at once is what
{% ref "SPEC-132" /%} stages against — `attribute-value-invalid` and friends
wake the dormant custom validators and need {% ref "WORK-557" /%}'s measurement
first, and `variable-undefined` must never be enabled at all (D4). Build the
id filter as an explicit allow-list so adding an id is a deliberate act.

`fixture-corpus.test.ts` is the working model for the call itself — it already
does validate-then-transform over 40 fixtures under `npm test`. The difference
is the target and the routing, not the technique.

**Do not assume the diagnostics are loud.** {% ref "WORK-554" /%} establishes
what an error-severity `PipelineWarning` actually causes. This item lands the
reporting either way; whether it stops a build is decided there.

## References

- {% ref "SPEC-132" /%} — D1, D2, D9, D11 and the phase table
- {% ref "BUG-014" /%} — the defect this begins to close
- {% ref "WORK-554" /%} — what error severity does; not a blocker for this item
- {% ref "WORK-395" /%} — displays these warnings; no display work belongs here
- `packages/runes/test/fixture-corpus.test.ts` — the pattern to follow
- `packages/types/src/pipeline.ts:156` — `PipelineWarning`

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

### What was done

- `packages/content/src/validate.ts` — new. `validatePage()`, the id allow-list
  (`DEFAULT_VALIDATION_IDS`), the severity mapping, `isSuppressible()`, and the
  `ValidationSettings` shape {% ref "WORK-559" /%} configures. Never throws: a
  failure inside `Markdoc.validate` is itself reported as a finding rather than
  breaking the build it was added to protect.
- `packages/content/src/site.ts` — `transformContent` takes an optional
  validation option and returns `findings` alongside `renderable` / `headings`.
  The call sits between config assembly and `Markdoc.transform`, against the
  same object, so the two cannot disagree. Both call sites (file pages and
  `renderContributed`) collect into one array, merged into `warnings` beside the
  preprocess funnel.
- `packages/types/src/pipeline.ts` — `PipelineWarning.phase` gains `'validate'`.
- `packages/content/src/index.ts` — exports the validation surface.
- `packages/content/test/validate.test.ts` — 12 tests.
- `.changeset/content-validation-phase-1.md`.

### SPEC-132 D11's severity table is wrong, and it matters

The spec states "all four of this spec's phase 1 and 2 ids are `error`, never
`critical`". Read off `@markdoc/markdoc@0.4.0`'s `src/validator.ts`, the pinned
version:

| id | actual level | D11 said |
|---|---|---|
| `tag-undefined` | **`critical`** (`:138`) | not listed; implied `error` |
| `tag-placement-invalid` | `critical` (`:150`) | `critical` ✓ |
| `attribute-undefined` | `error` (`:184`) | `error` ✓ |
| `attribute-missing-required` | `error` (`:263`) | `error` ✓ |
| `attribute-value-invalid` | **`errorLevel ?? 'error'`** (`:239`, `:249`) | `error` |
| `attribute-type-invalid` | **`errorLevel ?? 'error'`** (`:225`) | `error` |

Two corrections. First, `tag-undefined` — the headline phase-1 id, the
vanishing-rune case the whole milestone is sold on — is `critical`. Second, the
two `attribute-*-invalid` ids take their level from the **attribute schema's own
`errorLevel`**, so a rune can escalate them: `hint.type` sets
`errorLevel: 'critical'` (`packages/runes/src/tags/hint.ts:20`), and `region`
does the same.

This collides with D5/D11 head-on. If `critical` is non-suppressible and
`tag-undefined` is `critical`, then the diagnostic users are most likely to want
to silence is the one they cannot. The implementation keeps D11's *rule* —
`critical` bypasses both the master switch and the id allow-list — because the
rule is right in principle, and records the collision here rather than quietly
softening it. {% ref "WORK-559" /%} inherits the decision.

### Three real defects, found on the first run

BUG-014 says the fix is "prospective, not remedial" for this repo, on the
strength of a scan that found zero unknown *tags*. That scan could not check the
attribute classes, and it turns out the repo was not clean:

1. **`bindRow` dropped `inline` — 6,609 findings.**
   `packages/runes/src/data-pipeline.ts:218` cloned nodes carrying `lines` and
   `location` across but not `inline`, under a comment saying "`inline` and a
   few other node types carry meaning in fields the constructor does not take;
   copy what Markdoc sets." Every `{% code %}` in the generated rune-attribute
   tables therefore came out block-level against a schema declaring
   `inline: true`. `cloneWithBindings` in `include-pipeline.ts:185` had it right
   all along, which is how the omission was identifiable as a slip rather than a
   design choice. Fixed in both `bindRow` and `cloneNode`; 6,609 → 0.

2. **`{% ref "Sandbox" %}` written as an opening tag** in
   `site/content/extend/security/index.md`, where `ref` is self-closing. The ref
   swallowed the rest of the paragraph, producing `missing-closing` for both
   `paragraph` and `inline` plus `missing-opening`. Exactly one such ref in the
   whole site.

3. **`{% hint type="tip" %}`** in `site/content/blog/whats-new-in-0-4.md` —
   `tip` is not one of `caution | check | note | warning`, so it rendered
   `data-type="tip"` with no CSS behind it. BUG-014's symptom 1, third row,
   in the wild. Changed to `note`.

And a fourth, in the test suite: **`plan-site-dogfood-real.test.ts` passed
`undefined` for `additionalTags`**, so the plan plugin's runes were never in
Markdoc's tag set. The test built 786 pages of plan site with `spec`, `work`,
`decision-log`, `plan-activity` and `plan-history` all undefined — and passed,
because an undefined tag drops and renders its children as prose, which still
contains the strings the test asserted on. The test now builds the tag set the
way the adapter does.

That last one is the milestone's thesis proved on itself: a guard nobody pointed
at the content, hiding a defect inside the test written to catch defects.

### One documented-but-unimplemented capability

`site/content/runes/marketing/bento.md` described grid-level `frame` chrome
cascading to bento cells and demonstrated `frame-aspect` / `frame-anchor` in a
live preview. `frame` is declared unavailable on `bento`, and `refrakt inspect`
confirms the engine emits nothing for either attribute. Filed as
{% ref "BUG-017" /%} — whether the docs were aspirational or applicability
over-narrowed (there is an SPEC-125 precedent, the `scrim` family) needs someone
who owns the surface model. The page now states shipped behaviour so the build
is clean without pre-judging that.

### Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| `npx vitest run` | **4414 passed**, 362 files |
| `site/` build | `✓  Build complete (0 errors, 36 warnings)` — zero validation findings |
| `plan-site/` build | zero validation findings |
| `npm run format:check` | clean |

The 36 warnings on `site/` are the pre-existing `bond` / `xref` unresolved-entity
notices, a `file-ref` line clamp and a sandbox record-cap truncation, unchanged
in kind from the 35 measured in {% ref "WORK-554" /%} (the extra one is a new
sandbox record count, not a new class).

### Notes

**Contributed pages are validated, and attributed.** SPEC-132's open question
asked whether plugin-synthesized pages are exempt. They are not: validation sits
where the tag set is assembled, so they flow through it. The finding carries the
contributing plugin's name and appends `[generated by <plugin>]` to the message,
which is the cheaper of the two options the spec named and the one that does not
leave a class of pages unchecked. This is what surfaced the dogfood-test defect
above.

**Severity is still not load-bearing.** {% ref "WORK-554" /%} established that an
error-severity diagnostic fails nothing and is invisible in the dev server. Phase
1 therefore ships a reporting channel whose consequence today is a line on
stderr during builds. That is strictly more than users get now, and it is what
{% ref "WORK-395" /%}'s validation rail consumes — but it is not yet a guard.
{% ref "WORK-573" /%} tracks making it one.

{% /work %}
