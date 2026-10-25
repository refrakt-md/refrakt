---
'@refrakt-md/runes': minor
'@refrakt-md/cli': minor
'@refrakt-md/language-server': minor
'@refrakt-md/mcp': minor
---

New `refrakt format [paths]` re-indents nested runes. A rune's content is indented one tab only when the rune holds another block rune. A rune holding only prose stays flat, and inline runes do not count. Only leading whitespace changes, and fenced code moves as a block with its own indentation kept. Before writing, the formatter checks that the file still parses to the same tree; if it would not, the file is left alone and reported with its line.

- `refrakt format --check` writes nothing and exits 1 if any file would change, for CI. `--format json` gives a machine-readable report.
- The language server provides document formatting with the same rule, so editors can format on save.
- The MCP server adds a `refrakt.format` tool.
- `formatIndentation` is exported from `@refrakt-md/runes` for other tools.
