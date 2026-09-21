{% work id="WORK-588" status="ready" priority="high" complexity="complex" source="SPEC-131" tags="snippet, file-ref, resolver, extents, markdown, drift" milestone="v0.37.0" %}

# The remaining extents — dedent, section, paired, and the explicit terminators

{% ref "WORK-587" /%} makes brace-structured code addressable. This item makes
everything else addressable, and closes D4's dead-end risk **before** anyone
depends on the feature.

{% ref "SPEC-131" /%} D11 is the case: there are four structural families, not
two, and the two this item adds are where every non-code target lives.

| Family | Terminator | Examples | Strategy |
|---|---|---|---|
| Balanced delimiters | matching `}` | TS, CSS, JSON | `auto` — {% ref "WORK-587" /%} |
| Indentation | dedent to anchor level | Python, YAML | `dedent` |
| Sibling-terminated | next peer at the anchor's level | Markdown headings, TOML tables, ini | `section` |
| Paired tokens | matching close token | Markdoc, HTML, Svelte, Vue, JSX | `paired` |

## Why `paired` is urgent rather than nice

**It is the one gap that fails silently.** Point `auto` at a Svelte file
anchored on `<script>` and delimiter counting terminates at the first `}`
closing a brace block at anchor depth — somewhere inside the script body. The
slice **balances**, so {% ref "WORK-587" /%}'s self-check passes and the page
renders a plausible wrong span. The self-check cannot catch it: the extent is
wrong because the wrong *family* was used, not because the lexer misread
anything.

`LANG_MAP` already ships `markdoc`, `svelte`, `vue`, `html` and `jsx`, so this
is reachable today by anyone quoting those files.

## The Markdown masker is its own budget line

For `section` and `paired` over Markdown the masker must blank fenced blocks and
inline code spans — and on a docs site those fences frequently *contain the very
tokens being counted*. `site/content/runes/tabs.md:44` has `{% tab %}` in an
inline code span. The pages most worth quoting with `paired` are exactly the
ones full of fenced examples of the tags.

{% ref "SPEC-131" /%} says plainly: budget this separately from the C-family
masker; it is not the same ~40 lines.

## Three token shapes, and the table must distinguish them

- **Asymmetric, nestable** — `{% tabs %}` / `{% /tabs %}`, `<section>` /
  `</section>`. Count depth.
- **Symmetric** — a ``` fence. Cannot nest, so the first recurrence closes.
- **Self-closing** — `{% snippet /%}`, `<img>`, `<br>`. There is no close, so a
  `paired` scan anchored on one would run to EOF. Detect and return one line.

## `until` and `through` are two attributes on purpose

D12: `until="^}"` in code wants the terminator line *in*; `until="^## "` in
Markdown wants it *out*. Either default is silently wrong half the time, on the
attribute D4 designates as the escape hatch of last resort. Two attributes, each
saying what it means.

## Acceptance Criteria

- [ ] `extent` accepts `auto` (default), `dedent`, `section`, and `paired`; `until` / `through` override all four
- [ ] `until` excludes its matching line and `through` includes it; neither is inferred from the file or the strategy
- [ ] An `until` / `through` that never matches refuses rather than returning the rest of the file
- [ ] For Markdown, the masker also blanks fenced blocks and inline code spans, covered by a test anchoring past a `## ` heading and a `{% %}` tag that appear inside a fence
- [ ] `dedent` expands tabs at a width taken from the language table
- [ ] `extent="dedent"` is covered by tests against an indentation-structured fixture
- [ ] `extent="section"` derives its terminator from the anchor's own level, covered by tests on a `###` Markdown heading and a TOML table
- [ ] `extent="paired"` balances nested same-name tokens, covered by a test extracting an outer `{% tabs %}` containing inner `{% tab %}` blocks
- [ ] `paired` handles asymmetric, symmetric, and self-closing token shapes; a self-closing anchor returns one line rather than scanning to EOF
- [ ] The balance self-check does not run for `dedent`, `section`, `until` or `through`, covered by a test extracting a prose Markdown section containing unbalanced brackets
- [ ] `paired` self-checks on its own token stack
- [ ] `extent="auto"` against a tag-paired file either refuses or is documented as unsupported — never renders a brace-terminated span from a tag-structured source
- [ ] Heading/section shapes and token pairs come from the per-language table; a language absent from it gets no `section` / `paired` support rather than a guessed one
- [ ] The engine is proven format-agnostic by tests on a brace-free format (Markdown or YAML) and a tag-paired one (Svelte or Markdoc)
- [ ] `snippet` and `file-ref` doc pages document the new attributes, including the fallbacks

## Approach

`dedent` is the simplest and was the prototype's first attempt at a *universal*
rule — it failed there (a multi-line parameter list returns to the anchor's
indent before the body opens, truncating roughly one TypeScript declaration in
eight) and works well as a declared strategy. Do not be tempted to promote it.

**Never infer strategy from the file** (D5). Guessing `dedent` for `.py` and
`auto` for `.ts` would be right most of the time and silently wrong the rest,
reintroducing the failure mode the spec exists to remove. Table lookups for
lexical facts; never for strategy.

Order within the item: `until` / `through` first (they are small and they are
what every refusal message points at), then `dedent`, then the Markdown masker,
then `section` and `paired` on top of it.

## Blocked by

- {% ref "WORK-587" /%} — the resolver these are strategies within

## Notes

{% ref "WORK-590" /%}'s migration should not start before this lands —
`section` and `paired` are what make the non-TypeScript half of `site/content`
addressable at all.

## References

- {% ref "SPEC-131" /%} — steps 4–6, D4 (never a dead end), D5 (look up facts, never strategy), D11 (four families, and why both additions are earned), D12 (`until` vs `through`)
- {% ref "WORK-586" /%} — the table these strategies read their shapes from
- `site/content/runes/tabs.md` — the inline-code-span case the Markdown masker must survive

{% /work %}
