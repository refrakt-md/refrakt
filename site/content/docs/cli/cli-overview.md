---
title: CLI Overview
description: Command-line tools for content generation, theme development, and project management
---

# CLI Overview

The `refrakt` CLI provides tools for generating content, inspecting rune output, auditing themes, and managing your project. Install it alongside your other refrakt.md packages:

```shell
npm install @refrakt-md/cli
```

This makes the `refrakt` command available in your project scripts and via `npx refrakt`.

## Commands

| Command | Purpose |
|---------|---------|
| [inspect](/docs/cli/inspect) | Preview identity transform output and audit CSS coverage |
| [write](/docs/cli/write) | Generate Markdown content using AI |
| [extract](/docs/cli/extract) | Generate API reference docs from TypeScript or Python source |
| [contracts](/docs/cli/theme-tools#refrakt-contracts) | Generate and validate structure contracts |
| [scaffold-css](/docs/cli/theme-tools#refrakt-scaffold-css) | Generate CSS stub files for a new theme |
| [validate](/docs/cli/theme-tools#refrakt-validate) | Validate theme config and manifest |
| [theme](/docs/cli/theme-tools#refrakt-theme) | Install themes and show theme info |

## Quick examples

```shell
# Preview the HTML output for a rune
refrakt inspect hint --type=warning

# Generate a docs site with AI
refrakt write -d content/ "Set up a docs site with guides and a blog"

# Generate API reference from source code
refrakt extract ./src -o ./content/api

# Audit CSS coverage across all runes
refrakt inspect --all --audit

# Generate structure contracts for CI
refrakt contracts -o contracts/structures.json
```

Run `refrakt --help` to see all available commands and options.
