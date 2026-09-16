{% work id="WORK-557" status="done" priority="high" complexity="simple" milestone="v0.34.0" source="SPEC-132" tags="validation, measurement, content" %}

# Measure the validation blast radius across the dogfooded sites

{% ref "SPEC-132" /%} phase 2's gate. Before the attribute error ids are
switched on, count what they would report across `site/` and `plan-site/` — and
record the number, so the decision to proceed is made on evidence rather than
optimism.

## Why it is its own item

Phase 2 enables `attribute-value-invalid`, `attribute-missing-required` and
`attribute-type-invalid`, which also wake the custom attribute validators that
have never executed in a build. Nobody knows what that reports. Two outcomes
need different plans:

- **A handful of findings** — fix them inside {% ref "WORK-558" /%} and proceed.
- **Many findings, or findings concentrated in one rune** — phase 2 becomes its
  own piece of work and slips out of v0.34.0, which is a better outcome than
  discovering it halfway through.

Measuring costs an afternoon. Guessing costs the milestone's credibility.

## Acceptance Criteria

- [x] A count per error id across `site/` and `plan-site/`, at minimum: `attribute-value-invalid`, `attribute-missing-required`, `attribute-type-invalid`
- [x] Findings grouped by rune, so a single misbehaving rune is distinguishable from a broad problem
- [x] Findings from the custom validators (`SeparatedString`, `SpaceSeparatedNumberList`, media's) are counted separately — they have never run, so they are the least predictable
- [x] `critical`-level findings counted separately from `error`, since D11 makes them non-suppressible
- [x] The numbers are written into this item's Resolution, not just reported in a PR comment — {% ref "WORK-558" /%} reads them
- [x] A recommendation: proceed inside {% ref "WORK-558" /%}, or split phase 2 out of the milestone

## Approach

Measurement only — **do not fix anything here**, and do not enable the ids in
the shipped path. A throwaway script or a temporarily widened allow-list on
{% ref "WORK-556" /%}'s filter is enough; the deliverable is the numbers.

Run it against both dogfooded sites rather than just `site/`. `plan-site/` uses
a different rune mix, and a finding count from one says little about the other.

## References

- {% ref "SPEC-132" /%} — the phase table and D11
- {% ref "WORK-556" /%} — provides the call and the id filter this widens
- {% ref "WORK-558" /%} — consumes this measurement

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

### Recommendation

**Proceed inside {% ref "WORK-558" /%}.** Phase 2 does not need to split out of
the milestone. Eight genuine findings across both dogfooded sites, each a
one-line fix, plus one upstream artifact that needs a decision rather than work.

### How it was measured

`scripts/validation-blast-radius.mjs` — added by this item. It loads every site
in `refrakt.config.json` through `loadContent` exactly as the adapter does
(including each plugin's `configure` hook, without which the plan site reports 6
pages instead of 786), forces the full measured id set on regardless of the
shipped allow-list, and groups the findings.

Measurement only — it fixes nothing and does not change the shipped default.
Re-runnable: `node scripts/validation-blast-radius.mjs`.

`variable-undefined` is deliberately excluded from the measurement as well as
from the product. SPEC-132 D4 already measured it as unusable, and including it
would have buried every other number.

### The numbers

| site | pages | findings |
|---|---|---|
| `site/` (main) | 235 | **3,310** |
| `plan-site/` (plan) | 786 | **0** |

Per error id, `site/` — `plan-site/` reported nothing under any id:

| id | count |
|---|---|
| `attribute-type-invalid` | 3,309 |
| `attribute-value-invalid` | 1 |
| `attribute-missing-required` | 0 |
| `tag-undefined` | 0 |
| `attribute-undefined` | 0 |

**The headline number is one message repeated 3,302 times**, which is why the
raw total is misleading:

| count | message |
|---|---|
| 3,302 | `attribute-type-invalid: Attribute 'primary' must be type of 'Object'` |
| 2 | `attribute-type-invalid: Attribute 'limit' must be type of 'String'` |
| 1 | `attribute-value-invalid: Attribute 'frame-displace' … Got 'both' instead.` |
| 1 | `attribute-type-invalid: Attribute 'showContrast' must be type of 'Boolean'` |
| 1 | `attribute-type-invalid: Attribute 'showA11y' must be type of 'Boolean'` |
| 1 | `attribute-type-invalid: Attribute 'showCharset' must be type of 'Boolean'` |
| 1 | `attribute-type-invalid: Attribute 'route' must be type of 'Boolean'` |
| 1 | `attribute-type-invalid: Attribute 'limit' must be type of 'Number'` |

### By rune

Not a useful axis here, and the reason is worth recording. The item asked for it
to distinguish "a single misbehaving rune" from "a broad problem", and the
answer is the first — but the grouping that shows it is *by message*, not by
rune. Markdoc's attribute messages name the attribute, not the owning tag, so a
rune histogram comes out empty for this id class. The 3,302 all originate from
one construct (`{% if %}`), and the remaining 8 are spread one apiece across
`collection`, `showcase`, `palette`, `typography`, `map` and `plan-activity`.

### Custom validators: zero

`SeparatedString`, `SpaceSeparatedNumberList` and the two in
`plugins/media/src/attributes.ts` produce **0 findings across both sites**.

They are told apart from Markdoc's own type check by message — all four share
the `attribute-type-invalid` id, but only they emit `is not a string` or
`contains non-numeric value`. Neither phrase appears anywhere in the output.

So the least predictable part of phase 2 turns out to be the quietest. That is a
real result and not a null one: it means {% ref "WORK-558" /%}'s criterion that
`SpaceSeparatedNumberList` demonstrably rejects non-numeric input **in a build**
has to be proved by a test with deliberately bad input, because our own content
will never exercise it.

### Critical vs error

Zero `critical` findings on either site under the measured ids, after
{% ref "WORK-556" /%}'s fixes. Before them there were 6,613 — 6,609
`tag-placement-invalid` from the `bindRow` `inline` defect, and 4 from a
malformed `{% ref %}` — all resolved in that item.

One correction to how this criterion was framed. It asked for `critical`
counted separately from `error` "since D11 makes them non-suppressible", on the
spec's assumption that the phase 1 and 2 ids are all `error`. They are not:
`tag-undefined` is `critical` in Markdoc 0.4.0, and `attribute-type-invalid` /
`attribute-value-invalid` take their level from the attribute schema's own
`errorLevel` — so `hint.type`, which sets `errorLevel: 'critical'`, would have
reported its finding as critical too. {% ref "WORK-556" /%}'s resolution has the
full table.

### The 3,302: an upstream artifact, not a defect in our content

`{% if %}` is Markdoc's own tag, and its schema declares
`primary: { type: Object, render: false }` (`@markdoc/markdoc@0.4.0`,
`src/tags/conditional.ts:37`). That type holds for what an author writes —
`{% if $var %}` and `{% if equals(a, b) %}` both pass an expression *node*, which
is an object.

It stops holding after substitution. `bindRow` replaces `$row.required` with the
row's actual value before the page is validated, so the schema sees
`{% if true %}` and rejects a boolean against `Object`. Verified in isolation:

```
{% if $row.required %}  → clean
{% if true %}           → attribute-type-invalid
```

Nothing is wrong with the content, the rune, or Markdoc. The mismatch is that
validation runs *after* the preprocess hooks that rewrite variables into
literals — which is exactly where SPEC-132 asked for it, so that plugin runes
and `{% include %}`d partials are covered.

{% ref "WORK-558" /%} has to decide between: exempting `attribute-type-invalid`
on Markdoc's own conditional tags; shipping phase 2 without
`attribute-type-invalid`; or validating a pre-substitution copy of the AST.
Recorded as a decision, not as 3,302 units of work.

### The 8 genuine findings, and which half is wrong

Not all content bugs — three are schema bugs, which is worth knowing before
{% ref "WORK-558" /%} starts "fixing content":

**Content wrong (5)** — a quoted string where a boolean or number is declared.
Silently wrong in the way BUG-014 describes: `"false"` is a truthy string, so
these work by accident and would fail the moment anyone wrote the negative case.

| page | attribute |
|---|---|
| `site/content/runes/design/palette.md:72` | `showContrast="true" showA11y="true"` |
| `site/content/runes/design/typography.md:51` | `showCharset="true"` |
| `site/content/runes/places/map.md:38` | `route="true"` |
| `site/content/runes/plan/plan-activity.md:34` | `limit="5"` (declared `Number`) |

`site/content/themes/solarized.md:33` writes the same two palette attributes
**unquoted**, which is how we know the quoted form is a slip rather than a
convention.

**Schema wrong (3)**:

| finding | why the schema is the defect |
|---|---|
| `collection.limit` must be `String` ×2 | Declared `type: String` (`tags/collection.ts:35`) with description "Max items." Every documented use is numeric — its own page writes `limit=5` and `limit=20`. A count is a number. |
| `frame-displace` rejects `'both'` | Lumina **styles** `[data-displace="both"]`. The `matches` enum at `lib/index.ts:213` omits it, so the theme supports a value the schema refuses. |

The `frame-displace` one is the most interesting result of the exercise: it is a
defect that only a validator could find, because the value works — the CSS
matches, the page renders correctly — and the schema quietly disagrees with the
stylesheet. Nothing else in the toolchain compares those two.

### Notes

**Do not read "0 findings on plan-site" as plan-site being unexercised.** It
builds 786 pages, nearly all of them entity routes from the real `plan/` tree,
and it was the site that surfaced {% ref "WORK-556" /%}'s dogfood-test defect. It
is genuinely clean under these ids.

{% /work %}
