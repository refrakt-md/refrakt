{% spec id="SPEC-129" status="draft" tags="snippet, file-ref, docs, drift, tooling, runes" %}

# Address embedded source by name, not by line number

`snippet`, `file-ref`, and `expand` address the files they embed by **line
range only**. A line range is a coordinate into a file that nobody promised to
hold still, so editing anything above the range silently repoints it — the page
renders the wrong code, with no warning, looking entirely authoritative.

This spec adds a second addressing mode to the resolver all three already
share: a **regex anchor plus a delimiter-balanced extent**. The anchor names
what the author meant (`symbol="SiteConfig"`), so a rename or deletion becomes a
loud, named failure instead of a wrong render.

Deliberately *not* a language parser. Measurements below put an ~120-line
implementation at 95.37% exact spans against the TypeScript compiler with a
0.07% silent-wrong rate, with no dependency on TypeScript and no per-language
grammar.

## Problem

### Line ranges are silently wrong, by construction

`SiteConfig` occupies lines 74–161 of `packages/types/src/theme.ts` *today*, so
a page quoting it writes `{% snippet path="…/theme.ts" lines="74-161" /%}`. That
is not a reference to `SiteConfig`; it is a reference to a coordinate that
happens to contain `SiteConfig` this week. Add three fields to `EntityRoute`,
which begins twenty lines above at 54, and the same invocation now opens inside
`EntityRoute`'s tail and stops three fields short of the end of `SiteConfig` —
under a heading that still says `SiteConfig`, in prose that still describes it.

Nothing fails. Nothing warns. The page is simply lying, and it keeps lying
until a reader happens to compare it against the source.

This is worse than the drift {% ref "SPEC-126" /%} treats, which at least fails
a test. A wrong slice is *plausible* — it is real code from the right file.

### The exposure is already live

Not hypothetical. In `site/content` today:

| | count |
|---|---|
| `{% snippet %}` invocations | 37 |
| …of which line-addressed (`lines=`) | **23** |
| `{% file-ref %}` invocations | 10 |

Every one of those 23 has a 100% silent-wrong exposure to any edit above its
range. Several already slice mid-construct:
`packages/runes/src/util.ts:42-50` opens on a blank line, and three separate
`lang-map.ts` slices (`3-7`, `42-50`) open in the middle of a comment block.

Most are demonstrations on the `snippet` doc page itself, pointed at
deliberately-stable targets, so today's *damage* is low. The *mechanism* is
what matters: `lang-map.ts:15-35` is meant to be `LANG_MAP`, and it stays
correct only for as long as nobody edits the fourteen lines above it.

### Two specs already flagged this and deferred it

{% ref "SPEC-078" /%} listed symbol resolution as an explicit non-goal:

> **Symbol resolution** … Per-language complexity (TS exports, Python classes,
> Rust impls) and not needed for v1. Held as a future extension; authors supply
> explicit `lines="42-58"` in the meantime.

— and, in the same list, named the consequence as a known tax: *"Hard-coded
line ranges go stale when the source file is edited. Same problem `snippet` has
today; not a new tax. Solved by `symbol` resolution when that lands."*

{% ref "SPEC-126" /%} then hit the same wall from the other side. It rejected
embedding `SiteConfig` directly — *"the failure is silent and wrong rather than
broken … That is worse than the drift being fixed here"* — and proposed a
one-off mitigation:

> If `snippet` is ever pointed at `theme.ts` anyway, pair it with a test
> asserting the slice still starts with the expected `export interface` line.
> That converts silent-wrong into loud-fail, which is the minimum bar for a
> line-addressed reference.

This spec generalises that mitigation instead of writing it once, and answers
SPEC-078's deferral with measurements rather than an estimate.

## What the measurements say

The deferral rested on "per-language complexity". That is true of *parsing* and
false of *addressing*, and the difference is worth showing rather than
asserting.

**Method.** A prototype implementing the algorithm below was run over every
top-level exported symbol in `packages/*/src/**/*.ts` and `plugins/*/src/*.ts`
— 1,360 symbols — and its `[start, end]` line span compared against
`ts.SourceFile.statements` from the TypeScript compiler. The compiler is used
**only to grade the prototype**; it is not part of the proposal. Leading doc
comments were excluded on both sides so the comparison measures the extent
algorithm rather than a comment-absorption preference.

| Outcome | Count | Rate |
|---|---|---|
| Span byte-identical to the compiler | 1,297 | **95.37%** |
| Loud failure — resolution refused, symbol named | 62 | 4.56% |
| **Silent wrong — rendered the wrong span** | **1** | **0.07%** |
| False alarm — refused a correct extraction | **0** | **0%** |

**The comparison that matters is not regex versus TypeScript. It is regex
versus line numbers.** Line numbers are 100% exposed to silent-wrong. Adopting
a real TS parser over this approach would buy 0.07% and cost a heavyweight
dependency in the content pipeline plus every non-TypeScript language.

### Zero false alarms is a structural property, not luck

The self-check (below) refuses to render a slice that is not
delimiter-balanced. The expectation going in was that an imperfect lexer would
reject *correct* extractions and produce a flaky guard — which, by
{% ref "SPEC-126" /%} D3's own reasoning, gets disabled. It does not, and the
reason generalises:

**When the lexer mis-reads a file, the extent comes out wrong *and* the slice
comes out unbalanced.** The same defect causes both, so the self-check catches
its own failures. All 62 refusals were genuinely bad extractions; not one was a
correct span wrongly rejected.

This is what makes the approach viable, and it is the part to protect in
review. The self-check is load-bearing, not a nicety.

## Proposal

### One resolver, three consumers

`packages/runes/src/lib/read-file.ts` already holds `readSnippetFile`, the
sandboxed reader shared by `snippet` ({% ref "SPEC-062" /%}) and `file-ref`
({% ref "SPEC-078" /%}), with `expand` ({% ref "SPEC-066" /%}) alongside it on
`readWholeSandboxedFile`. It parses `lines=`, slices, and raises
`SnippetSandboxError`. Containment already belongs to the `ProjectFiles`
provider ({% ref "SPEC-113" /%}), so this module is purely about *which part of
the file* — exactly the concern being extended.

Resolution lands there, behind the existing `ReadFileOptions` shape. Both
call sites (`snippet-pipeline.ts`, `file-ref-resolve.ts`) gain the capability
by passing the new fields through.

### The attribute surface

```markdoc
{% snippet path="packages/types/src/config.ts" symbol="SiteConfig" /%}
{% snippet path="packages/lumina/styles/runes/hint.css" match="^\.rf-hint\s*\{" /%}
{% snippet path="scripts/deploy.py" match="^def build" extent="dedent" /%}
{% snippet path="README.md" match="^## Install" until="^## " /%}
{% file-ref path="packages/content/src/pipeline.ts" symbol="runPipeline" preview="drawer" /%}
```

| Attribute | Meaning |
|---|---|
| `symbol` | Named declaration. Builds an anchor regex from the keyword table. |
| `match` | Raw regex anchor. The general form; `symbol` is sugar over it. |
| `until` | Regex ending the extent. Overrides `extent`. |
| `extent` | `auto` (delimiter balance, default) or `dedent` (indentation). |
| `lines` | Unchanged. Mutually exclusive with `symbol` / `match`. |

### The algorithm

Two independent halves. Finding the anchor is a regex problem and is easy.
Finding the extent is not a regex problem — but it is not a grammar problem
either.

**1. Mask.** Blank out comments and string/template literals so delimiter
counting is safe, preserving newlines so line numbers survive. Template
literals nest: `${` inside a backtick returns to code state, and the matching
`}` returns to template state. ~40 lines, shared by the whole C family plus
JSON and CSS. Not a grammar.

**2. Anchor.** For `symbol=`, the first line matching:

```
^([ \t]*)((export|public|private|pub|declare|default|async|abstract|static|final)\s+)*
(interface|type|class|const|let|var|function|enum|struct|impl|def|fn|func|trait)\s*\*?\s+<name>\b
```

For `match=`, the author's regex, applied per line. No match → refuse, naming
the symbol and the file.

**3. Extent (`auto`).** Scan forward over the masked source tracking delimiter
depth. Three rules, each of which cost an iteration of the prototype to find:

- **Only `;` at depth 0, or `}` closing a depth-0 brace block, terminates.**
  Parens and brackets nest but never end a statement. Without this, a
  multi-line parameter list ends the extent at its `)` — the single largest
  failure class, worth 38 percentage points on its own.
- **A brace-less statement ends at the first depth-0 line that is not a
  continuation** — looking ahead past blank and comment lines, and treating a
  next line starting `| & . ? : , ) ] } => extends` as a continuation. Without
  the lookahead, a union type with a comment between members ends early.
- **`type` aliases never terminate on a brace.** A type-level object literal
  (`T extends object ? { … } : T`) is not a body.

**4. Extent (`dedent`).** Consume blank lines and lines indented deeper than
the anchor. For Python, YAML, and anything else where indentation carries the
block. This was the prototype's *first* attempt as a **universal** rule, and it
failed there — a multi-line parameter list returns to the anchor's indent level
before the body opens, so it truncated roughly one TypeScript declaration in
eight. It works well as a declared strategy; it does not work as a default.

**5. Self-check.** Re-mask the extracted slice and verify `{}`, `()`, and `[]`
all balance. Unbalanced → refuse. This is what converts the residual error rate
from silent-wrong into loud-fail.

**6. Doc comment.** Absorb a contiguous comment block immediately above the
anchor by default; `doc=false` opts out. A declaration quoted without its
doc comment is a worse quotation, and the whole point of this feature is to
quote declarations.

### Generic in practice, not just in principle

The extent engine was run against `packages/lumina/styles/runes/hint.css` with
`match="^\.rf-hint\s*\{"` and extracted the rule correctly — same code, no CSS
knowledge. That is the evidence for `match=` being the real contract and
`symbol=` being sugar: the engine never learns a language, it learns
delimiters.

## Design decisions

**D1 — A regex anchor and a balanced extent, not a parser.** See the table
above. The ~120 lines have no dependency, work on every brace language, and
degrade loudly. A TS-specific resolver would be more accurate on TypeScript and
useless on the CSS, Markdown, JSON, and shell that the docs also quote. If a
future consumer needs true type-aware resolution (overload sets, declaration
merging, re-exports), that is a different feature with a different spec.

**D2 — The self-check is required, not optional.** It is the difference between
a 4.63% error rate that fails loudly and a 4.63% error rate that renders wrong
code. Never make it opt-out. If a future change makes the masker smarter, the
self-check gets *more* accurate, not less necessary.

**D3 — `match=` is the contract; `symbol=` is sugar over it.** The keyword
table is a convenience for the languages we ship docs in, and it will always be
incomplete. Ship both from day one so an unsupported language is a slightly
more verbose invocation rather than a dead end.

**D4 — Never a dead end.** `until=` and `lines=` stay, permanently and
documented. 4.56% of symbols in this repo cannot be resolved by the anchor
engine, and an author who hits one needs a way through that is not "wait for a
fix". Every refusal message must name the fallback:

```
snippet error: could not resolve symbol "renderFullPage" in
packages/html/src/page-shell.ts — the extracted slice is unbalanced, so the
extent is wrong. Use `until="^}"` to end the extent explicitly, or `lines=`
to address by line range.
```

**D5 — Extent strategy is declared, never sniffed from the file extension.**
Guessing `dedent` for `.py` and `auto` for `.ts` would be right most of the
time, and *silently* wrong the rest — reintroducing the failure mode this spec
exists to remove. Default `auto`, and make the author say `dedent` when they
mean it.

**D6 — Failures follow snippet's existing in-band error path.** Resolution
failures raise `SnippetSandboxError`, which `resolveSnippetToFence` already
turns into an error fence carrying `data-snippet-error`, plus a `ctx.error(…)`
diagnostic. The build continues and the failure is visible on the page. This
spec introduces no new failure channel — but see the open question about
whether `ctx.error` is load-bearing in CI, because "loud" is only true if
something is listening.

**D7 — A `--fix` codemod, not a hand migration.** Converting 23 invocations by
hand is tedious and exactly the kind of change where a slip reintroduces the
bug being fixed. The codemod reads each current slice, infers an anchor from
its first meaningful line, rewrites the invocation, and verifies the new
resolution produces a byte-identical slice — refusing to rewrite when it does
not. The diff stays reviewable; the verification is what makes it trustworthy.

**D8 — Regex literals are the known gap, and the reason the numbers are not
better.** The masker does not lex `/…/`, so a regex containing an unbalanced
brace throws the depth count off. That is the cause of the single remaining
silent-wrong case and, on inspection, most of the 62 refusals. Handling it is
perhaps 15 more lines. Deferred to phase 3 rather than dropped, because the
error it causes is overwhelmingly the *safe* kind, and because the phase-1
value does not depend on it.

## Non-goals

- **Cross-file resolution.** `symbol="SiteConfig"` searches the file named by
  `path=`. No import following, no project-wide symbol index.
- **Type-aware resolution.** Overload sets, declaration merging, and
  re-exports resolve to the first textual match. D1.
- **Rename tracking.** A renamed symbol is a loud failure, which is the point.
  Auto-following renames would restore the silence.
- **Replacing `lines=`.** It stays as the escape hatch and for files with no
  usable structure. D4.
- **New preview targets.** `preview="drawer"` behaviour is unchanged; this
  spec only changes how the referenced region is located.

## Acceptance Criteria

- [ ] `readSnippetFile` resolves `symbol` and `match` anchors in addition to `lines`, and `snippet`, `file-ref`, and `expand` all gain the capability from that one change
- [ ] `symbol` builds its anchor from a documented keyword table; `match` accepts a raw regex; the two are mutually exclusive with each other and with `lines`
- [ ] `extent` accepts `auto` (default) and `dedent`; `until` overrides both
- [ ] The masker handles line comments, block comments, single- and double-quoted strings, and template literals including nested `${}`
- [ ] The extent terminates only on a depth-0 `;` or a `}` closing a depth-0 brace block; parens and brackets nest without terminating
- [ ] Brace-less statements use continuation lookahead that skips blank and comment lines
- [ ] `type` aliases do not terminate on a brace
- [ ] An extracted slice that is not delimiter-balanced is refused, never rendered
- [ ] A leading doc comment is absorbed by default and `doc=false` opts out
- [ ] Every refusal names the file, the anchor, the reason, and the `until=` / `lines=` fallback
- [ ] Failures use the existing error-fence path and emit a `ctx.error` diagnostic — no new failure channel
- [ ] A regression corpus test scores the resolver against the repo's own sources and asserts the silent-wrong count stays at or below its recorded baseline
- [ ] `extent="dedent"` is covered by tests against an indentation-structured fixture
- [ ] The engine is proven language-agnostic by a test extracting a CSS rule via `match=`
- [ ] A `--fix` codemod converts `lines=` invocations to anchors, verifying byte-identical output and refusing to rewrite when it differs
- [ ] The 23 line-addressed snippets in `site/content` are migrated, or individually justified as intentionally line-addressed
- [ ] `snippet` and `file-ref` doc pages document the new attributes, including the fallbacks

## Approach

Four phases, each shippable alone.

1. **The resolver and its corpus test.** The masker, anchor, `auto` extent, and
   self-check in `read-file.ts`, wired through both call sites. The corpus test
   is part of this phase, not a follow-up: it is the only thing that will catch
   a regression in a heuristic, and it is cheap because the repo is its own
   corpus. Record the baseline counts in the test so a change that trades
   loud-fail for silent-wrong cannot pass unnoticed.
2. **`dedent`, `until`, and the docs.** Completes the surface and closes D4's
   dead-end risk before anyone depends on the feature.
3. **The codemod and the migration.** Converts the 23 existing invocations and
   removes the live exposure. Regex-literal lexing (D8) lands here if the
   migration surfaces refusals that need it.
4. **Adoption.** Point the reference pages at declarations. This is where
   {% ref "SPEC-126" /%}'s deferred `file-ref preview="drawer"` provenance idea
   becomes safe to build.

**Budget the masker, not the regex.** The anchor is an afternoon. The masker,
the three termination rules, and the corpus test are the work, and the
termination rules in particular are not guessable — each was found by measuring
against a real corpus, and re-deriving them from first principles will cost more
than reading them off this spec.

## Open questions

- **Does `ctx.error` fail anything?** D6 routes failures to the existing
  diagnostic channel, but this spec has not established whether a `ctx.error`
  during a docs build produces a non-zero exit or a failing test. If it does
  not, "loud failure" means "an error fence on a page nobody reloaded", and the
  guarantee is weaker than claimed. Worth settling before phase 3 makes the
  docs depend on it — and it is the same question
  {% ref "SPEC-126" /%} raises about the two `--check` flags that never run in
  CI.
- **Should `symbol=` support a member path?** `symbol="SiteConfig.baseUrl"`
  would let a reference quote one field. The anchor engine can do it — nested
  anchors and a `dedent`-like extent — but it multiplies the failure surface,
  and no current page wants it. Defer until one does.
- **Is `match=` a regex or a literal by default?** A raw regex is more powerful
  and more likely to be miswritten by an author who does not realise `.` and
  `(` are special. A `match-type="literal|regex"` attribute is the obvious
  answer and may be over-engineering for the first pass.

## References

- {% ref "SPEC-078" /%} — `file-ref`; listed symbol resolution as a non-goal and named line-range staleness as the tax this spec repays
- {% ref "SPEC-062" /%} — `snippet`; the origin of the `lines=` addressing model and the error-fence path D6 reuses
- {% ref "SPEC-066" /%} — `expand`; the third consumer of the shared reader
- {% ref "SPEC-113" /%} — the `ProjectFiles` seam that owns containment, unchanged by this spec
- {% ref "SPEC-126" /%} — rejected line-addressed embedding for the config reference and proposed the one-off assertion this spec generalises
- `packages/runes/src/lib/read-file.ts` — the shared reader this extends

{% /spec %}
