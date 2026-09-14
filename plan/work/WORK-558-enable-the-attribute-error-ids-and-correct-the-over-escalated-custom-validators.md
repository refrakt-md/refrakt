{% work id="WORK-558" status="ready" priority="medium" complexity="moderate" milestone="v0.34.0" source="SPEC-132" tags="validation, markdoc, runes, media" %}

# Enable the attribute error ids and correct the over-escalated custom validators

{% ref "SPEC-132" /%} phase 2. Add `attribute-value-invalid`,
`attribute-missing-required` and `attribute-type-invalid` to
{% ref "WORK-556" /%}'s allow-list, fix whatever {% ref "WORK-557" /%} found,
and correct a severity inconsistency the spec surfaced.

This is the half that makes rune schemas mean something: `required` and
`matches` are declared on ~175 tags and enforced on none of them.

## Blocked by

- {% ref "WORK-556" /%} — provides the call and the id filter
- {% ref "WORK-557" /%} — its counts decide whether this proceeds or splits out

## The severity correction

All four of refrakt's custom attribute validators return
`id: 'attribute-type-invalid'` at `level: 'critical'`:

- `SeparatedString.validate` and `SpaceSeparatedNumberList.validate` — `packages/runes/src/attributes.ts`
- both validators in `plugins/media/src/attributes.ts`

Markdoc emits that same id at `level: 'error'`. So the identical failure is
reported at two severities depending on which code path produced it. That is
harmless while nothing reads severity and wrong the moment this milestone makes
it load-bearing — and by D11 the difference is real: `critical` means the
document could not be understood, which an out-of-range attribute plainly does
not.

This is also the item where those validators execute in a build for the first
time, so it is the right place to correct them.

## Acceptance Criteria

- [ ] The three attribute ids are added to the allow-list and reported as `PipelineWarning`s
- [ ] Every finding {% ref "WORK-557" /%} counted is either fixed in content, fixed in the rune's schema, or explicitly recorded as intentional with a reason
- [ ] The four custom validators emit `level: 'error'` for `attribute-type-invalid`, matching Markdoc
- [ ] A test proves `SpaceSeparatedNumberList` rejects non-numeric input **in a build**, not only under the language server — this is the first time that validator has ever run
- [ ] Tests cover an out-of-enum `matches` value and a missing `required` attribute
- [ ] A clean build of `site/` and `plan-site/` emits zero unexpected findings
- [ ] `BUG-014`'s four silent-failure classes are all now reported, so it can be closed

## Notes

**The unguarded `parseInt` is not in scope.** `SpaceSeparatedNumberList.transform`
runs `parseInt` without checking, producing `NaN` where its own `validate` would
have objected. Enabling validation makes the guard fire first, which is the
point — but the transform's own robustness is a separate small defect noted in
{% ref "BUG-014" /%}, not this item's job.

## References

- {% ref "SPEC-132" /%} — D11 and the phase table
- {% ref "BUG-014" /%} — closes with this item, given {% ref "WORK-556" /%}
- `packages/runes/src/attributes.ts`, `plugins/media/src/attributes.ts` — the four validators

{% /work %}
