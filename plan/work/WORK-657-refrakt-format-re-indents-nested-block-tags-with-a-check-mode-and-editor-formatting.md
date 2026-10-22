{% work id="WORK-657" status="ready" priority="high" complexity="moderate" source="SPEC-170" tags="markdoc, cli, formatting, language-server, tooling, ci" milestone="v0.42.0" %}

# refrakt format re-indents nested block tags, with a check mode and editor formatting

Once {% ref "WORK-645" /%} allows indentation, {% ref "SPEC-170" /%} D5 sets the rule for when to
indent: a block tag's content is indented only when it contains another block tag. A rule nobody
can apply mechanically drifts, and no existing tool applies this one:

- **`Markdoc.format`** (0.5.10) has `allowIndentation`, but its indent is hard-coded to two
  spaces, it indents every tag's children including the outermost, and it reprints the whole
  document from the AST. It normalises list markers, numbering, tables, emphasis and long tag
  openings, so a first run would rewrite almost every file in the repository.
- **Biome** does not format Markdown. **Prettier** reads indented Markdoc as code blocks and
  mangles the tags.

So `refrakt format` is a narrow re-indenter that changes leading whitespace and nothing else.

## Acceptance Criteria

- [ ] `refrakt format [paths]` re-indents `.md` files by SPEC-170 D5: one tab per level of block-tag nesting, applied only inside a block tag that contains another block tag; inline tags do not count
- [ ] It changes only the leading whitespace of lines inside block tags; every other byte is unchanged, asserted on fixtures that include lists, tables, emphasis and long tag openings
- [ ] A fenced code block keeps its internal relative indentation and is shifted as a whole
- [ ] It writes a file only when the AST parsed with the shared `parse` is unchanged; otherwise it reports the file and line and leaves the file alone
- [ ] Formatting is idempotent: a second run changes nothing, asserted on every fixture
- [ ] `refrakt format --check` exits non-zero and names each file that would change; CI runs it beside `npm run format:check` (`.github/workflows/format.yml`)
- [ ] The language server provides document formatting with the same function, so editors can format on save
- [ ] Every file under `plan/` is unchanged by a run, asserted once in the resolution
- [ ] The MCP server exposes it, or the resolution records why not
- [ ] The composed-runes guide and the content-authoring docs state the rule and the command

## Approach

- Use the tokenizer to find each block tag's opening and closing lines. Work out each line's
  nesting depth, and rewrite the leading whitespace only. Do not reprint from the AST.
- Lines inside fences, and continuation lines of list items, need care. The AST-equality guard
  is what makes a mistake there harmless: a wrong rewrite is refused, not written.
- The CI check starts with the paths the rule is enforced on (`site/content/`, the composed
  fixtures, `plan/`), and widens as {% ref "WORK-658" /%} migrates them.

## Blocked by

- {% ref "WORK-645" /%}: the shared `parse` with `allowIndentation`.

## References

- {% ref "SPEC-170" /%}: D3 (round trips), D5 (the rule).

{% /work %}
