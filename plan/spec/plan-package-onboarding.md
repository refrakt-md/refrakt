{% spec id="SPEC-039" status="draft" version="1.0" tags="plan, cli, onboarding, dx" %}

# Plan Package Onboarding & Conventions Review

Review and improve the `@refrakt-md/plan` package's conventions, folder structure, and onboarding experience. Three concerns drive this spec: the package is currently coupled to Claude Code as an AI tool, the folder naming convention uses singular nouns where plural would be more natural, and there is no path for users who already have planning documents to adopt the system.

## 1. Tool-Agnostic Onboarding

### Problem

`refrakt plan init` currently writes workflow instructions directly to `CLAUDE.md`. This assumes the user is working with Claude Code. Users of Cursor, GitHub Copilot, Windsurf, Cline, Aider, or other AI coding tools each have their own instruction file conventions, and some users may not use AI tooling at all.

The CLI commands themselves (`plan next`, `plan update`, `plan status`, etc.) are already tool-agnostic. The coupling is only in the init step and the documentation it generates.

### Known instruction file conventions

| Tool | File |
|------|------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` or `.cursor/rules/*.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |
| Cline | `.clinerules` |
| Aider | `.aider.conf.yml` or `CONVENTIONS.md` |
| Generic / none | `AGENTS.md` (emerging convention) |

### Proposed approach

1. Generate a standalone `plan/INSTRUCTIONS.md` (or similar) containing tool-agnostic workflow guidance. This file is the canonical reference — it describes the CLI commands, conventions, ID formats, status workflows, and content structure without assuming any particular AI tool.

2. Add an `--agent <tool>` flag to `plan init` that controls where a short include/pointer is appended:
   - `--agent claude` appends to `CLAUDE.md` (current behavior)
   - `--agent cursor` appends to `.cursorrules`
   - `--agent copilot` appends to `.github/copilot-instructions.md`
   - `--agent none` skips the append entirely
   - Default (no flag): auto-detect by checking which instruction files already exist in the project root. If multiple exist, append to all. If none exist, fall back to `CLAUDE.md` for backwards compatibility (or potentially `AGENTS.md`).

3. The appended content should be minimal — a short summary of the plan system with a pointer to the full instructions file, not the full workflow documentation.

4. Rename `plan/CLAUDE.md` to `plan/INSTRUCTIONS.md` (or `plan/AGENTS.md`). The content is already largely tool-agnostic — it just needs the Claude-specific framing removed.

### Open questions

- Should the default with no flag create `AGENTS.md` instead of `CLAUDE.md`? The `AGENTS.md` convention is gaining traction as a tool-neutral standard.
- Should the `--agent` flag accept multiple values (e.g., `--agent claude,cursor`) for projects that use multiple tools?
- How opinionated should the appended instructions be about workflow? Some tools work better with more prescriptive instructions (e.g., "always run `plan next` before starting work").

## 2. Plural Folder Names

### Problem

The current directory structure uses singular nouns:

```
plan/
  spec/
  work/
  decision/
  milestone/
```

Plural is the more common convention for directories containing collections (`specs/`, `decisions/`, `milestones/`). The singular form reads oddly, especially when browsing the filesystem or writing documentation ("open the `spec` folder" vs "open the `specs` folder").

### Proposed change

```
plan/
  specs/       (was spec/)
  work/        (unchanged — "works" is awkward, "work" functions as a collective noun)
  decisions/   (was decision/)
  milestones/  (was milestone/)
```

`work/` stays singular because it serves as a collective noun and "works" has a different connotation. Bugs continue to live alongside work items in this directory.

### Scope of change

Folder names are hardcoded in multiple files:
- `init.ts` — directory creation (`const dirs = [...]`)
- `create.ts` — `TYPE_DIRS` mapping
- `templates.ts` — `STATUS_PAGES[].typeDir` and `TYPE_TITLES` entries
- `scanner.ts` — not directly (it scans recursively), but tests/docs reference paths
- `cli-plugin.ts` — not directly, but error messages may reference paths
- `plan/CLAUDE.md` (or its successor `INSTRUCTIONS.md`) — directory layout docs
- Root `CLAUDE.md` — directory layout documentation

Since we are currently the only users of this system, we can handle our own migration manually (rename directories, update references). No automated migration command is needed for the folder rename itself.

### Open questions

- Should we consider renaming `work/` to something else entirely? Candidates: `tasks/`, `items/`, or keep `work/`.

## 3. Importing Existing Planning Documents

### Problem

Users adopting `@refrakt-md/plan` may already have substantial planning documentation — specs, ADRs, RFCs, user stories, or just plain markdown files describing what they want to build. Currently there is no way to bring these into the plan system without manually wrapping each file in rune tags.

### Proposed approach

Add a `refrakt plan import` command that can ingest existing markdown files and wrap them in plan rune tags.

### Basic operation

```bash
# Import a single file as a spec
refrakt plan import spec path/to/existing-doc.md

# Import a directory of files
refrakt plan import spec path/to/rfcs/

# Dry-run to preview what would happen
refrakt plan import spec path/to/docs/ --dry-run
```

The command would:
1. Read each `.md` file
2. Auto-assign the next available ID
3. Wrap the content in the appropriate rune tag (e.g., `{% spec id="SPEC-040" status="draft" %}`)
4. Infer a title from the first H1 heading
5. Copy the file into the appropriate plan subdirectory with a slug-based filename
6. Report what was created

### Frontmatter mapping

Many existing docs use YAML frontmatter. The import command should recognize common fields and map them to rune attributes:

```yaml
---
title: My Feature Spec
status: accepted
tags: [auth, api]
date: 2025-01-15
author: someone
---
```

Maps to: `{% spec id="SPEC-040" status="accepted" tags="auth, api" %}`

Unknown frontmatter fields would be preserved as-is in the document body or dropped with a warning.

### Pattern detection (future enhancement)

A more advanced version could detect common document patterns:
- **ADR format** (Context / Decision / Consequences headings) → import as `decision`
- **RFC format** (Summary / Motivation / Detailed Design) → import as `spec`
- **User story format** ("As a... I want... So that...") → import as `work`
- **Bug report format** (Steps to Reproduce / Expected / Actual) → import as `bug`

This detection would be opt-in (`--detect-type`) and should err on the side of asking the user rather than guessing wrong.

### Scope

The initial version should be simple — take a type and a path, wrap content in rune tags, auto-assign IDs, and copy to the right directory. Pattern detection and format conversion can come later.

### Open questions

- Should import modify files in place or always copy to the plan directory? Copying is safer but creates duplication.
- Should it strip YAML frontmatter after extracting attributes, or preserve it as a comment?
- Should there be a `--link` mode that creates plan items that reference external files rather than copying content?

{% /spec %}
