{% work id="WORK-556" status="ready" priority="high" complexity="moderate" milestone="v0.34.0" source="SPEC-132" tags="validation, markdoc, pipeline, content" %}

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

- [ ] `Markdoc.validate()` runs per page in `site.ts` against the same assembled config passed to `Markdoc.transform`
- [ ] Findings become `PipelineWarning`s, with `ValidateError.error.level` mapped onto `severity` and the page URL carried through
- [ ] `PipelineWarning.phase` gains a member covering validation — the union is currently `'register' | 'contribute' | 'aggregate' | 'postProcess'`
- [ ] Core findings carry an agreed `pluginName`; `'core'` matches how `reference.ts` already groups core runes
- [ ] Only `tag-undefined` and `attribute-undefined` are reported; every other id is filtered out at this stage
- [ ] Nothing is rendered into the page — no error fence, no injected node (D9)
- [ ] `critical`-level findings are reported even though no phase 1 id is critical, so the mapping is complete rather than partial
- [ ] Tests cover a typo'd rune name, an unknown attribute, and a clean page producing no findings
- [ ] A clean build of `site/` and `plan-site/` emits zero findings from these two ids
- [ ] Fenced examples produce no findings, with a test pinning the `escapeFenceTags` ordering (D7)

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

{% /work %}
