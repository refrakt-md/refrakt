---
title: refrakt write
description: Generate Markdown content files using AI providers
---

# refrakt write

Generates Markdown content files using AI. Supports Anthropic, Google Gemini, and Ollama as providers. The generated content uses refrakt.md runes — the AI is given the full rune reference as context.

## Basic usage

```shell
refrakt write "Create a FAQ page about deployment"
```

Without an output flag, content is streamed to stdout.

## Single file output

```shell
refrakt write -o docs/faq.md "Create a FAQ page about deployment"
```

Writes the generated content to the specified file.

## Multi-file output

```shell
refrakt write -d content/ "Set up a docs site with index, guides, and blog"
```

When using `-d`, the AI generates multiple files with `--- FILE: path ---` markers. Each file is written to the specified directory. If the AI doesn't produce file markers, the output falls back to a single `index.md`.

## Choosing a provider

```shell
refrakt write -p anthropic "Write a getting-started guide"
refrakt write -p gemini "Write a changelog page"
refrakt write -p ollama -m llama3.2 "Write a FAQ page"
```

### Provider auto-detection

If you don't specify a provider, the CLI detects one from environment variables:

| Priority | Env Variable | Provider |
|----------|-------------|----------|
| 1 | `ANTHROPIC_API_KEY` | Anthropic |
| 2 | `GOOGLE_API_KEY` | Gemini Flash |
| 3 | `OLLAMA_HOST` | Ollama |
| 4 | *(none)* | Ollama at `localhost:11434` |

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--output <path>` | `-o` | Write output to a single file |
| `--output-dir <dir>` | `-d` | Generate multiple files into a directory |
| `--provider <name>` | `-p` | Provider: `anthropic`, `gemini`, `ollama` |
| `--model <name>` | `-m` | Model name (default: per-provider) |

{% hint type="note" %}
`--output` and `--output-dir` are mutually exclusive. Use `-o` for a single page, `-d` when you want the AI to generate a multi-page structure.
{% /hint %}
