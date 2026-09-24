{% work id="WORK-587" status="in-progress" priority="high" complexity="complex" source="SPEC-131" tags="snippet, file-ref, resolver, anchors, drift" milestone="v0.37.0" %}

# Anchor resolution, the auto extent, and the corpus test

The core of {% ref "SPEC-131" /%} phase 1. After this item, `snippet` and
`file-ref` can address a region by name instead of by coordinate, and a symbol
that moves fails loudly instead of rendering plausible wrong code.

One change, two consumers: resolution lands in `read-file.ts` behind the
existing `ReadFileOptions` shape, and both call sites
(`snippet-pipeline.ts:174`, `file-ref-resolve.ts:209`) gain the capability by
passing the new fields through.

**Two, not three — `expand` is not a consumer of this.** The spec's own
Proposal says so and its acceptance criteria said otherwise; the criteria were
wrong. `expand-pipeline.ts:347` calls `readWholeSandboxedFile`, a different
function that returns raw text straight into `Markdoc.parse` with no slicing
and no `[start, end]`. `expand` embeds a document rather than a region, has no
`lines=` and therefore none of the exposure this item removes. Do not wire it
up; extending it to partial includes is a separate feature.

## The three termination rules are not guessable

Each cost an iteration of the spec's prototype to find, and re-deriving them
from first principles will cost more than reading them off the spec:

- **Only `;` at anchor depth, or `}` closing a brace block opened at anchor
  depth, terminates.** Parens and brackets nest but never end a statement.
  Worth 38 percentage points on its own.
- **A brace-less statement ends at the first line back at anchor depth that is
  not a continuation** — looking ahead past blank and comment lines, treating a
  next line starting `| & . ? : , ) ] } => extends` as a continuation.
- **`type` aliases never terminate on a brace.** A type-level object literal is
  not a body.

## Two corrections the spec makes to its own prototype

Both are live failures, not hypotheticals, and both are easy to reimplement
wrongly:

**Depth is relative to the anchor, not to the file.** The prototype counted from
file start, indistinguishable from anchor-relative for the top-level symbols it
was measured on. `packages/lumina/styles/runes/hint.css` is the proof: the whole
file is wrapped in `@layer skin {`, so `.rf-hint` sits at depth 1 and absolute
counting returns the entire file instead of the rule's own four lines.

**Anchors match raw source; the mask only rejects.** Matching against masked
text blanks every string literal, so `match='"scripts"'` against `package.json`
could never match. The mask is still needed in the other direction — an anchor
matching *inside* a masked region is a false positive and must be skipped.

## Reaching EOF is a refusal, never a return

`{% snippet path="classes.py" symbol="HttpClient" /%}` is the most natural
invocation a Python author can write: `symbol` resolves it, and then `auto`
looks for a `;` or `}` that does not exist anywhere in the file. Returning the
remainder is precisely the plausible-wrong render this spec exists to prevent.
The refusal must name `extent="dedent"`.

## The corpus test ships here

{% ref "SPEC-131" /%} is explicit that this is "part of this phase, not a
follow-up": it is the only thing that will catch a regression in a heuristic,
and it is cheap because the repo is its own corpus. Record the baseline counts
so a change trading loud-fail for silent-wrong cannot pass unnoticed.

The published baseline, against 1,360 symbols: 95.37% exact, 4.56% loud
refusal, 0.07% silent-wrong, 0% false alarm.

## Acceptance Criteria

- [x] `readSnippetFile` resolves `symbol` and `match` anchors in addition to `lines`, and both `snippet` and `file-ref` gain the capability from that one change
- [x] `expand` is unchanged and gains no anchor attributes
- [x] `symbol` builds its anchor from the keyword table; `match` accepts a raw regex; the two are mutually exclusive with each other and with `lines`
- [x] Anchors match against raw source; a match landing inside a masked region is skipped, covered by tests for `match='"scripts"'` on `package.json` (must resolve) and an anchor mentioned only in a comment (must be skipped)
- [x] The extent terminates only on a `;` at anchor depth or a `}` closing a brace block opened at anchor depth; parens and brackets nest without terminating
- [x] Depth is measured relative to the anchor line, covered by a test anchoring on a nested target (a `package.json` key, a class method, a rule inside `@media`)
- [x] Brace-less statements use continuation lookahead that skips blank and comment lines
- [x] `type` aliases do not terminate on a brace
- [x] An `auto` extent reaching EOF without terminating refuses and names `extent="dedent"`
- [x] Under `extent="auto"`, an extracted slice that is not delimiter-balanced is refused, never rendered
- [x] An anchor matching more than once takes the first and warns, naming every matching line
- [x] `occurrence` selects the Nth match, 1-based, defaulting to 1, reading from the same enumeration the warning names
- [x] `occurrence` does not suppress the ambiguity warning
- [x] An `occurrence` beyond the number of matches refuses, naming how many were found and where — never clamping to the last or falling back to the first
- [x] `occurrence` is documented beside `lines` / `until` / `through` as an escape hatch, not beside `symbol` as a naming form
- [x] Annotations (`@Component`, `#[derive]`, `@dataclass`) attach to the symbol always, independent of `doc`
- [x] `doc` is tri-state: unset defaults to on for `symbol` and off for `match`; `doc=true` and `doc=false` force the choice
- [x] A test covers the abutting-comment limit (D9) so the behaviour is pinned rather than accidental, including the file-header variant
- [x] Every refusal names the file, the anchor, the reason, and the `until=` / `through=` / `lines=` fallback
- [x] Failures use the existing error-fence path and emit a `ctx.error` diagnostic — no new failure channel
- [x] A regression corpus test scores the resolver against the repo's own sources and asserts the silent-wrong count stays at or below its recorded baseline
- [x] The engine is proven delimiter-agnostic by a test extracting a CSS rule via `match=`

## Approach

The anchor is an afternoon. The termination rules and the corpus test are the
work.

Build the corpus test early rather than last — it is the instrument that tells
you whether each termination rule helped, and the spec's percentages are only
reproducible with it in place.

`{name}` interpolation into the `symbol` anchor template **must be escaped**: a
symbol name containing `.` or `(` spliced raw into a regex is injection from
content.

**Enumerate matches once and let both features read it.** D14's warning has to
name every matching line, so the full match list exists already; `occurrence=`
(D17) is an index into it. Written as two passes — first-match-and-warn, then a
separate scan for the Nth — they drift apart, and the warning stops agreeing
with the selection.

## Blocked by

- {% ref "WORK-597" /%} — the masker and the table this reads

## Notes

**D6's guarantee rests on the error fence, not the diagnostic.**
{% ref "WORK-554" /%} established that a `ctx.error` fails nothing;
{% ref "WORK-575" /%} has since made it *visible* in dev, but not fatal. Emit
the diagnostic as specified — just do not write anything here as though it
gates a build. {% ref "WORK-573" /%} owns that question.

Non-goals worth restating so they do not creep in: no cross-file resolution, no
type-aware resolution, no rename tracking, and `lines=` is not being replaced.

**`occurrence=` is ordinal addressing and must be documented as such.** It is a
better coordinate than a line number — inserting unrelated content above does
not move it — but it still drifts when another match is inserted above the one
being addressed. D17 classifies it with D4's escape hatches deliberately;
presenting it as an equal of `symbol=` would undersell that. The docs steer at
a distinguishing regex first, and reach for the ordinal only when the anchors
are genuinely identical.

The case that motivated it: `site/content/index.md` carries four
`{% feature %}` blocks, and {% ref "WORK-588" /%}'s `paired` is what makes them
quotable at all — so the item that unlocks quoting rune blocks is the one that
creates the ambiguity.

## References

- {% ref "SPEC-131" /%} — steps 2–3 and 7–8, D1 (regex not parser), D2 (self-check scoped to `auto`), D3 (`match` is the contract), D4 (never a dead end), D6 (the error-fence path), D9 (`doc` defaults and the abutting-comment limit), D14 (ambiguous anchors warn), D17 (`occurrence=`, and why it is an escape hatch)
- {% ref "WORK-597" /%} — the masker and language table
- {% ref "WORK-588" /%} — the extents that make non-brace formats addressable
- `packages/runes/src/lib/read-file.ts` — `readSnippetFile`, where resolution lands
- `packages/runes/src/snippet-pipeline.ts`, `packages/runes/src/file-ref-resolve.ts` — the two call sites
- `packages/lumina/styles/runes/hint.css` — the anchor-relative depth proof

{% /work %}
