---
title: "@refrakt-md/docs"
description: Technical documentation runes for API references, code symbols, and changelogs
---

# @refrakt-md/docs

Technical documentation runes for API references, code symbols, and changelogs. Document REST APIs, TypeScript interfaces, functions, and version history from structured Markdown.

## Installation

```bash
npm install @refrakt-md/docs
```

```json
{
  "packages": ["@refrakt-md/docs"]
}
```

## Runes

| Rune | Description |
|------|-------------|
| [api](/runes/docs/api) | API endpoint documentation with method, path, and parameters |
| [symbol](/runes/docs/symbol) | Code construct documentation for functions, classes, interfaces, enums, and type aliases |
| [changelog](/runes/docs/changelog) | Version history with release notes |

## CLI

The package extends the `refrakt` CLI with the [`docs extract`](/runes/docs/cli) command for generating API reference documentation from TypeScript or Python source code.

## When to use

Use this package when building technical documentation sites, API references, or SDK docs. The `api` rune handles REST endpoint documentation with method badges and parameter tables. The `symbol` rune covers code constructs like functions, classes, and interfaces. The `changelog` rune structures version history with release dates and categorized changes.
