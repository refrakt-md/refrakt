---
title: refrakt format
description: Indent nested runes by the indentation rule, with a check mode for CI
---

# refrakt format

Re-indents Markdown so nested runes read as nested. It applies one rule: **a rune's content is indented one tab only when the rune holds another block rune.**

```markdoc
{% tabs %}
	{% tab name="npm" %}
	Install with npm.
	{% /tab %}
	{% tab name="pnpm" %}
	Install with pnpm.
	{% /tab %}
{% /tabs %}
```

`tabs` holds `tab` runes, so its content is indented. Each `tab` holds only prose, so its content stays at the tab's own level. A rune written inline, inside a line of text, does not count. Fenced code moves as a block and keeps its own indentation.

```shell
refrakt format site/content          # re-indent every .md file under a directory
refrakt format docs/page.md          # or one file
refrakt format --check site/content  # write nothing; exit 1 if any file would change
```

With no path, it formats the current directory. Directories are walked for `.md` files, skipping `node_modules`, build output and dot-directories.

## What it changes

Only the leading whitespace of lines inside a rune that holds another rune. Every other byte stays as written: list markers, numbering, emphasis, long tag openings and tables included. It does not reprint the document, which is why it is not `Markdoc.format`.

Before writing a file, it parses the result and compares it with the original. If anything other than indentation would change, it leaves the file alone and reports it, with a line number, and exits 1. A refusal means the formatter has met a case it gets wrong, so please report it.

## Options

| Option | Effect |
|--------|--------|
| `--check` | Write nothing. List each file that would change, and exit 1 if there is any |
| `--ignore <path>` | Leave out a file, or a directory and everything under it. Repeat it for several. Use it for generated content, which its generator rewrites |
| `--format json` | Print `{ check, files, changed, refused }` instead of text |

## In an editor and for agents

The refrakt language server formats a document with the same function, so an editor that formats on save keeps a file in the shape `--check` expects. The MCP server exposes it as `refrakt.format` (see [MCP tools](/docs/mcp/tools)).

## Why the rule is not "indent everything"

Everywhere outside refrakt, a line indented by four spaces or a tab is a code block: GitHub, most editor previews and other Markdown tools render it that way. refrakt reads indentation as structure instead, so indenting is free here. It is worth doing only where it shows nesting. A rune holding only prose stays flat, and so it reads the same everywhere.
