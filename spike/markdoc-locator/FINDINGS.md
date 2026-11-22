# A positioned locator for Markdoc: does it agree with Markdoc, and can it place edits?

A throwaway spike, run on 2026-11-22 for `notes/marquise-foundation.md`, Q9. Marquise's write path keeps
Markdoc as the only reader and uses a separate **locator** only to find where things are. The plan: micromark
with an extension for Markdoc's syntax, attribute values located by Markdoc's own tag grammar, matched against
the reader's tree, refusing any edit where they disagree. This spike builds that and measures it.

```bash
npm install
npm run agree   # agreement between Markdoc's tree and the locator's, over refrakt's corpus
npm run edit    # the edit suite: locate, replace only those bytes, verify with the reader
npm run bench   # the cost of the second parse
```

Versions: `@markdoc/markdoc` 0.5.14, `mdast-util-from-markdown` 2.x with GFM table and strikethrough, `peggy`
4, `yaml` 2.

## What was built

- **`src/micromark-markdoc.ts`** (~150 lines): a block construct (a tag alone on its lines, multi-line openings
  included) and an inline construct (a tag anywhere in text), both honouring Markdoc's string rule for `%}`.
  Markdoc's missing constructs are switched off: indented code, setext headings and raw HTML.
- **`src/tag-grammar.ts`**: Markdoc's `tag.pegjs`, read from the installed package and recompiled with peggy;
  the only change wraps values so they carry offsets. Attribute values, the primary value and `#id`
  shorthands come back with exact positions, and can never disagree with Markdoc about what an attribute is.
- **`src/normalize.ts`**: both trees reduced to one event sequence (containers, text, tags, code, links).

## Agreement over refrakt's corpus

1,474 files (`site/content`, `plan/`, staged runes, fixtures, plugin and package Markdown).

| Step | Identical |
|---|---|
| Plain `Markdoc.parse` against the locator | 1,431 (97.1%) |
| Refrakt's real reader (`escapeFenceTags` first) | 1,459 (99.0%) |
| Markdoc's tag-pairing rules mirrored in the comparison | **1,465 (99.4%)** |

**The nine remaining files, all examined:**

- **Eight: an unclosed inline tag in prose,** tag names written as documentation without `/` ("converted to
  {% ref %} tags", "`{% palette %}` blocks"). markdown-it's inline parsing degrades around them: formatting
  in the rest of the line is lost, and empty list items appear. These are authoring errors Markdoc tolerates
  oddly; a write there is refused.
- **One: a `|` inside a code span in a table cell.** markdown-it keeps the cell whole; micromark follows the GFM
  specification and splits it. Refused.

**Findings on the way:**

- **Indented tag bodies need no shim.** With indented code disabled, micromark accepts deeper indentation
  for headings and other blocks, as Markdoc's `allowIndentation` does.
- **Markdoc processes tags inside fences by default** (`process` defaults to true): an unclosed `{% tag %}` in a
  code example opens a real tag, and plain Markdoc then renders the rest of the page inside the `<pre>`.
  Refrakt avoids it with `escapeFenceTags` before every parse. **Marquise's Markdoc reader must include the
  same step**, and the locator, which never parses tags in fences, then agrees.
- **Values can be spelt differently by the two parsers:** markdown-it percent-encodes a link destination
  (`/with%20space`), micromark keeps it. Spans agree; the printer must keep the author's form when writing.
- **Refrakt content that is not valid Markdoc:** `{% slot name="sections" each %}` (a bare `each`, in
  `site/staged-runes/steps.md` and the composed-storytelling fixtures) is a syntax error to Markdoc's grammar.
  Both parsers report it identically.

## The edit suite

Each edit is located, only its bytes are replaced, and the result is read with refrakt's reader; it passes
only if the reader's events equal the original's with exactly the one value substituted.

| Case | Result |
|---|---|
| a link destination after a look-alike inside a code span (the first spike's failure) | pass |
| a reference's primary value in a link-with-data list item | pass |
| a templated value in text after an inline tag | pass |
| an attribute in a multi-line block tag opening | pass |
| an `#id` annotation on a heading | pass |
| a destination with escapes, `<…>` and a title | pass |
| a reference-style link definition | pass |
| a table cell | pass |
| a list item nested and tab-indented inside two tags | pass |
| a link beside a variable | pass |
| frontmatter through a YAML CST | pass, with `yaml`'s **CST API** (`CST.setScalarValue`); its document API reformats comments and flow sequences, so it is not lossless |
| refusal: a pipe in a code span in a table cell | refused |
| refusal: an unclosed inline tag in prose | refused |

**11 of 11 edits verified, 2 of 2 disagreements refused.** Within a single text node no other construct can
interfere, so a template finds a literal there safely: what failed in the first spike was scanning across
node kinds, which exact spans avoid.

## Cost

1,421 files, 9.6 MB: Markdoc reads them in 1.35 s (0.95 ms a file), the locator in 7.4 s (5.2 ms a file,
5.5 times as long). It runs only for documents being written, so an edit pays a few milliseconds; a codemod
over the whole corpus, seconds.

## What this supports

- **The plan holds:** Markdoc as the only reader, micromark plus a Markdoc extension as the locator, Markdoc's
  own grammar for attributes, refusal on disagreement, verification by re-reading.
- **The reader includes the fence escape,** as refrakt's does.
- **Frontmatter through `yaml`'s CST API,** not its document API.
- **The printer keeps the author's spelling** of values the parsers normalise (link destinations).
- **One parser later?** At 99.4% agreement, with the rest authoring errors and one known GFM difference, the
  locator could plausibly become the reader too; but its tree differs from Markdoc's exactly where content is
  malformed, and that is where an author's page would change. Not without matching markdown-it's tolerance
  first.

## Not tested

Escapes and entities inside tag attribute values; nested fences of different lengths; footnotes and other
extensions refrakt does not use; very large files; Comark (`remark-mdc` is positioned already).
