{% spec id="SPEC-041" status="draft" version="0.1" tags="cli, runes, ai-workflow, onboarding" %}

# Agent Rune Reference

A CLI surface that lets a coding agent (Claude Code, Cursor, Copilot, etc.) discover the **input syntax** of any installed rune — tag name, attributes, content interpretation, and a minimal example — without invoking an LLM.

## Problem

A user scaffolds a new refrakt site (today via `npm create refrakt`, soon via `refrakt init landing` / `refrakt init docs`) and points a coding agent at it. The agent can read source files, but it has no way to know:

- What rune tags exist in the packages enabled in `refrakt.config.json`
- What attributes each rune accepts, with valid enum values
- What child Markdown elements get reinterpreted (a heading inside `{% nav %}` is a group title, inside `{% recipe %}` it's a step)
- A minimal correct example to crib from

The current options are inadequate:

| Tool                  | What it gives                                    | Why it doesn't fit            |
|-----------------------|--------------------------------------------------|-------------------------------|
| `refrakt write`       | Generated content via API call                   | Requires API key, not a reference |
| `refrakt inspect`     | HTML output of the identity transform            | Wrong direction — output, not input syntax |
| `refrakt contracts`   | BEM selectors and structure for CSS test gating  | For theme authors, not content authors |
| `site/content/docs/`  | Hand-written authoring docs                      | Only documents core runes, not the ~65 community rune tags |
| Reading rune source   | Schema definitions in TS                         | Slow, lossy, wastes context window |

The infrastructure to produce this reference already exists. `packages/ai/src/prompt.ts` defines `RuneInfo` and `describeRune()`, and `refrakt write` already builds a complete syntax reference from merged core + community packages. That work is currently locked inside the `write` command and only emitted as part of an LLM prompt.

-----

## Design Principles

**Schema-derived, never hand-written.** Every byte of output comes from rune schemas, `RUNE_EXAMPLES`, and the package's optional `prompt` extension. Adding a new rune to a package automatically appears in the reference. No separate doc to maintain.

**Two surfaces, one source.** A per-rune query (always fresh, on-demand) and a one-shot bulk dump (zero-friction, written at scaffold time). The bulk dump is a markdown wrapper over the same JSON the per-rune query emits. Regenerating the dump is one command.

**Agent-first, human-readable.** Default output is markdown that renders in any agent's tool-call result. `--format json` is available for programmatic consumers. No interactive prompts, no colour codes that confuse parsers.

**Respects installed packages.** The command reads `refrakt.config.json` and reports only the runes available in this project — same merge that the build pipeline uses (`mergePackages()` in `packages/runes/src/packages.ts`). An agent never sees runes the project can't actually use.

**Distinct from `write`.** This command does not call any model. It is pure inspection over local schemas. It can run in CI, in offline environments, in agents without API access.

-----

## Commands

The new commands live under a single namespace. Working name: `refrakt runes` (final name TBD — alternatives: `refrakt reference`, `refrakt syntax`).

### `refrakt runes <name>`

Print the syntax reference for a single rune.

```bash
refrakt runes hero
refrakt runes recipe --format json
```

**Arguments:**

| Argument | Required | Description                              |
|----------|----------|------------------------------------------|
| `name`   | Yes      | Rune name (matches tag name or alias)    |

**Options:**

| Option           | Default       | Description                                                              |
|------------------|---------------|--------------------------------------------------------------------------|
| `--format`       | `markdown`    | Output format: `markdown`, `json`                                        |
| `--config`       | (cwd)         | Path to project root containing `refrakt.config.json`                    |
| `--no-example`   | `false`       | Omit the example block (useful when the agent has its own example pool)  |

**Markdown output** (mirrors `describeRune` from `packages/ai/src/prompt.ts`):

```markdown
### hero

A landing page hero section with headline, supporting copy, and primary actions.

Aliases: landing-hero

Attributes:
  - align: "left" | "center" | "right" (optional)
  - eyebrow: string (optional)
  - background: string (optional)

Content interpretation:
  - heading → headline
  - paragraph → blurb
  - list → action buttons
  - image → background or media slot

Example:
{% hero align="center" %}
# Build sites with Markdown that means something
Refrakt turns Markdown into a structured document model.
- [Get started](/docs)
- [See examples](/showcase)
{% /hero %}
```

**JSON output:**

```json
{
  "name": "hero",
  "package": "@refrakt-md/marketing",
  "aliases": ["landing-hero"],
  "description": "A landing page hero section...",
  "attributes": {
    "align": { "type": "string", "matches": ["left", "center", "right"], "required": false },
    "eyebrow": { "type": "string", "required": false },
    "background": { "type": "string", "required": false }
  },
  "reinterprets": {
    "heading": "headline",
    "paragraph": "blurb",
    "list": "action buttons",
    "image": "background or media slot"
  },
  "example": "{% hero align=\"center\" %}..."
}
```

**Exit codes:**

| Code | Meaning                                     |
|------|---------------------------------------------|
| `0`  | Rune found, output emitted                  |
| `1`  | Rune name not recognised in current config  |
| `2`  | Invalid arguments or config not found       |

-----

### `refrakt runes list`

Enumerate all runes available in the current project.

```bash
refrakt runes list
refrakt runes list --package @refrakt-md/marketing
refrakt runes list --format json
```

**Options:**

| Option       | Default      | Description                                                  |
|--------------|--------------|--------------------------------------------------------------|
| `--package`  | (all)        | Filter to a single package                                   |
| `--category` | (all)        | Filter by rune category (e.g., `layout`, `media`, `forms`)   |
| `--format`   | `markdown`   | Output format: `markdown`, `json`                            |
| `--config`   | (cwd)        | Project root                                                 |

**Markdown output** groups runes by their source package:

```markdown
## @refrakt-md/runes (core)

- accordion — collapsible content sections
- breadcrumb — navigation trail
- callout — highlighted message block
- ... (~26 more)

## @refrakt-md/marketing

- hero — landing page hero
- cta — call to action block
- bento — feature grid
- ... (~6 more)

## @refrakt-md/learning

- howto — step-by-step instructions
- recipe — ingredient + method content
```

The list deliberately omits attributes and examples — for full detail the agent runs `refrakt runes <name>`.

-----

### `refrakt runes dump`

Write a complete syntax reference for **all** installed runes to a single file. Designed to be regenerated whenever packages change, then committed to the repo so any agent reading the file gets the full reference.

```bash
refrakt runes dump
refrakt runes dump --output AGENTS.md
refrakt runes dump --output .claude/runes.md --format markdown
```

**Options:**

| Option       | Default                | Description                                                   |
|--------------|------------------------|---------------------------------------------------------------|
| `--output`   | `AGENTS.md`            | Output file path                                              |
| `--format`   | `markdown`             | Output format: `markdown`, `json`                             |
| `--section`  | `## Available Runes`   | Heading to write under (markdown only); replaces existing block |
| `--config`   | (cwd)                  | Project root                                                  |
| `--check`    | `false`                | Exit 1 if the file is out of date (for CI gating)             |

**Behaviour:**

1. Loads `refrakt.config.json`, merges packages
2. Calls the same description function used by `refrakt runes <name>` for every rune
3. Renders a single markdown document with a table of contents and one `### <name>` block per rune
4. If `--output` is markdown and the file exists, replaces only the named `--section` block (preserves surrounding human-written content). For new files, writes a complete document with a "generated by refrakt runes dump — do not edit by hand" header
5. With `--check`, computes the same output and compares against the file — exit 1 on mismatch (CI guards against drift after package upgrades)

**Markdown structure:**

```markdown
<!-- Generated by `refrakt runes dump` — do not edit by hand. -->
<!-- Re-run when refrakt.config.json changes or packages upgrade. -->

# Available Runes

This site has the following runes available. Authors and AI agents can use any
of these tags inside `.md` content files.

## Table of Contents

- [Core](#core)
  - [accordion](#accordion)
  - [breadcrumb](#breadcrumb)
  - ...
- [Marketing](#marketing)
  - [hero](#hero)
  - [cta](#cta)
  - ...

## Core

### accordion
... (full rune detail, same as `refrakt runes accordion` markdown output)

### breadcrumb
...

## Marketing

### hero
...
```

**CI integration:**

```yaml
# .github/workflows/runes-reference.yml
name: Runes Reference Up-to-Date
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npx refrakt runes dump --check
```

-----

## Scaffold Integration

The `create-refrakt` template (and any future `refrakt init landing` / `refrakt init docs`) runs `refrakt runes dump --output AGENTS.md` as the final step. The scaffolded project starts with a complete, accurate rune reference checked into the repo.

**Why a checked-in file?** Three reasons:

1. **Zero tool calls for discovery.** The agent reads `AGENTS.md` once at session start (Claude Code does this automatically) and has every rune in context. No `refrakt runes hero` lookups required for common runes.
2. **Works offline.** Agents without shell access (some CI integrations, web-based agents) can still author content correctly.
3. **Diffs visible in PRs.** When a package upgrade adds new runes, the regenerated `AGENTS.md` shows the diff alongside the dependency bump.

The per-rune `refrakt runes <name>` command remains useful for cases the dump doesn't cover well: a rare rune the agent didn't memorise, a rune added after the last dump, or programmatic queries from tools that prefer JSON.

-----

## Implementation

### Reuse existing infrastructure

The work is largely a **promotion** of code that already exists:

| Source                                          | What it provides                              | Reuse for                          |
|-------------------------------------------------|-----------------------------------------------|------------------------------------|
| `packages/ai/src/prompt.ts` `RuneInfo`          | Type for serialisable rune metadata           | JSON output type                   |
| `packages/ai/src/prompt.ts` `describeRune()`    | Renders a `RuneInfo` to markdown              | Markdown output for `<name>` and `dump` |
| `packages/ai/src/prompt.ts` `EXCLUDED_RUNES`    | Filters child-only / internal runes           | Same filter applies                |
| `packages/runes` `RUNE_EXAMPLES`                | Per-rune minimal examples                     | Example block                      |
| `packages/runes/src/packages.ts` `mergePackages` | Loads + merges packages from config           | Config-aware rune discovery        |
| `packages/cli/src/lib/lazy-ai.ts`               | Already wires merged runes into `RuneInfo[]`  | Drop the AI dependency for this command |

The new code is mostly a CLI command shell that calls these utilities and formats output. No new schema introspection logic.

### Package placement

Add as commands to `packages/cli/src/commands/runes.ts`. Wire into the CLI entry point alongside `inspect`, `contracts`, `validate`, etc. The command does not require `@refrakt-md/ai` (split `describeRune`/`RuneInfo` out of `packages/ai/src/prompt.ts` into a shared util in `packages/runes/src/reference.ts` so both `write` and `runes` import from there).

### Suggested file layout

```
packages/cli/src/commands/runes.ts          ← command handlers (name, list, dump)
packages/runes/src/reference.ts             ← shared describeRune + RuneInfo extraction
packages/ai/src/prompt.ts                   ← refactored to import from runes/reference
```

-----

## Open Questions

1. **Command naming.** Is `refrakt runes` the right namespace? It collides conceptually with the `@refrakt-md/runes` package. Alternatives: `refrakt reference <name>`, `refrakt syntax <name>`, or a flag on `inspect` (`refrakt inspect hero --syntax`).
2. **`AGENTS.md` vs `CLAUDE.md`.** `AGENTS.md` is a tool-agnostic convention emerging across the agent ecosystem. `CLAUDE.md` is Claude Code specific. Should `dump --output` default to `AGENTS.md` and let the user redirect, or write both?
3. **Per-rune `prompt` extension scope.** The `RunePackage.prompt` field today appends LLM instructions. Should the reference output include these (useful authoring hints) or hide them (they read awkwardly out of LLM context)?
4. **Layout-aware filtering.** Some runes only make sense in certain layouts (e.g., `hero` in landing layouts, not in `docsLayout`). Should `list` filter by layout, or is package-level filtering enough?
5. **Editor integration overlap.** SPEC-012 (Rune Inspector) ships a VS Code tree view that already shows pipeline output. Could that extension expose the syntax reference too, replacing the need for a CLI dump? Probably not — agents need text output, not a VS Code panel.

-----

## Future work (out of scope for this spec)

- **Scaffold templates.** `refrakt init landing` / `refrakt init docs` (the conversation that motivated this spec). Once the reference command exists, scaffolding becomes a thin wrapper that writes a starter `refrakt.config.json` + content tree + `AGENTS.md`.
- **Live MCP server.** Expose the reference over MCP so an agent can call `runes.describe('hero')` directly without a shell. The CLI is the lower-friction starting point.
- **Cross-rune relationship docs.** "Which runes can be nested inside `{% bento %}`?" — derivable from `contextModifiers` in the engine config but not currently surfaced anywhere.

-----

## References

- {% ref "SPEC-022" /%} — Plan CLI (the pattern this command follows: namespaced subcommands, `--format json` for agents, `init`-style scaffolding)
- {% ref "SPEC-001" /%} — Community Runes (the package system this command queries)
- {% ref "SPEC-012" /%} — Rune Inspector (sibling tool: input syntax here, pipeline output there)
- {% ref "SPEC-039" /%} — Plan Package Onboarding (similar agent-onboarding workflow for plan content)

{% /spec %}
