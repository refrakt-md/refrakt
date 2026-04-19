---
title: refrakt reference
description: Emit rune syntax reference for human contributors and AI coding agents
---

# refrakt reference

Emits a syntax reference for every rune available in the current project — attributes, content model, and example usage — derived from the same schemas the transform engine uses. The reference is intended for both human contributors learning the runes and AI coding agents authoring `.md` content.

The command reads `refrakt.config.json` to determine which community packages are installed, so output always matches what the site actually supports.

## Subcommands

| Subcommand | Purpose |
|------------|---------|
| `refrakt reference <name>` | Print the syntax reference for a single rune |
| `refrakt reference list` | Enumerate available runes, grouped by source package |
| `refrakt reference dump` | Write the full reference to a file (default: `AGENTS.md`) |

## refrakt reference &lt;name&gt;

Print the reference for one rune to stdout.

```shell
refrakt reference hero
refrakt reference recipe --format json
refrakt reference hint --no-example
```

### Options

| Flag | Description |
|------|-------------|
| `--format <fmt>` | Output format: `markdown` (default) or `json` |
| `--no-example` | Omit the example block |
| `--config <dir>` | Project root containing `refrakt.config.json` (default: current directory) |

Exits with status `1` when the rune name is unknown. Use `refrakt reference list` to see what's available.

## refrakt reference list

List every rune the project has access to, grouped by its source package (core or a community package).

```shell
refrakt reference list
refrakt reference list --package @refrakt-md/marketing
refrakt reference list --format json
```

### Options

| Flag | Description |
|------|-------------|
| `--package <name>` | Filter runes by source package |
| `--format <fmt>` | Output format: `markdown` (default) or `json` |
| `--config <dir>` | Project root containing `refrakt.config.json` |

## refrakt reference dump

Write the full reference — every rune, grouped by package, with universal attributes and attribute presets hoisted into top-level sections — to a single file. `create-refrakt` runs this automatically when scaffolding a new site, producing the initial `AGENTS.md`.

```shell
refrakt reference dump
refrakt reference dump --output docs/RUNES.md
refrakt reference dump --format json --output reference.json
```

### Options

| Flag | Description |
|------|-------------|
| `--output`, `-o <path>` | Output file (default: `AGENTS.md`) |
| `--format <fmt>` | Output format: `markdown` (default) or `json` |
| `--section <heading>` | Heading to replace in an existing markdown file (default: `# Available Runes`) |
| `--check` | Exit with status `1` if the file is out of date — see [CI integration](#ci-integration) |
| `--config <dir>` | Project root containing `refrakt.config.json` |

### In-place updates

When dumping markdown into an existing file, only the section under the `--section` heading (default `# Available Runes`) is replaced — content above and below is preserved. This means you can keep project-specific instructions at the top of `AGENTS.md` without them being overwritten on every regeneration.

### CI integration

Add `refrakt reference dump --check` to CI to catch drift when `refrakt.config.json` changes (added or removed `packages`) or a `@refrakt-md/*` package upgrade introduces new runes:

```yaml
- name: Check AGENTS.md is up to date
  run: npx refrakt reference dump --check
```

The job fails if the generated output differs from the committed file, prompting a contributor to run `refrakt reference dump` and commit the refresh.

## When to regenerate

Run `refrakt reference dump` after any of:

- Editing `refrakt.config.json` — adding or removing entries in `packages[]`
- Upgrading any `@refrakt-md/*` package version
- Adding or editing a custom rune whose schema lives in your project

The default `AGENTS.md` follows the [AGENTS.md convention](https://agent-rules.org) and is read by Claude Code, Cursor, Aider, Codex, and other AI coding tools that respect it.
