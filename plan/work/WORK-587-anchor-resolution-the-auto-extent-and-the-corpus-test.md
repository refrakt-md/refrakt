{% work id="WORK-587" status="ready" priority="high" complexity="complex" source="SPEC-131" tags="snippet, file-ref, expand, resolver, anchors, drift" milestone="v0.37.0" %}

# Anchor resolution, the auto extent, and the corpus test

The core of {% ref "SPEC-131" /%} phase 1. After this item, `snippet`,
`file-ref` and `expand` can address a region by name instead of by coordinate,
and a symbol that moves fails loudly instead of rendering plausible wrong code.

One change, three consumers: resolution lands in `read-file.ts` behind the
existing `ReadFileOptions` shape, and both call sites
(`snippet-pipeline.ts`, `file-ref-resolve.ts`) gain the capability by passing
the new fields through.

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
counting returns all 67 lines instead of 4.

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

- [ ] `readSnippetFile` resolves `symbol` and `match` anchors in addition to `lines`, and `snippet`, `file-ref`, and `expand` all gain the capability from that one change
- [ ] `symbol` builds its anchor from the keyword table; `match` accepts a raw regex; the two are mutually exclusive with each other and with `lines`
- [ ] Anchors match against raw source; a match landing inside a masked region is skipped, covered by tests for `match='"scripts"'` on `package.json` (must resolve) and an anchor mentioned only in a comment (must be skipped)
- [ ] The extent terminates only on a `;` at anchor depth or a `}` closing a brace block opened at anchor depth; parens and brackets nest without terminating
- [ ] Depth is measured relative to the anchor line, covered by a test anchoring on a nested target (a `package.json` key, a class method, a rule inside `@media`)
- [ ] Brace-less statements use continuation lookahead that skips blank and comment lines
- [ ] `type` aliases do not terminate on a brace
- [ ] An `auto` extent reaching EOF without terminating refuses and names `extent="dedent"`
- [ ] Under `extent="auto"`, an extracted slice that is not delimiter-balanced is refused, never rendered
- [ ] An anchor matching more than once takes the first and warns, naming every matching line
- [ ] Annotations (`@Component`, `#[derive]`, `@dataclass`) attach to the symbol always, independent of `doc`
- [ ] `doc` is tri-state: unset defaults to on for `symbol` and off for `match`; `doc=true` and `doc=false` force the choice
- [ ] A test covers the abutting-comment limit (D9) so the behaviour is pinned rather than accidental, including the file-header variant
- [ ] Every refusal names the file, the anchor, the reason, and the `until=` / `through=` / `lines=` fallback
- [ ] Failures use the existing error-fence path and emit a `ctx.error` diagnostic — no new failure channel
- [ ] A regression corpus test scores the resolver against the repo's own sources and asserts the silent-wrong count stays at or below its recorded baseline
- [ ] The engine is proven delimiter-agnostic by a test extracting a CSS rule via `match=`

## Approach

The anchor is an afternoon. The termination rules and the corpus test are the
work.

Build the corpus test early rather than last — it is the instrument that tells
you whether each termination rule helped, and the spec's percentages are only
reproducible with it in place.

`{name}` interpolation into the `symbol` anchor template **must be escaped**: a
symbol name containing `.` or `(` spliced raw into a regex is injection from
content.

## Blocked by

- {% ref "WORK-586" /%} — the masker and the table this reads

## Notes

**D6's guarantee rests on the error fence, not the diagnostic.**
{% ref "WORK-554" /%} established that a `ctx.error` fails nothing;
{% ref "WORK-575" /%} has since made it *visible* in dev, but not fatal. Emit
the diagnostic as specified — just do not write anything here as though it
gates a build. {% ref "WORK-573" /%} owns that question.

Non-goals worth restating so they do not creep in: no cross-file resolution, no
type-aware resolution, no rename tracking, and `lines=` is not being replaced.

## References

- {% ref "SPEC-131" /%} — steps 2–3 and 7–8, D1 (regex not parser), D2 (self-check scoped to `auto`), D3 (`match` is the contract), D4 (never a dead end), D6 (the error-fence path), D9 (`doc` defaults and the abutting-comment limit), D14 (ambiguous anchors warn)
- {% ref "WORK-586" /%} — the masker and language table
- {% ref "WORK-588" /%} — the extents that make non-brace formats addressable
- `packages/runes/src/lib/read-file.ts` — `readSnippetFile`, where resolution lands
- `packages/runes/src/tags/snippet-pipeline.ts`, `packages/runes/src/tags/file-ref-resolve.ts` — the two call sites
- `packages/lumina/styles/runes/hint.css` — the anchor-relative depth proof

{% /work %}
