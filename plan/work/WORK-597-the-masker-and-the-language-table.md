{% work id="WORK-597" status="done" priority="high" complexity="complex" source="SPEC-131" tags="snippet, file-ref, resolver, lexing, language-table, drift" milestone="v0.37.0" pr="refrakt-md/refrakt#645" %}

# The masker and the language table

{% ref "SPEC-131" /%}'s Approach ends with an instruction: **"Budget the masker,
not the regex."** This item is the masker, plus the data structure every later
item in the spec reads from. It ships no author-facing attribute and changes no
rendered output — it is the lexical layer everything else stands on.

Splitting it out is deliberate. Bundled into the resolver it would be reviewed
as an implementation detail of anchoring, and it is not: D10 makes the language
table a correctness boundary (a union comment regex eats `#header { … }` in
CSS), and D2 makes the masker's accuracy the thing the self-check's zero
false-alarm property depends on.

## The masker

Blank out comments and string/template literals so delimiter counting is safe,
**preserving newlines** so line numbers survive the transformation. Template
literals nest: `${` inside a backtick returns to code state and the matching `}`
returns to template state.

The spec budgets this at ~40 lines shared by the whole C family plus JSON and
CSS. It excludes Markdown, which is {% ref "WORK-588" /%}'s — the spec is
explicit that recursive fence and inline-code masking is "not the same ~40
lines" and belongs with the strategies that need it.

**Regex literals are the known gap (D8).** `/…/` is not lexed, which is the
cause of the single silent-wrong case in the 1,360-symbol measurement and most
of the 62 refusals. Deferred deliberately: the error it produces is
overwhelmingly the safe kind, and phase 1's value does not depend on it. Do not
fix it here — {% ref "WORK-590" /%} picks it up if the migration surfaces
refusals that need it.

## The language table

Data, not branching. D15 splits it cleanly:

| Declarative — belongs in the table | Engine — stays code |
|---|---|
| `symbol` keywords, declaration modifiers | the masker state machine |
| comment and annotation prefixes | the depth counter |
| string / template delimiters | continuation lookahead |
| token pairs and their shape | the `type`-alias special case |
| heading shape and level capture | the balance self-check |
| tab width | |

Two rows above are consumed by {% ref "WORK-588" /%} rather than here (token
pairs, heading shapes, tab width). Declare them in the table's shape now anyway
— retrofitting a hard-coded table is the expensive part, and the seam is what
this item exists to get right.

**The merge seam is the deliverable, not a config surface.** `mergeLanguages()`
mirrors `mergeThemeConfig()`. `refrakt.config.json` gains **no** `languages` or
`anchors` key in this milestone — D15 defers that until {% ref "WORK-590" /%}
shows which formats authors actually reach for.

## Acceptance Criteria

- [x] The masker handles line comments, block comments, single- and double-quoted strings, and template literals including nested `${}`
- [x] Masking preserves newlines, so a masked source has the same line count and the same line offsets as its input
- [x] Comment prefixes, annotation prefixes, string and template delimiters, `symbol` keywords and declaration modifiers all come from a per-language table, with no per-language branching in the masker
- [x] The table also carries heading/section shapes, token pairs and tab width, even though {% ref "WORK-588" /%} is their first consumer
- [x] A language absent from the table gets no head absorption rather than a guessed one, covered by a test on a format with no table entry
- [x] A CSS fixture containing `#header { … }` is not treated as carrying a comment, pinning D10's hazard
- [x] The table is exposed behind a `mergeLanguages()` seam mirroring `mergeThemeConfig()`
- [x] No `languages` or `anchors` key is added to `refrakt.config.json`
- [x] Regex literals are documented as unlexed, with a test pinning the resulting behaviour rather than asserting correctness

## Approach

Lives in `packages/runes/src/lib/` beside `read-file.ts`, as its own module —
the resolver imports it, and {% ref "WORK-591" /%}'s normalization does not
(D2: comments stay in the hash, so the marker never masks).

Write the table first and the state machine against it. The temptation is the
reverse, and it produces exactly the union regex D10 forbids.

## Notes

`LANG_MAP` already ships `markdoc`, `svelte`, `vue`, `html` and `jsx`. Those
entries exist for syntax highlighting and are not this table — but the language
*identification* they do (extension → language id) should be reused rather than
duplicated.

## References

- {% ref "SPEC-131" /%} — step 1 (the masker), D8 (regex literals, deferred), D10 (table not union regex), D15 (what is data and what is engine, and the merge seam)
- `packages/runes/src/lib/read-file.ts` — the shared reader this sits beside
- `packages/runes/src/lang-map.ts` — existing extension → language identification, to reuse

## Resolution

Completed: 2026-09-24

Branch: `claude/v0-37-0-review-vqpl41`
PR: refrakt-md/refrakt#645

### What was done

- **`packages/runes/src/lib/languages.ts`** (new) — the table, as data.
  Comment prefixes, annotation prefixes, string and template delimiters,
  `symbol=` keywords and declaration modifiers for 14 languages, plus the
  heading shapes, token pairs and tab width WORK-588 consumes. `TokenPair`
  carries a `shape` discriminant (asymmetric / symmetric / selfClosing)
  because a `paired` scan anchored on a self-closing token would otherwise
  run to EOF. Exposes `mergeLanguages()` and `resolveLanguage()`.
- **`packages/runes/src/lib/mask.ts`** (new) — the state machine, written
  against the table with no per-language branching. Plus `isMasked` /
  `isRangeMasked` (the anchor step's rejection test), `docHeadStart` (the
  table-driven half of WORK-587's `doc`) and `symbolAnchorPattern`.
- **`packages/runes/test/mask.test.ts`** (new) — 46 tests.
- **`packages/runes/src/index.ts`** — exports the table and the masker as
  separate concerns, mirroring D15's split.

### Notes

- **The data/engine split is load-bearing, not tidiness.** `languages.ts`
  has no logic and `mask.ts` has no language names. Anything added to one
  that belongs in the other re-creates the union-regex hazard D10 forbids.
- **CSS declares no line comment**, which is D10 stated as data rather than
  guarded against in code. JSON likewise. Both are pinned by tests.
- **`mergeLanguages()` replaces arrays rather than concatenating**, so a
  project can *remove* a comment prefix. A concatenating merge makes that
  impossible, and removal is the case a project narrowing a language needs.
- **No config surface shipped.** `refrakt.config.json` is unchanged, per
  D15 — the seam exists, the key does not.
- **Regex literals (D8) are pinned, not fixed.** Two tests record what the
  masker does today and say in the assertion that this is not a claim of
  correctness; they should flip when lexing lands. Do not "fix" them
  without doing the lexing. WORK-590 owns that decision.
- **Markdown masking is deliberately absent.** `markdoc` declares its
  heading shapes and token pairs, and a test asserts the masker leaves
  Markdown untouched — the recursive fence and inline-code masking is
  WORK-588's, and the spec is explicit it is "not the same ~40 lines".
- `cFamily()` is a function rather than a shared object so the four C-family
  languages do not alias one another's arrays.

### Verification

Full suite green: 384 files, 4727 tests, 0 failures. `tsc` clean,
`format:check` clean, `biome lint` clean on the new files.

An intermediate full-suite run showed 101 failures, every one a
`Cannot find package …/dist` from a partially-built workspace; they cleared
after `npm run build`. Recorded because "it was the build state" is a claim
that should be checked rather than assumed — it was.

{% /work %}
