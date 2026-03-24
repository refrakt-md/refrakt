---
title: Plan Workflows
description: Using @refrakt-md/plan with AI assistants, CI pipelines, and team workflows
---

# Plan Workflows

`@refrakt-md/plan` is designed for spec-driven development — write specifications first, break them into trackable work items, and let the plan guide implementation. This workflow is particularly effective with AI coding assistants like Claude Code.

## AI-assisted development

### Setting up Claude Code integration

When you run `refrakt plan init`, it appends workflow instructions to your project's `CLAUDE.md`. This teaches Claude Code how to use the plan CLI to find work, read specs, and update progress.

The workflow instructions include:

```bash
# 1. Find the next work item
refrakt plan next

# 2. Start working on it
refrakt plan update <id> --status in-progress

# 3. Read referenced specs and decisions before implementing

# 4. Check off acceptance criteria as you complete them
refrakt plan update <id> --check "criterion text"

# 5. When all criteria are met, mark it done
refrakt plan update <id> --status done
```

### How it works with AI assistants

1. **Discovery** — The assistant runs `refrakt plan next` to find the highest-priority actionable item
2. **Context** — It reads the work item's file, follows references to specs in `plan/spec/`, and checks related decisions in `plan/decision/`
3. **Implementation** — It implements the changes, checking off acceptance criteria as each one is met
4. **Completion** — When all criteria pass, it marks the item done and can move to the next

The `--format json` flag on all commands makes it easy for AI tools to parse output programmatically.

### Custom CLAUDE.md instructions

You can add plan-specific instructions to `plan/CLAUDE.md` (separate from your project root `CLAUDE.md`). This file typically includes:

- ID naming conventions (e.g., `WORK-XXX`, `SPEC-XXX`, `ADR-XXX`)
- Current highest IDs to avoid collisions
- Valid status flows for each entity type
- Required content structure for specs, work items, and decisions

## Team workflows

### Spec-first development

1. Write a spec in `plan/spec/` describing what to build
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
