{% work id="WORK-657" status="done" priority="high" complexity="moderate" source="SPEC-170" tags="markdoc, cli, formatting, language-server, tooling, ci" milestone="v0.42.0" pr="refrakt-md/refrakt#717" %}

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

- [x] `refrakt format [paths]` re-indents `.md` files by SPEC-170 D5: one tab per level of block-tag nesting, applied only inside a block tag that contains another block tag; inline tags do not count
- [x] It changes only the leading whitespace of lines inside block tags; every other byte is unchanged, asserted on fixtures that include lists, tables, emphasis and long tag openings
- [x] A fenced code block keeps its internal relative indentation and is shifted as a whole
- [x] It writes a file only when the AST parsed with the shared `parse` is unchanged; otherwise it reports the file and line and leaves the file alone
- [x] Formatting is idempotent: a second run changes nothing, asserted on every fixture
- [x] `refrakt format --check` exits non-zero and names each file that would change; CI runs it beside `npm run format:check` (`.github/workflows/format.yml`)
- [x] The language server provides document formatting with the same function, so editors can format on save
- [ ] Every file under `plan/` is unchanged by a run, asserted once in the resolution
- [x] The MCP server exposes it, or the resolution records why not
- [x] The composed-runes guide and the content-authoring docs state the rule and the command

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

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- `packages/runes/src/format-indent.ts`: `formatIndentation` lays out each block tag's body from the AST's tag and fence line ranges.
  - Owned lines: their common leading whitespace becomes one tab per holding tag.
  - Child fences and multi-line openings move with their first line.
  - Relative indentation is kept. Blank lines are left alone, except inside fences.
  - `guardRewrite` accepts only a rewrite with the same AST, parsed as the pipeline parses (`escapeFenceTags`, plus `each` normalised for templates).
- `packages/cli/src/commands/format.ts` + `bin.ts`: `refrakt format [paths] [--check] [--format json]`, exported as `@refrakt-md/cli/format.js`.
- `packages/language-server/src/providers/formatting.ts`: `documentFormattingProvider` with per-line indentation edits.
- `packages/mcp/src/tools/core.ts`: `refrakt.format`.
- CI: root scripts `format:md` / `format:md:check` (`site/content` and the composed fixtures). The check runs in `validate.yml`.
- Tests: `runes/test/format-indent.test.ts`, `cli/test/format-command.test.ts`, `language-server/test/formatting.test.ts`, `mcp/test/format-tool.test.ts`.
- Docs: `docs/cli/format.md` (new), `docs/content.md`, `docs/mcp/tools.md`, `composed-runes.md`, CLAUDE.md.
- Repository-wide (1,545 tracked `.md`): no refusals, idempotent.

### Notes
- **`plan/` is not unchanged, and is not covered (criterion left open by decision).** Five specs (SPEC-004, 006, 008, 050, 051) hold nested block tags such as `{% sandbox %}`. D5 would indent their whole bodies, and GitHub would render them as code. The owner chose to keep `plan/` out of the run and the CI check, rather than refine D5 or accept that.
- **CI location:** the check runs in `validate.yml`, not beside Biome in `format.yml` as the criterion says. The formatter is the CLI and needs the build, and `format.yml` is deliberately build-free. A comment there points to it.
- The guard fired once for real (SPEC-006, a whitespace-only line inside a fence). That led to fence-interior whitespace lines moving with the fence.

{% /work %}
