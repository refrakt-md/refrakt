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

**Markdown output** (extends `describeRune` from `packages/ai/src/prompt.ts` with content-model details — see [Content-Model-Derived Descriptions](#content-model-derived-descriptions) below):

```markdown
### hero

A landing page hero section with headline, supporting copy, and primary actions.

Aliases: landing-hero

Attributes:
  - align: "left" | "center" | "right" (optional) — Horizontal alignment of headline and body text

Inherits split layout attributes (layout, ratio, valign, gap, collapse).
Inherits universal attributes (tint, tint-mode, bg, width, spacing, inset).

Content structure (delimited by `---`):
  Zone 1 — content (sequence, required):
    - eyebrow — paragraph (optional)
    - headline — heading (required)
    - blurb — paragraph (optional)
    - actions — list or fenced code blocks (optional, repeats)
  Zone 2 — media (sequence, optional):
    - media — any node (optional, repeats)

Example:
{% hero align="center" layout="split" %}
Coming soon
# Build sites with Markdown that means something
Refrakt turns Markdown into a structured document model.
- [Get started](/docs)
- [See examples](/showcase)
---
![Hero illustration](/img/hero.png)
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
    "own": {
      "align": { "type": "string", "matches": ["left", "center", "right"], "required": false, "description": "Horizontal alignment of headline and body text" }
    },
    "base": {
      "name": "splitLayoutAttributes",
      "attributes": {
        "layout": { "type": "string", "matches": ["stacked", "split", "split-reverse"], "required": false },
        "ratio": { "type": "string", "required": false },
        "valign": { "type": "string", "matches": ["top", "center", "bottom"], "required": false },
        "gap": { "type": "string", "matches": ["none", "tight", "default", "loose"], "required": false },
        "collapse": { "type": "string", "matches": ["sm", "md", "lg", "never"], "required": false }
      }
    },
    "universal": true
  },
  "contentModel": {
    "pattern": "delimited",
    "delimiter": "hr",
    "zones": [
      {
        "name": "content",
        "pattern": "sequence",
        "required": true,
        "fields": [
          { "name": "eyebrow", "match": "paragraph", "optional": true },
          { "name": "headline", "match": "heading", "optional": false },
          { "name": "blurb", "match": "paragraph", "optional": true },
          { "name": "actions", "match": "list|fence", "optional": true, "greedy": true }
        ]
      },
      {
        "name": "media",
        "pattern": "sequence",
        "required": false,
        "fields": [
          { "name": "media", "match": "any", "optional": true, "greedy": true }
        ]
      }
    ]
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

## Attribute Tiers

Every rune built via `createContentModelSchema` ends up with attributes from three distinct sources, merged in `packages/runes/src/lib/index.ts:161-176`:

| Tier         | Source                                                   | Example (hero)                                        | Where it's declared                              |
|--------------|----------------------------------------------------------|-------------------------------------------------------|--------------------------------------------------|
| **Own**      | The rune's own `attributes:` block                       | `align`                                               | `runes/marketing/src/tags/hero.ts:9-11`          |
| **Base**     | A shared preset passed as `base:` — another rune can pick the same preset to inherit the same attributes | `layout`, `ratio`, `valign`, `gap`, `collapse` (via `SplitLayoutModel`) | `packages/runes/src/tags/common.ts:10-16`        |
| **Universal**| `universalAttributes`, auto-merged into every schema     | `tint`, `tint-mode`, `bg`, `width`, `spacing`, `inset`| `packages/runes/src/lib/index.ts:37-44`          |

Today's `describeRune()` in `packages/ai/src/prompt.ts:92-101` prints all attributes as a single flat list. For a rune like `hero` that's **11 attributes inline** — which buries the one attribute (`align`) the author likely wants to set.

### How the reference surfaces tiers

**Per-rune output** (both `refrakt runes <name>` and `refrakt runes dump`) lists **own** attributes inline with descriptions. Base and universal tiers are summarised as one-line references:

```
Attributes:
  - align: "left" | "center" | "right" (optional) — Horizontal alignment...

Inherits split layout attributes (layout, ratio, valign, gap, collapse).
Inherits universal attributes (tint, tint-mode, bg, width, spacing, inset).
```

**Dump output** additionally emits one section at the top of the generated `AGENTS.md` that documents every universal attribute and every known base preset in full. Per-rune sections then reference that section by name rather than repeating the same attribute definitions 85 times.

```markdown
## Universal Attributes

These are available on every rune:

- tint — color tint preset applied to this block
- bg — background preset applied to this block
- width — "compact" | "narrow" | "content" | "wide" | "full"
- ...

## Attribute Presets

Runes can opt into shared attribute sets via `base:`. This section lists
each preset once; per-rune documentation below says which presets it inherits.

### splitLayoutAttributes
Used by: hero, feature, cta, bento, ...

- layout — "stacked" | "split" | "split-reverse"
- ratio — Column width ratio in split layout (e.g. "2 1")
- valign — "top" | "center" | "bottom"
- gap — "none" | "tight" | "default" | "loose"
- collapse — "sm" | "md" | "lg" | "never"
```

This is a meaningful size reduction: ~6 universal attributes × 85 runes = 510 repeated attribute lines eliminated from the dump.

### Detecting the base preset

`createContentModelSchema` takes `base: Record<string, SchemaAttribute>` — a plain attribute record with no name. After merging, there's no way to recover which preset was used. Two paths:

1. **Reference identity.** Export presets as singletons (`splitLayoutAttributes`, `mediaBlockAttributes`, etc.) and keep a `Map<object, string>` registry. The reference tool checks whether the rune's attribute object shares keys with a registered preset.
2. **Subtraction only.** Don't name the base tier at all. Remove universal attributes from the attribute list; show the remainder inline as "Attributes". Authors lose the "inherits split layout" affordance but the implementation is trivial.

Recommend (1). It's ~30 lines of bookkeeping and gives agents a meaningful shorthand. Details left for the implementation work item.

-----

## Content-Model-Derived Descriptions

Today's `RuneInfo.reinterprets` is a hand-written, flat map: `{ heading: 'headline', paragraph: 'blurb' }`. It captures *semantic role* but not *structure* — an agent reading it cannot tell:

- Whether the heading is required or optional
- Whether paragraphs may repeat
- That a `hr` separates the content zone from the media zone (delimited pattern)
- That children are split by H2 headings into named sections (sections pattern)
- That fields are matched in **order** (sequence pattern)
- That a heading like `"9:00 AM — Location"` is parsed into time + location fields (`headingExtract`)

The richer source already exists. ~80 of ~85 runes use `createContentModelSchema({ contentModel, transform })` (`packages/runes/src/lib/index.ts:123-150`), and the model is registered in a `WeakMap` (`schemaContentModels`) for introspection. The four patterns are defined in `packages/types/src/content-model.ts`:

| Pattern    | Captures                                                              | Example rune                              |
|------------|-----------------------------------------------------------------------|-------------------------------------------|
| `sequence` | Children matched in order by node type                                | `palette` (`runes/design/src/tags/palette.ts:81`) |
| `sections` | Children split by headings into named sections, optional `headingExtract` | `character` (`runes/storytelling/src/tags/character.ts`), `changelog` (`runes/docs/src/tags/changelog.ts`) |
| `delimited`| Children split by delimiter (typically `hr`) into named zones, supports `dynamicZones` | `hero` (`runes/marketing/src/tags/hero.ts`), `recipe` (`runes/learning/src/tags/recipe.ts`), `itinerary` (`runes/places/src/tags/itinerary.ts`) |
| `custom`   | Escape hatch with `processChildren` + a hand-written description string | rare, <5%                                 |

Two existing serializers already strip the model's function-valued fields (`processChildren`, `headingExtract`, etc.) for JSON transport over wire/IPC:

- `serializeContentModel()` / `stripContentModel()` — `packages/editor/src/server.ts:261-307` (used by the editor UI)
- `serializeContentModelForEditor()` — `packages/cli/src/commands/edit.ts:181-216` (used when loading community packages for the editor)

What's missing is a **markdown renderer** that walks the serialised model and produces prose like the `hero` example above. That renderer is the new code this spec adds.

### Renderer responsibilities

For each pattern, the renderer emits structured prose:

- **sequence:** numbered list, "matched in order"
- **sections:** named sections list with required/optional + nested field tables; surfaces `headingExtract` shape ("heading text is parsed as `<time> — <location>`")
- **delimited:** zones list with the delimiter shown, fields nested under each zone
- **custom:** falls back to the description string declared in the model

Where the rune has both a model **and** a hand-written `reinterprets` map, the model wins for structure and `reinterprets` is dropped from output (it would be redundant). For the handful of legacy Model-class runes without a content model, fall back to today's flat `reinterprets` rendering.

### Migration

`reinterprets` stays in `RuneDescriptor` for backward compatibility but becomes optional. The reference renderer prefers the content model when present. New runes should not need to populate `reinterprets` at all once the renderer ships.

-----

## Implementation

### Reuse existing infrastructure

The work is largely a **promotion** of code that already exists:

| Source                                                                | What it provides                                                  | Reuse for                                       |
|-----------------------------------------------------------------------|-------------------------------------------------------------------|-------------------------------------------------|
| `packages/ai/src/prompt.ts` `RuneInfo`                                | Type for serialisable rune metadata                               | JSON output type                                |
| `packages/ai/src/prompt.ts` `describeRune()`                          | Renders a `RuneInfo` to markdown                                  | Starting point for markdown output              |
| `packages/ai/src/prompt.ts` `EXCLUDED_RUNES`                          | Filters child-only / internal runes                               | Same filter applies                             |
| `packages/runes/src/lib/index.ts` `schemaContentModels` WeakMap       | Lookup of content model by registered schema                      | Source of model data for renderer               |
| `packages/types/src/content-model.ts`                                 | Pattern type definitions (`SequenceModel`, `SectionsModel`, etc.) | Renderer dispatch                               |
| `packages/editor/src/server.ts` `serializeContentModel()`             | Strips function-valued fields → JSON-safe model                   | JSON output + input to markdown renderer        |
| `packages/runes` `RUNE_EXAMPLES`                                      | Per-rune minimal examples                                         | Example block                                   |
| `packages/runes/src/packages.ts` `mergePackages`                      | Loads + merges packages from config                               | Config-aware rune discovery                     |
| `packages/cli/src/lib/lazy-ai.ts`                                     | Already wires merged runes into `RuneInfo[]`                      | Drop the AI dependency for this command         |

The genuinely new code is the **content-model renderer** that walks a serialised model and emits markdown / structured JSON. Everything else is plumbing.

### Package placement

Add as commands to `packages/cli/src/commands/runes.ts`. Wire into the CLI entry point alongside `inspect`, `contracts`, `validate`, etc. The command does not require `@refrakt-md/ai` — split `describeRune`/`RuneInfo` out of `packages/ai/src/prompt.ts` into a shared util in `packages/runes/src/reference.ts` so both `write` and `runes` import from there. The shared util also owns the new content-model renderer.

Promote `serializeContentModel()` from `packages/editor/src/server.ts` to `packages/runes/src/reference.ts` and have the editor re-import it (avoids duplication with `serializeContentModelForEditor()` in `packages/cli/src/commands/edit.ts` — that function becomes a thin wrapper too).

### Suggested file layout

```
packages/cli/src/commands/runes.ts          ← command handlers (name, list, dump)
packages/runes/src/reference.ts             ← shared describeRune + RuneInfo extraction
                                              + serializeContentModel (promoted)
                                              + renderContentModel (new)
packages/ai/src/prompt.ts                   ← refactored to import from runes/reference
packages/editor/src/server.ts               ← imports serializeContentModel from runes/reference
packages/cli/src/commands/edit.ts           ← imports from runes/reference
```

-----

## Open Questions

1. **Command naming.** Is `refrakt runes` the right namespace? It collides conceptually with the `@refrakt-md/runes` package. Alternatives: `refrakt reference <name>`, `refrakt syntax <name>`, or a flag on `inspect` (`refrakt inspect hero --syntax`).
2. **`AGENTS.md` vs `CLAUDE.md`.** `AGENTS.md` is a tool-agnostic convention emerging across the agent ecosystem. `CLAUDE.md` is Claude Code specific. Should `dump --output` default to `AGENTS.md` and let the user redirect, or write both?
3. **Per-rune `prompt` extension scope.** The `RunePackage.prompt` field today appends LLM instructions. Should the reference output include these (useful authoring hints) or hide them (they read awkwardly out of LLM context)?
4. **Layout-aware filtering.** Some runes only make sense in certain layouts (e.g., `hero` in landing layouts, not in `docsLayout`). Should `list` filter by layout, or is package-level filtering enough?
5. **Editor integration overlap.** SPEC-012 (Rune Inspector) ships a VS Code tree view that already shows pipeline output. Could that extension expose the syntax reference too, replacing the need for a CLI dump? Probably not — agents need text output, not a VS Code panel.
6. **`custom` content model pattern.** ~5% of runes use `custom` with a hand-written description string. The renderer uses that string verbatim, which puts a quality burden on rune authors. Should we lint that the description is non-trivial, or accept that custom is a rare escape hatch?
7. **`reinterprets` deprecation timing.** Once the model-derived renderer ships, `reinterprets` becomes redundant for ~95% of runes. Do we deprecate the field immediately (and migrate the legacy holdouts to content models), or leave it as a permanent fallback?
8. **Base preset naming.** Path (1) above needs presets to be named. `splitLayoutAttributes` is already exported by name — but if we want to surface the preset to agents, it needs a human-meaningful short name ("split layout") rather than a variable name. Is this metadata a new `describe` field on the preset, a separate registry, or inferred from the identifier?

-----

## Future work (out of scope for this spec)

- **Scaffold templates.** `refrakt init landing` / `refrakt init docs` (the conversation that motivated this spec). Once the reference command exists, scaffolding becomes a thin wrapper that writes a starter `refrakt.config.json` + content tree + `AGENTS.md`.
- **Live MCP server.** Expose the reference over MCP so an agent can call `runes.describe('hero')` directly without a shell. The CLI is the lower-friction starting point.
- **Cross-rune relationship docs.** "Which runes can be nested inside `{% bento %}`?" — derivable from `contextModifiers` in the engine config but not currently surfaced anywhere.

-----

## References

- {% ref "SPEC-022" /%} — Plan CLI (the pattern this command follows: namespaced subcommands, `--format json` for agents, `init`-style scaffolding)
- {% ref "SPEC-001" /%} — Community Runes (the package system this command queries)
- {% ref "SPEC-003" /%} — Declarative Content Model (the system whose richness this spec surfaces to agents)
- {% ref "SPEC-012" /%} — Rune Inspector (sibling tool: input syntax here, pipeline output there)
- {% ref "SPEC-039" /%} — Plan Package Onboarding (similar agent-onboarding workflow for plan content)

{% /spec %}
