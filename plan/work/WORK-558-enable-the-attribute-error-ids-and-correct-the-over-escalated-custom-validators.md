{% work id="WORK-558" status="done" priority="medium" complexity="moderate" milestone="v0.34.0" source="SPEC-132" tags="validation, markdoc, runes, media" %}

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

- [x] The three attribute ids are added to the allow-list and reported as `PipelineWarning`s
- [x] Every finding {% ref "WORK-557" /%} counted is either fixed in content, fixed in the rune's schema, or explicitly recorded as intentional with a reason
- [x] The four custom validators emit `level: 'error'` for `attribute-type-invalid`, matching Markdoc
- [x] A test proves `SpaceSeparatedNumberList` rejects non-numeric input **in a build**, not only under the language server — this is the first time that validator has ever run
- [x] Tests cover an out-of-enum `matches` value and a missing `required` attribute
- [x] A clean build of `site/` and `plan-site/` emits zero unexpected findings
- [x] `BUG-014`'s four silent-failure classes are all now reported, so it can be closed

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

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

### Result

`site/` and `plan-site/` both report **0 findings across all five enabled ids**,
down from 9,926 when the pass was first switched on. `site/` builds
`✓  Build complete (0 errors, 35 warnings)` — back to the exact warning baseline
{% ref "WORK-554" /%} measured before any of this milestone landed.

### What was done

- `packages/content/src/validate.ts` — `attribute-value-invalid`,
  `attribute-missing-required` and `attribute-type-invalid` added to
  `DEFAULT_VALIDATION_IDS`.
- `packages/runes/src/attributes.ts`, `plugins/media/src/attributes.ts` — all
  four custom validators changed from `level: 'critical'` to `'error'`, with a
  note at each explaining why the distinction is now load-bearing.
- `packages/runes/src/index.ts` — `if` / `else` overridden (below); the custom
  attribute-type classes exported.
- `packages/runes/src/lib/index.ts` — `frame-displace` enum gains `both`.
- `packages/runes/src/tags/collection.ts`, `tags/aggregate.ts` — `limit`
  declared `Number`.
- Five content fixes; `site/content/_data/rune-attributes.json` regenerated.
- `packages/content/test/validate.test.ts` — 7 new tests (19 total).
- `.changeset/content-validation-phase-2.md`.

### The 3,302, and why it is fixed at the root

{% ref "WORK-557" /%} left one decision: what to do about
`attribute-type-invalid: Attribute 'primary' must be type of 'Object'`, 3,302
occurrences, all from Markdoc's own `{% if %}`.

Its schema declares `primary: { type: Object, render: false }`. That is a true
statement about expression *syntax* — `{% if $var %}` and `{% if equals(a,b) %}`
both pass an AST node, and a node is an object. It stops being true here,
because preprocess hooks substitute variables for values before validation runs:
`bindRow` turns `{% if $row.required %}` into `{% if true %}`, and a boolean is
not an `Object`.

Three options were on the table. Filtering the id for conditional tags was
rejected because `ValidateError` carries the node type and line but **not the
owning tag name**, so the filter could not be written precisely — it would have
had to drop `attribute-type-invalid` far more widely than intended. Validating a
pre-substitution copy of the AST was rejected as a much larger change that also
loses coverage of `{% include %}`d partials and plugin-generated content, which
is exactly what SPEC-132 asked validation to cover.

So the constraint itself is dropped:

```ts
if:   { ...Markdoc.tags.if,   attributes: { primary: { render: false } } },
else: { ...Markdoc.tags.else, attributes: { primary: { render: false } } },
```

This loses nothing. Pre-substitution every legal form is already an object;
post-substitution every value is legal. The check could never have caught a real
authoring error in this pipeline — it only ever fired on values that were
already correctly resolved. `render: false` is preserved, which is what keeps
the condition out of the rendered output.

### Every WORK-557 finding, and its disposition

| finding | disposition |
|---|---|
| 3,302× `if.primary` must be `Object` | **schema** — constraint dropped (above) |
| 2× `collection.limit` must be `String` | **schema** — was `String`, consumed as `Number(limitRaw)`, documented as `limit=5`. Now `Number`. |
| 1× `frame-displace` rejects `'both'` | **schema** — Lumina styles `[data-displace="both"]`; the `matches` enum omitted it |
| 1× `showContrast` must be `Boolean` | **content** — `showContrast="true"` → `showContrast=true` |
| 1× `showA11y` must be `Boolean` | **content** — same line |
| 1× `showCharset` must be `Boolean` | **content** |
| 1× `route` must be `Boolean` | **content**, plus the prose above it |
| 1× `plan-activity limit` must be `Number` | **content** — `limit="5"` → `limit=5` |

None recorded as intentional. Every one was a genuine defect on one side or the
other, which is the part worth noting: the item's third option ("explicitly
recorded as intentional with a reason") went unused.

`aggregate.limit` was fixed although it produced no finding — an identical
declaration to `collection.limit`, found while fixing it. Leaving one of two
identical mistakes in place is how the next reader concludes `String` was
deliberate.

### The `frame-displace` one is the best argument for the whole milestone

`{% showcase frame-displace="both" %}` renders correctly. Lumina has a rule for
`[data-displace="both"]`. The schema's `matches` enum did not list it, so the
schema and the stylesheet disagreed — and the page looked right, so nobody
noticed. No test in this repo compares those two artifacts; the CSS-coverage
test derives its expectations from `baseConfig`, so it checks config→CSS and
never content→CSS. A validator is the only thing that could have found it.

### The custom validators

They now execute in a build for the first time. `transform()` does not invoke a
`CustomAttributeTypeInterface`'s `validate()`; only `Markdoc.validate()` does.

{% ref "WORK-557" /%} measured zero findings from them across both sites, so the
test proving one runs uses deliberately bad input through `loadContent` — the
real pipeline, not the class in isolation. It registers the type on a probe rune
via `additionalTags`, because **no shipped rune uses
`SpaceSeparatedNumberList`**: only `grid.spans` uses `SpaceSeparatedList`. Worth
knowing — the class flagged as "the clearest case" in BUG-014 has no consumer at
all, so the `NaN` its unguarded `parseInt` produces was never reachable from
content either.

The severity correction is pinned by a test that disables
`attribute-type-invalid` and asserts the finding disappears. That assertion could
not have passed while the validator claimed `critical`, since `critical` bypasses
configuration — so it tests the change rather than restating it.
`PipelineWarning` has no `critical` severity, so asserting on `severity` alone
would have proved nothing.

### Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| `npx vitest run` | **4421 passed**, 362 files |
| `site/` build | `✓  Build complete (0 errors, 35 warnings)` |
| `plan-site/` | 0 validation findings across 786 pages |
| `refrakt contracts --check` | up to date (132 runes) |
| `blast-radius --json` | `{}` for every id, both sites |

### Notes

**`BUG-014` can close.** Its four silent-failure classes are now reported:
`tag-undefined` and `attribute-undefined` by {% ref "WORK-556" /%},
`attribute-value-invalid` and `attribute-missing-required` here. Its symptom 2
(dead custom validators) is closed here too, and symptom 3 (the producerless
`error` rune) by {% ref "WORK-555" /%}. Symptom 4 — `refrakt validate` not
reading content — is deliberately left open: SPEC-132 D1 makes renaming or
repurposing that command a follow-up.

**The unguarded `parseInt` stays out of scope**, per the item. Enabling
validation makes the guard fire first, which was the point.

**The generated attribute artifact moved.** `collection.limit` and
`aggregate.limit` now render as `number` in the docs' attribute tables, which is
the correct claim and was wrong before.

{% /work %}
