# Parser positions: can one inline value be changed, touching only its bytes?

A throwaway spike, run on 2026-11-19 for `notes/marquise-foundation.md`, X5 (raised by the outside
review, `notes/marquise-review-2026-11-18.md`, fresh perspective 3). Marquise's write path (after 1.0)
promises surgical edits: change a value, leave every other byte alone. That needs to know exactly where a
value sits in the source. This spike asks each candidate parser.

```bash
npm install
npm run probe:markdoc   # positions on Markdoc's AST
npm run probe:comark    # positions on Comark's tokens and tree
npm run probe:mdast     # positions on mdast (micromark) with generic directives
npm run probe:mdc       # positions on mdast with MDC syntax (remark-mdc)
npm run edit            # three edits through each, verified by re-parsing
```

Versions: `@markdoc/markdoc` 0.5.13, `comark` 0.9.2, `mdast-util-from-markdown` 2.1.0 with
`micromark-extension-directive` 4.0.0, `remark-mdc` 3.11.1.

## What each parser knows

| | Block nodes | Inline nodes (a link, emphasis) | A link's destination | A tag's attribute value |
|---|---|---|---|---|
| Markdoc | line range | **the block's line range, inherited** | not located | not located; the tag's lines only |
| Comark | line range, on the markdown-it tokens of **every** block (not only components) | none (`map: null`) | not located | not located; the component's lines only |
| Comark's tree | none | none | none | none |
| mdast (micromark) | exact offsets | **exact offsets** | inside the link's own exact span | not located; the directive's exact span |
| mdast via `remark-mdc` (MDC syntax) | exact offsets | exact offsets, explicit slots included | inside the link's own exact span | not located; the component's exact span |

Markdoc and Comark are both built on markdown-it, which maps block tokens to lines and inline tokens to
nothing; this corrects the earlier Comark spike's note that only components carry a line map.

## The edits

| Case | Markdoc (lines, then scanning) | Comark | mdast | Markdoc structure + micromark positions in one block |
|---|---|---|---|---|
| A: a link's `href` in a list item | correct | same as Markdoc | correct | (not needed) |
| B: a link in a wrapped paragraph, after code spans that look like links | **wrong**: the edit changed `` `[docs](/old)` `` inside a code span, and the link kept `/old` | same as Markdoc | correct | correct |
| C: a tag attribute's value | needs a scanner over the tag's opening | same | needs a scanner over the directive's opening | (not tested) |

- **Scanning text inside a line range fails on ordinary content**, and silently: case B corrupted a code
  example. Re-parsing noticed only because the link's `href` had not changed; a corruption elsewhere needs
  a check that every other byte and field is unchanged (the GetPut and frame checks of X4).
- **With exact offsets, a value is found inside its own node's span,** so look-alikes elsewhere cannot be
  hit.
- **A hybrid works for this case:** Markdoc for structure, micromark re-reading only the block's lines for
  inline positions, matched by order. Both parsers must agree on inline structure; Markdoc's inline tags
  and variables are plain text to micromark; so every hybrid edit must be verified by re-parsing and refused
  on any mismatch.
- **No parser locates attribute values.** All give the opening of the tag or component (exact in mdast,
  by line in Markdoc and Comark), so a small attribute tokenizer over that span is needed whichever parser
  is chosen.
- **The MDC syntax already has a positioned parser:** `remark-mdc` (nuxt-content, updated July 2026)
  parses `::hero{…}` with explicit slots into mdast with exact offsets everywhere.

## Not tested

Multi-line tag openings; escapes and entities in destinations; reference-style links and autolinks;
Markdoc inline tags and variables inside the block under the hybrid; performance; whether Markdoc's
tokenizer or Comark's tree could carry inline positions upstream.
