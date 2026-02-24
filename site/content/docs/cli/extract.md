---
title: refrakt extract
description: Generate API reference documentation from TypeScript or Python source code
---

# refrakt extract

Extracts exported symbols from TypeScript or Python source code and generates Markdown documentation using the `{% symbol %}` rune. Each exported function, class, interface, or type gets its own `.md` file, plus a `_layout.md` for navigation.

## Basic usage

```shell
refrakt extract ./src -o ./content/api
```

This scans `./src` for source files, extracts all exported symbols, and writes one Markdown file per symbol to `./content/api/`.

## Language detection

The language is auto-detected from file extensions and the presence of `tsconfig.json`. You can override it explicitly:

{% tabs %}

{% tab name="TypeScript" %}

```shell
refrakt extract ./src -o ./content/api --lang typescript
```

{% /tab %}

{% tab name="Python" %}

```shell
refrakt extract ./lib -o ./content/api --lang python
```

{% /tab %}

{% /tabs %}

## Source links

Add clickable links back to source code in the generated docs:

```shell
refrakt extract ./src -o ./content/api --source-url https://github.com/my/repo/blob/main/src
```

## Custom section title

By default the generated `_layout.md` uses "API Reference" as the navigation title. Override it with:

```shell
refrakt extract ./src -o ./content/api --title "SDK Reference"
```

## CI validation

Use `--validate` to check that generated files are up to date without overwriting them:

```shell
refrakt extract ./src -o ./content/api --validate
```

This exits with code 1 if any files are missing or stale, making it suitable for CI pipelines that enforce documentation freshness.

## What gets generated

For a project with exported symbols `createClient`, `Config`, and `Response`:

```
content/api/
├── _layout.md          # Navigation with section title
├── create-client.md    # createClient docs
├── config.md           # Config docs
└── response.md         # Response docs
```

If two symbols produce the same slug (e.g., a `Config` type and a `Config` interface), the kind is appended: `config-type.md`, `config-interface.md`.

Files skipped during extraction: `.d.ts`, `.test.ts`, `.spec.ts`.

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--output <path>` | `-o` | Output directory for generated files (required unless `--validate`) |
| `--lang <language>` | | Language: `typescript`, `python` (default: auto-detect) |
| `--validate` | | Check if generated files are up to date (exit 1 if stale) |
| `--source-url <url>` | | Base URL for source code links |
| `--title <name>` | | Navigation section title (default: "API Reference") |
