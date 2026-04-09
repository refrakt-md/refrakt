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
| [extract](/docs/cli/extract) | Generate API reference docs from TypeScript or Python source (via `@refrakt-md/docs` plugin) |
| [contracts](/docs/cli/theme-tools#refrakt-contracts) | Generate and validate structure contracts |
| [scaffold-css](/docs/cli/theme-tools#refrakt-scaffold-css) | Generate CSS stub files for a new theme |
| [validate](/docs/cli/theme-tools#refrakt-validate) | Validate theme config and manifest |
| [theme](/docs/cli/theme-tools#refrakt-theme) | Install themes and show theme info |
| edit | Launch the browser-based content editor |
| package validate | Validate a rune package before publishing |

## Quick examples

```shell
# Preview the HTML output for a rune
refrakt inspect hint --type=warning

# Generate a docs site with AI
refrakt write -d content/ "Set up a docs site with guides and a blog"

# Generate API reference from source code
refrakt docs extract ./src -o ./content/api

# Audit CSS coverage across all runes
refrakt inspect --all --audit

# Audit metadata dimensions across all runes
refrakt inspect --all --audit-dimensions

# Generate structure contracts for CI
refrakt contracts -o contracts/structures.json --config .

# Launch the content editor
refrakt edit

# Validate a rune package before publishing
refrakt package validate ./my-package
```

## Package commands

Community packages can extend the CLI with additional subcommands. These are available when the package is installed.

| Package | Command | Purpose |
|---------|---------|---------|
| [`@refrakt-md/plan`](/runes/plan) | [`refrakt plan`](/runes/plan/cli) | Project planning — status, next item, update, create, validate, serve, build |

Run `refrakt --help` to see all available commands and options.
