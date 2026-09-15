{% spec id="SPEC-131" status="draft" tags="snippet, file-ref, docs, drift, tooling, runes" %}

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

### It has already happened, to this spec's own example

The `SiteConfig` scenario above was written as a hypothetical. It is not one.
Three live pages — `runes/drawer.md:155`, `runes/file-ref.md:51`, and
`runes/file-ref.md:75` — carry:

```markdoc
{% file-ref path="packages/types/src/theme.ts" lines="74-125" label="SiteConfig" preview="drawer" /%}
```

- `SiteConfig` is **not in `theme.ts`**; it lives at
  `packages/types/src/config.ts:42`. The symbol moved files.
- `theme.ts` is **104 lines long**, so 21 of the 52 requested lines do not
  exist.
- Lines 74–104 are the tail of `ThemeManifest`, then `LayoutDefinition`
  (86–93), then the start of `ComponentDefinition` (95–).

A drawer captioned "SiteConfig" opens onto the back half of one interface and
the whole of two others, on the documentation page for the rune whose
addressing model is the subject of this spec. Tracked as
{% ref "BUG-015" /%}.

This is worse than the failure the spec predicted. The prediction was *drift* —
a range sliding out of alignment with a symbol that is still there. What
happened was a **move**, which no line range can survive at all, and which no
amount of care in choosing the original range would have prevented.

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

**What the corpus does not cover.** Every symbol in it is a *top-level* TypeScript
declaration, so two things went unexercised and neither is disproven by the
numbers below: anchors nested inside an enclosing block (which is what makes
depth-relative counting necessary — see the note under the algorithm) and any
file whose structure is not carried by braces (D11).

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

Note the scope of that argument, though: it holds because the extent and the
imbalance share a cause, which is only true when the extent was *derived from*
delimiter counting. It does not transfer to extents found some other way —
D2.

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

A fourth consumer may be arriving: {% ref "SPEC-129" /%}'s pre-transform
`include` rune is also path-addressed. If it ships, it should take this layer
rather than growing a `lines=` of its own — which is the argument for putting
the resolution in the shared reader rather than in either pipeline.

### The attribute surface

```markdoc
{% snippet path="packages/types/src/config.ts" symbol="SiteConfig" /%}
{% snippet path="packages/lumina/styles/runes/hint.css" match="^\.rf-hint\s*\{" /%}
{% snippet path="scripts/deploy.py" match="^def build" extent="dedent" /%}
{% snippet path="README.md" match="^## Install" extent="section" /%}
{% snippet path="site/content/runes/tabs.md" match="^\{% tabs" extent="paired" /%}
{% file-ref path="packages/content/src/pipeline.ts" symbol="runPipeline" preview="drawer" /%}
```

| Attribute | Meaning |
|---|---|
| `symbol` | Named declaration. Builds an anchor regex from the keyword table. |
| `match` | Raw regex anchor. The general form; `symbol` is sugar over it. |
| `until` | Regex ending the extent, **exclusive** — the matching line is not included. Overrides `extent`. |
| `through` | As `until`, but **inclusive** of the matching line. D12. |
| `extent` | `auto` (delimiter balance, default), `dedent` (indentation), `section` (next sibling at the anchor's own level), or `paired` (matching close token). D11. |
| `doc` | Include the preceding doc comment. Defaults to on for `symbol`, off for `match` — D9. |
| `highlight-match` | Regex(es) highlighting matching lines within the resolved slice. The anchor-native form of `highlight`. D13. |
| `lines` | Unchanged. Mutually exclusive with `symbol` / `match`. |
| `highlight`, `linenumbers` | Unchanged — still file coordinates. D13. |

### The algorithm

Two independent halves. Finding the anchor is a regex problem and is easy.
Finding the extent is not a regex problem — but it is not a grammar problem
either.

**1. Mask.** Blank out comments and string/template literals so delimiter
counting is safe, preserving newlines so line numbers survive. Template
literals nest: `${` inside a backtick returns to code state, and the matching
`}` returns to template state. ~40 lines, shared by the whole C family plus
JSON and CSS. Not a grammar.

> **Markdown masking is recursive, and is the expensive one.** For `section`
> and `paired` over Markdown the masker must blank fenced blocks and inline
> code spans — and on a docs site those fences frequently *contain the very
> tokens being counted*. `site/content/runes/tabs.md:44` has `{% tab %}` in an
> inline code span; the pages most worth quoting with `paired` are exactly the
> ones full of fenced examples of the tags. Without this, a `section` anchor
> can match a `## Install` that lives inside a fence, and a `paired` count can
> be thrown off by a tag nobody ever wrote as a tag. Budget this separately
> from the C-family masker; it is not the same ~40 lines.

**2. Anchor.** Matched against the **raw** source, not the masked source, with
the mask used only to *reject* a match that lands inside a masked region — see
the note below. For `symbol=`, the first line matching:

```
^([ \t]*)((export|public|private|pub|declare|default|async|abstract|static|final)\s+)*
(interface|type|class|const|let|var|function|enum|struct|impl|def|fn|func|trait)\s*\*?\s+<name>\b
```

For `match=`, the author's regex, applied per line. No match → refuse, naming
the symbol and the file. More than one match → take the first, but **warn**,
naming every line that matched — D14.

> **Raw for matching, masked for counting.** Read in order, steps 1 and 2 imply
> anchoring against masked text — which blanks every string literal, so
> `match='"scripts"'` against `package.json` could never match anything, and
> neither could any anchor naming a JSON key, a quoted attribute selector, or
> text inside a template. The anchor must see the raw line.
>
> The mask is still needed in the other direction: an anchor that matches
> *inside* a masked region — a `.rf-hint {` mentioned in a comment, a
> `## Install` inside a fenced block — is a false positive and must be
> skipped rather than used. So the resolver needs the raw text and the mask
> together at this step, which the original ordering did not provide.

**3. Extent (`auto`).** Scan forward over the masked source tracking delimiter
depth. **Depth is measured relative to the anchor line, not to the start of the
file** — see the note below. Three rules, each of which cost an iteration of the
prototype to find:

- **Only `;` at anchor depth, or `}` closing a brace block opened at anchor
  depth, terminates.** Parens and brackets nest but never end a statement.
  Without this, a multi-line parameter list ends the extent at its `)` — the
  single largest failure class, worth 38 percentage points on its own.
- **A brace-less statement ends at the first line back at anchor depth that is
  not a continuation** — looking ahead past blank and comment lines, and
  treating a next line starting `| & . ? : , ) ] } => extends` as a
  continuation. Without the lookahead, a union type with a comment between
  members ends early.
- **`type` aliases never terminate on a brace.** A type-level object literal
  (`T extends object ? { … } : T`) is not a body.

> **Relative, not absolute.** The prototype counted from file start, which is
> indistinguishable from anchor-relative for the top-level exported symbols it
> was measured on — every one of them sits at depth 0. It is wrong for any
> nested anchor: `match='"scripts"'` in `package.json` sits at depth 1 under the
> root object, so no `}` ever closes a depth-0 block and the extent runs to EOF.
> The same applies to a method inside a class, a rule inside `@media`, and a job
> under `jobs:`. Record the anchor's depth on entry and terminate on return to
> it.
>
> `packages/lumina/styles/runes/hint.css` is the live proof, and it is this
> spec's own showcase example. The whole file is wrapped in `@layer skin {`
> (line 1, closing at line 67), so `.rf-hint` sits at depth 1 and no `}` ever
> closes a depth-0 block: under absolute counting the extent runs to EOF and
> returns all 67 lines instead of 4.

**Reaching EOF without terminating is a refusal, never a return.** If `auto`
scans to the end of the file without finding its terminator, the extent is
unknown — returning the remainder is precisely the plausible-wrong render this
spec exists to prevent. This is not an exotic case: `{% snippet
path="classes.py" symbol="HttpClient" /%}` is the most natural invocation a
Python author can write, `symbol` resolves it correctly, and then the default
`auto` looks for a `;` or `}` that does not exist anywhere in the file. The
refusal must name `extent="dedent"`. The same rule applies to `until` and
`through` that never match — D4.

**4. Extent (`dedent`).** Consume blank lines and lines indented deeper than
the anchor. For Python, YAML, and anything else where indentation carries the
block. This was the prototype's *first* attempt as a **universal** rule, and it
failed there — a multi-line parameter list returns to the anchor's indent level
before the body opens, so it truncated roughly one TypeScript declaration in
eight. It works well as a declared strategy; it does not work as a default.

"Indented deeper" needs a stated tab-expansion width, taken from the language
table. This repo indents TypeScript with tabs and YAML with spaces; a file
mixing them compares a tab against four spaces and gets the comparison
backwards without one.

**5. Extent (`section`).** Consume forward until the next sibling at the
anchor's own level. The terminator is *derived from the anchor line* rather than
supplied by the author: a `###` heading ends at the next `^#{1,3}\s`, a
`[tool.poetry]` table ends at the next `^\[`, a banner comment ends at the next
banner of the same shape. The level-detecting patterns come from the language
table (D10), and a format absent from it falls back to `until` / `through`.

**6. Extent (`paired`).** Balance a matching *token* pair rather than a
delimiter: `{% tabs %}` / `{% /tabs %}`, `<section>` / `</section>`, `{#if}` /
`{/if}`. The pairs come from the language table; nesting of the same token is
counted, so an inner `{% tab %}` does not close the outer `{% tabs %}`. Three
token shapes, and the table must distinguish them:

- **Asymmetric, nestable** — `{% tabs %}` / `{% /tabs %}`, `<section>` /
  `</section>`. Count depth.
- **Symmetric** — a ``` fence. Cannot nest, so the first recurrence closes.
- **Self-closing** — `{% snippet /%}`, `<img>`, `<br>`. There is no close, so a
  `paired` scan anchored on one would run to EOF. Detect the self-closing form
  (`/%}`, `/>`, a void-element list) and return the single line rather than
  scanning.

**7. Self-check.** For `auto` only: re-mask the extracted slice and verify `{}`,
`()`, and `[]` all balance. Unbalanced → refuse. This is what converts the
residual error rate from silent-wrong into loud-fail. `paired` self-checks on
its own token stack; `dedent`, `section`, `until` and `through` do not
delimiter-balance at all — D2.

**8. Head.** Two separate things attach above the anchor line, and they are not
the same kind of thing:

- **Annotations** — `@Component(…)`, `#[derive(Debug)]`, `@dataclass`. These
  are *part of the declaration*, not commentary. A class quoted without its
  decorator is wrong in a way a class quoted without its doc comment is not.
  They attach **always**, independent of `doc`.
- **The doc comment** — a contiguous comment block reaching up from the anchor
  (or from the annotations above it) to the first blank line. Governed by
  `doc`, whose default depends on the addressing mode per D9.

Both need the comment and annotation prefixes to come from the language table,
not from a union regex — see D10.

Measured against TypeScript's own JSDoc attachment (`node.jsDoc`, the only real
oracle for "which comment documents this symbol"), the blank-line rule takes
exactly the attached JSDoc for **749 of 756** resolvable symbols — 99.07%, with
4 over-absorptions and 3 under. Its limit is recorded in D9.

### Generic in practice, not just in principle

The extent engine was run against `packages/lumina/styles/runes/hint.css` with
`match="^\.rf-hint\s*\{"` and extracted the rule correctly — same code, no CSS
knowledge. That is the evidence for `match=` being the real contract and
`symbol=` being sugar: the engine never learns a language, it learns
delimiters.

**But note what that demonstrates and what it does not.** CSS is
brace-balanced, so the CSS result proves the engine is *delimiter*-agnostic,
not *format*-agnostic. The formats that carry no braces at all — Markdown,
YAML, TOML, and the tag-paired family — are the ones D11 exists to reach, and
a Markdown or Svelte fixture is the test that would actually prove the claim.

## Design decisions

**D1 — A regex anchor and a balanced extent, not a parser.** See the table
above. The ~120 lines have no dependency, work on every brace language, and
degrade loudly. A TS-specific resolver would be more accurate on TypeScript and
useless on the CSS, Markdown, JSON, and shell that the docs also quote. If a
future consumer needs true type-aware resolution (overload sets, declaration
merging, re-exports), that is a different feature with a different spec.

**D2 — The self-check is required for `auto`, and inert everywhere else.** For
`auto` it is the difference between a 4.63% error rate that fails loudly and a
4.63% error rate that renders wrong code. Never make it opt-out *there*, and if
a future change makes the masker smarter the self-check gets more accurate, not
less necessary.

It must not be applied globally, because the argument for it does not
generalise. "Zero false alarms is a structural property" holds precisely
*because* the same lexer defect produces both the wrong extent and the
imbalance — which is only true when the extent was **derived from** delimiter
counting. A `section` extent over Markdown prose did not come from delimiter
counting, and prose is full of `:)` and `(in)famous` and half-quoted brackets.
Balance-checking it would turn D4's escape hatch into a false-alarm generator
and, by {% ref "SPEC-126" /%} D3's reasoning, get the guard disabled for the
case that needs it. Scope the check to the strategy that earns it.

**D3 — `match=` is the contract; `symbol=` is sugar over it.** The keyword
table is a convenience for the languages we ship docs in, and it will always be
incomplete. Ship both from day one so an unsupported language is a slightly
more verbose invocation rather than a dead end.

**D4 — Never a dead end.** `until=` / `through=` and `lines=` stay, permanently
and documented. 4.56% of symbols in this repo cannot be resolved by the anchor
engine, and an author who hits one needs a way through that is not "wait for a
fix". Every refusal message must name the fallback:

```
snippet error: could not resolve symbol "renderFullPage" in
packages/html/src/page-shell.ts — the extracted slice is unbalanced, so the
extent is wrong. Use `through="^}"` to end the extent on a closing brace, or
`lines=` to address by line range.
```

The example says `through`, not `until`, deliberately: the brace line belongs
in the slice. D12.

**The fallback must itself fail loudly.** An `until` or `through` whose regex
never matches, like an `auto` extent that reaches EOF, refuses — it does not
return the rest of the file. A fallback that fails silently is worse than no
fallback, because every other refusal message points authors at it.

**D5 — Look up lexical facts by language; never infer strategy from it.**
Guessing `dedent` for `.py` and `auto` for `.ts` would be right most of the
time, and *silently* wrong the rest — reintroducing the failure mode this spec
exists to remove. Default `auto`, and make the author say `dedent`, `section`
or `paired` when they mean it.

The rule is about **strategy**, not about the language table as such — D10
already requires a per-language table for comment and annotation prefixes, and
D11 adds heading shapes and token pairs to it. The distinction that matters:
*what a comment looks like in CSS* is a lexical fact of the format with one
correct answer, and a missing entry degrades to no head absorption rather than
a guess. *Which extent the author wanted* is a choice only the author holds,
and a wrong guess renders plausible wrong code. Table lookups for the first;
never for the second.

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

**D9 — `doc` defaults on for `symbol`, off for `match`.** The two attributes
make different promises, and the default has to follow the promise rather than
be uniform for tidiness:

- `symbol="SiteConfig"` names an **entity** and delegates boundary-finding
  entirely. Having chosen the start line itself, the resolver also owns whether
  the doc comment is part of what was asked for — and it is. A reference
  quoting a declaration without its documentation is a worse quotation.
- `match="^\.rf-hint\s*\{"` names a **line**. The author has already made the
  boundary decision; that is what a raw anchor is *for*. Walking upward past
  the line their regex matched silently overrides them. An author who wants
  the comment can anchor on the comment, or pass `doc=true`.

So `doc` is tri-state: unset takes the mode's default, `doc=true` forces
inclusion, `doc=false` forces exclusion.

**This is not the sniffing D5 forbids.** D5 rules out inferring behaviour from
*the file*, where a wrong guess is silently wrong and the author has no signal
that a guess happened. D9 infers from *which attribute the author wrote* —
an explicit authored choice — and a wrong doc comment is visible on the
rendered page. Different risk class, opposite conclusion.

**The known limit: abutting comments cannot be told apart.** A blank line is
the only available signal that two adjacent comments are distinct, so when a
comment documenting one thing directly abuts the comment documenting the next,
both are taken. `packages/runes/src/tags/card.ts` is the live example — a
21-line JSDoc for the `card` rune, then two `//` blocks with no blank line
between, then `cardSections`. The walk presents the `card` rune's docblock as
documentation for `cardSections`.

This is **not fixable by heuristic** and should not be chased. It is 4 cases in
756, it is visible rather than silent, and the fix belongs in the source file
(a blank line) rather than the resolver. Document it; do not add cleverness.

**The file-header variant deserves naming separately**, because it hits the
*first* declaration of every file rather than 4 scattered ones: a license
block, an SPDX header, a `#!/usr/bin/env` line, or a module docblock abutting
the first symbol is absorbed as that symbol's documentation. `lang-map.ts`
escapes only because line 13 happens to be blank, which is luck rather than
structure. Same limit, same non-fix, much larger blast radius — say so in the
docs so authors reach for `doc=false` rather than filing it as a bug.

**D10 — Comment and annotation prefixes come from the language table, never a
union regex.** The prototype walks `^\s*(//|#|\*|/\*)` across all languages. In
CSS that eats `#header { … }` as a comment; in a language where `#` is
significant it will find something else. There are zero such lines in Lumina
today, so this repo would not notice — but refrakt ships to projects whose
files we have never seen, and a head that silently swallows a preceding rule is
precisely the failure class this spec exists to remove. The prefixes belong in
the same per-language table that supplies `symbol=`'s keywords, and a language
absent from the table gets no head absorption rather than a guessed one.

**D11 — There are four structural families, not two.** `symbol` versus `match`
is the *anchor* axis and D3 settles it: nothing non-code needs a new anchor,
because `match="^## Install"` names a Markdown section perfectly well. The gap
is on the *extent* axis, where `auto` and `dedent` cover two families and the
other two are where every non-code target lives:

| Family | Terminator | Examples | Strategy |
|---|---|---|---|
| Balanced delimiters | matching `}` | TS, CSS, JSON | `auto` |
| Indentation | dedent to anchor level | Python, YAML | `dedent` |
| Sibling-terminated | next peer at the anchor's level | Markdown headings, TOML tables, ini, banner comments, diff hunks | `section` |
| Paired tokens | matching close token | Markdoc, HTML, Svelte, Vue, JSX, fenced blocks | `paired` |

Both additions are earned, not speculative:

- **Sibling-terminated is already in this spec, pushed onto the author.** The
  `README.md` example above originally read `until="^## "`, which works only
  because the author did the heading-level arithmetic by hand. Anchor on a
  `###` and that terminator is wrong; you need `^#{1,3}\s`. A terminator
  derivable from the anchor line is a strategy, not an author burden — and this
  repo quotes Markdown constantly (`lang="markdoc"` snippets on the docs pages,
  and every file under `plan/`).
- **Paired tokens fail *silently*, which is the failure class this spec
  exists to remove.** `LANG_MAP` already ships `markdoc`, `svelte`, `vue`,
  `html` and `jsx`. Point `auto` at a Svelte file anchored on `<script>` and
  delimiter counting terminates at the first `}` closing a brace block at
  anchor depth — somewhere inside the script body. The slice **balances**, so
  the D2 self-check passes and the page renders a plausible wrong span. The
  measurements were TypeScript-only, so this is unexercised rather than
  disproven, and the self-check cannot catch it: the extent is wrong because
  the *wrong family* was used, not because the lexer misread anything.

`auto` stays the default. An author who points it at a tag-paired file should
get a refusal or a documented mis-extent, not a new guess — D5.

**D12 — `until` is exclusive, `through` is inclusive, and neither is a
default.** The spec did not say which, and the two families want opposite
answers: `until="^}"` in code wants the terminator line *in*, `until="^## "` in
Markdown wants it *out*. Either default is silently wrong half the time, on the
attribute D4 designates as the escape hatch of last resort — the one place a
silent wrong answer is least affordable. Two attributes, each saying what it
means, costs one row in a table and removes the ambiguity entirely.

**D13 — `highlight` and `linenumbers` keep file coordinates; `highlight-match`
is the anchor-native form.** Both attributes are currently *defined in terms of
`lines=`*. From the schema in `snippet.ts`:

> `linenumbers` — "Starting number derives from the `lines` range start (e.g.
> lines="74-125" → first line is 74), so numbers reflect the file's real
> offsets."
>
> `highlight` — "Indices are file coordinates (same frame as `lines=`)."

Remove `lines=` and neither has a defined frame. This is not an oversight to
patch later: `{% snippet path="…/lang-map.ts" lines="10-40" linenumbers=true
highlight="18-22" /%}` is live on the `snippet` doc page today, and phase 3's
codemod has to rewrite it into something.

Keep the frame. The resolver already produces a `[start, end]` in file
coordinates, so `linenumbers` continues to start at `start` and `highlight`
continues to mean file lines — no new concept, no breakage, and the displayed
numbers stay meaningful as a pointer back into the real file.

What changes is that a *numeric* `highlight` under an anchor is no longer
something the author can write from knowledge: they would have to look up the
current line numbers, which re-couples the invocation to the coordinates this
spec exists to decouple it from. So add `highlight-match=` — one or more
regexes, each highlighting the lines they match within the resolved slice.
Numeric `highlight` stays legal and stays useful with `lines=`; under an anchor
it carries the old exposure, and the docs should say so plainly rather than
forbidding it.

**D14 — An ambiguous anchor warns, and names every match.** `match=` and
`symbol=` both take the first hit. For overload sets that is a stated non-goal
and fine. It generalises badly: `symbol="get"` in a file of classes takes
whichever `get` comes first, and a second `.rf-hint` rule inside a `@media`
block is indistinguishable from the intended one.

Taking the first match is the right behaviour — refusing would make the common
case worse for no safety gain, since the first match is usually correct. But
taking it *silently* turns an ambiguity the resolver can see into one the
author cannot. Emit a warning naming each matching line, and keep rendering.
Cheap, and it converts a silent ambiguity into a visible one. An `occurrence=`
selector is the fuller answer and is deferred until something needs it.

**D15 — The language table is data, and is built to be merged into.** The
split between what is declarative here and what is not falls in a useful
place:

| Declarative — belongs in the table | Engine — stays code |
|---|---|
| `symbol` keywords, declaration modifiers | the masker state machine |
| comment and annotation prefixes | the depth counter |
| string / template delimiters | continuation lookahead |
| token pairs and their shape (D11) | the `type`-alias special case |
| heading shape and level capture | the balance self-check |
| tab width (step 4) | |

The `symbol=` anchor is a template with one hole — `modifiers* keyword \s+
{name}` — which is as declarative as it gets. That is a consequence of D1: a
parser could not be table-driven, a delimiter engine can.

D3 already concedes the table "will always be incomplete". Two extension
surfaces follow from that, and they are different features:

- **Declaring a language** — comments, strings, delimiters, keywords, token
  pairs for a format core does not ship. Terraform's `resource "…" "…"`, SQL's
  `CREATE TABLE`, Ruby and Lua's `def`/`end` (which need `paired`, not `auto`).
- **Declaring a named anchor** — site-scoped sugar over `match=`, bundling
  match, extent and doc into one authored decision:
  `anchor="rune" name="hint"` resolving through a config entry rather than a
  regex copy-pasted across twenty pages.

**Ship neither surface in this spec.** Nothing has hit the wall yet, and the
right shape will be much better informed by phase 3, which is the first time
the resolver meets languages chosen by need rather than by convenience. What
this spec *does* commit to is structuring the built-in table as data behind a
`mergeLanguages()` seam mirroring `mergeThemeConfig()` — costing nothing now,
where retrofitting a hard-coded table later is the expensive part. When the
surface does ship, the named-anchor half is the one to build first: it is pure
aliasing with no engine involvement, and it gives drift a *name*, so a broken
pattern is one wrong config entry rather than twenty wrong pages.

Two things to get right when it lands. **This is not the sniffing D5 forbids** —
a config entry saying "`.tf` uses `paired` with these tokens" is the project
author declaring a strategy once instead of per-invocation, the same class of
explicit authored choice as D9's inference from which attribute was written.
The engine still never guesses. And **`{name}` interpolation must be escaped**:
a symbol name containing `.` or `(` spliced raw into a regex is injection from
content.

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
- **A config surface for the language table.** The table is built as data and
  merged (D15), but `refrakt.config.json` gains no `languages` or `anchors`
  key in this spec. Deferred until phase 3 shows which formats authors
  actually reach for.
- **Explicit region markers in the source.** `// #region example` … `//
  #endregion`, resolved through the comment-prefix table D10 already builds, is
  the one mode that can address *part* of a construct — "the six lines inside
  `runPipeline` that illustrate the point" is expressible by neither `symbol`
  nor any extent above. It also inverts the drift contract usefully: the anchor
  lives in the source file, where a refactorer sees it, rather than in a doc
  page they never open, and it survives the rename that makes `symbol=` fail.
  Deferred rather than dismissed, on three counts — it requires editing every
  quoted file, it must bypass the D2 self-check by construction (a mid-function
  region is *deliberately* unbalanced), and nothing in `site/content` wants it
  yet. Its own spec when one does.

## Acceptance Criteria

- [ ] `readSnippetFile` resolves `symbol` and `match` anchors in addition to `lines`, and `snippet`, `file-ref`, and `expand` all gain the capability from that one change
- [ ] `symbol` builds its anchor from a documented keyword table; `match` accepts a raw regex; the two are mutually exclusive with each other and with `lines`
- [ ] `extent` accepts `auto` (default), `dedent`, `section`, and `paired`; `until` / `through` override all four
- [ ] `until` excludes its matching line and `through` includes it; neither is inferred from the file or the strategy
- [ ] The masker handles line comments, block comments, single- and double-quoted strings, and template literals including nested `${}`
- [ ] For Markdown, the masker also blanks fenced blocks and inline code spans, covered by a test anchoring past a `## ` heading and a `{% %}` tag that appear inside a fence
- [ ] Anchors match against raw source; a match landing inside a masked region is skipped, covered by tests for `match='"scripts"'` on `package.json` (must resolve) and an anchor mentioned only in a comment (must be skipped)
- [ ] An `auto` extent reaching EOF without terminating refuses and names `extent="dedent"`; an `until` / `through` that never matches refuses the same way
- [ ] An anchor matching more than once takes the first and warns, naming every matching line
- [ ] `dedent` expands tabs at a width taken from the language table
- [ ] `paired` handles asymmetric, symmetric, and self-closing token shapes; a self-closing anchor returns one line rather than scanning to EOF
- [ ] `linenumbers` and numeric `highlight` stay in file coordinates under an anchor; `highlight-match` highlights by regex within the resolved slice
- [ ] The language table is a data structure behind a merge seam, with no hard-coded per-language branching in the engine
- [ ] The extent terminates only on a `;` at anchor depth or a `}` closing a brace block opened at anchor depth; parens and brackets nest without terminating
- [ ] Depth is measured relative to the anchor line, covered by a test anchoring on a nested target (a `package.json` key, a class method, a rule inside `@media`)
- [ ] Brace-less statements use continuation lookahead that skips blank and comment lines
- [ ] `type` aliases do not terminate on a brace
- [ ] Under `extent="auto"`, an extracted slice that is not delimiter-balanced is refused, never rendered
- [ ] The balance self-check does not run for `dedent`, `section`, `until` or `through`, covered by a test extracting a prose Markdown section containing unbalanced brackets
- [ ] `extent="section"` derives its terminator from the anchor's own level, covered by tests on a `###` Markdown heading and a TOML table
- [ ] `extent="paired"` balances nested same-name tokens, covered by a test extracting an outer `{% tabs %}` containing inner `{% tab %}` blocks
- [ ] Annotations (`@Component`, `#[derive]`, `@dataclass`) attach to the symbol always, independent of `doc`
- [ ] `doc` is tri-state: unset defaults to on for `symbol` and off for `match`; `doc=true` and `doc=false` force the choice
- [ ] Comment prefixes, annotation prefixes, heading/section shapes, and token pairs all come from the per-language table; a language absent from it gets no head absorption and no `section` / `paired` support rather than a guessed one
- [ ] A test covers the abutting-comment limit (D9) so the behaviour is pinned rather than accidental
- [ ] Every refusal names the file, the anchor, the reason, and the `until=` / `through=` / `lines=` fallback
- [ ] Failures use the existing error-fence path and emit a `ctx.error` diagnostic — no new failure channel
- [ ] A regression corpus test scores the resolver against the repo's own sources and asserts the silent-wrong count stays at or below its recorded baseline
- [ ] `extent="dedent"` is covered by tests against an indentation-structured fixture
- [ ] The engine is proven delimiter-agnostic by a test extracting a CSS rule via `match=`, and format-agnostic by tests on a brace-free format (Markdown or YAML) and a tag-paired one (Svelte or Markdoc)
- [ ] `extent="auto"` against a tag-paired file either refuses or is documented as unsupported — never renders a brace-terminated span from a tag-structured source
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
2. **The remaining extents, `until` / `through`, and the docs.** `dedent`,
   `section` and `paired` (D11) plus the two explicit terminators (D12).
   Completes the surface and closes D4's dead-end risk before anyone depends on
   the feature. `section` and `paired` are the ones that make the non-TypeScript
   half of `site/content` addressable at all, so phase 3's migration should not
   start before they land.
3. **The codemod and the migration.** Converts the 23 existing invocations and
   removes the live exposure, {% ref "BUG-015" /%} included. Regex-literal
   lexing (D8) lands here if the migration surfaces refusals that need it. The
   codemod must also handle companion attributes: an invocation carrying
   `highlight=` needs those coordinates preserved or rewritten as
   `highlight-match=` (D13), and byte-identical verification covers the slice
   only, not the highlight, so that rewrite needs its own check.
   This phase is also the input to D15 — record which languages and formats
   actually came up, because that is what decides the shape of the config
   surface if one ships.
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
- **Annotation handling is specified but untested.** This repo contains zero
  decorators and zero CSS lines beginning `#`, so neither D10's hazard nor the
  annotation rule was exercised by the measurements — both are reasoned, not
  observed. The corpus test cannot cover them from this repo's sources alone
  and will need hand-built fixtures.
- **Is `match=` a regex or a literal by default?** A raw regex is more powerful
  and more likely to be miswritten by an author who does not realise `.` and
  `(` are special. A `match-type="literal|regex"` attribute is the obvious
  answer and may be over-engineering for the first pass.

## References

- {% ref "SPEC-078" /%} — `file-ref`; listed symbol resolution as a non-goal and named line-range staleness as the tax this spec repays
- {% ref "SPEC-062" /%} — `snippet`; the origin of the `lines=` addressing model and the error-fence path D6 reuses
- {% ref "SPEC-066" /%} — `expand`; the third consumer of the shared reader
- {% ref "SPEC-113" /%} — the `ProjectFiles` seam that owns containment, unchanged by this spec
- {% ref "SPEC-129" /%} — the pre-transform `include` rune. A fourth path-addressed rune: if it lands, it should take the same addressing layer rather than growing its own `lines=`
- {% ref "SPEC-126" /%} — rejected line-addressed embedding for the config reference and proposed the one-off assertion this spec generalises
- {% ref "BUG-015" /%} — the observed instance: three live `file-ref` drawers labelled `SiteConfig` rendering three unrelated interfaces
- `packages/runes/src/lib/read-file.ts` — the shared reader this extends

{% /spec %}
