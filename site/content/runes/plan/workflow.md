---
title: Plan Workflows
description: Using @refrakt-md/plan with AI assistants, CI pipelines, and team workflows
---

# Plan Workflows

`@refrakt-md/plan` is designed for spec-driven development — write specifications first, break them into trackable work items, and let the plan guide implementation. This workflow is particularly effective with AI coding assistants.

## AI-assisted development

### Setting up AI tool integration

`refrakt plan init` wires a host project for AI-assisted plan management in one step: it scaffolds `plan/` content, writes the canonical `AGENTS.md` with the full workflow guide, and — when Claude is targeted — installs a `SessionStart` hook that runs `install` automatically if the CLI isn't resolvable yet. See the [CLI reference](/runes/plan/cli#refrakt-plan-init) for the complete list of side effects and opt-out flags.

`AGENTS.md` is the canonical instruction file (following the [AGENTS.md convention](https://agent-rules.org), read by Claude Code, Cursor, Aider, Codex, and other tools). Tool-specific files receive a short pointer back to it:

```bash
refrakt plan init                    # auto-detect existing instruction files
refrakt plan init --agent claude     # CLAUDE.md → AGENTS.md pointer
refrakt plan init --agent cursor     # .cursorrules → AGENTS.md pointer
refrakt plan init --agent copilot    # .github/copilot-instructions.md pointer
refrakt plan init --agent windsurf   # .windsurfrules pointer
refrakt plan init --agent cline      # .clinerules pointer
refrakt plan init --agent none       # skip tool-specific pointer
```

When `--agent` is omitted, `plan init` auto-detects which instruction files already exist and writes a pointer into each. If none are found, it falls back to creating a `CLAUDE.md`.

### How it works with AI assistants

1. **Bootstrap** — On first run, the Claude `SessionStart` hook (or the `./plan.sh` wrapper on other tools) installs dependencies so `refrakt plan` resolves without manual setup
2. **Discovery** — The assistant runs `refrakt plan next` to find the highest-priority actionable item
3. **Context** — It reads the work item's file, follows references to specs in `plan/specs/`, and checks related decisions in `plan/decisions/`
4. **Implementation** — It implements the changes, checking off acceptance criteria as each one is met
5. **Completion** — When all criteria pass, it marks the item done and can move to the next

The `--format json` flag on all commands makes it easy for AI tools to parse output programmatically.

### Customizing agent instructions

`AGENTS.md` is the primary surface for agent guidance. `plan init` writes the full plan workflow section into it — ID conventions, valid status flows, CLI command reference — and leaves room above for project-specific instructions (architecture notes, coding conventions, release procedures). Re-running `plan init` never overwrites existing user content; it only appends the plan section if it isn't already present.

A full tool-agnostic copy of the workflow guide is also written to `plan/INSTRUCTIONS.md` alongside the content, for contributors who prefer to read it next to the plan files.

## Team workflows

### Spec-first development

1. Write a spec in `plan/specs/` describing what to build
2. Get the spec reviewed and accepted (`refrakt plan update SPEC-001 --status accepted`)
3. Break the spec into work items in `plan/work/`, each referencing the spec
4. Assign milestones and priorities
5. Team members pick items with `refrakt plan next --assignee me`

### Code review integration

Run `refrakt plan validate` in CI to catch:
- Broken references between entities
- Duplicate IDs
- Invalid status or priority values
- Circular dependencies
- Orphaned work items without milestones

```bash
# In your CI pipeline
refrakt plan validate --strict
```

With `--strict`, warnings (like missing milestones) become errors that fail the build.

### Milestone tracking

Group work items under milestones to track release progress:

```bash
# See overall status
refrakt plan status --milestone v1.0

# Find remaining work for a milestone
refrakt plan next --milestone v1.0 --count 10
```

The `plan-progress` and `plan-activity` runes render these views in your documentation site.

## Plan dashboard

For a visual overview, use the built-in dashboard:

```bash
# Development mode with hot reload
refrakt plan serve --open

# Static build for hosting
refrakt plan build --out dist/plan
```

The dashboard renders all your plan entities as browsable pages with status indicators, cross-references, and progress tracking.
