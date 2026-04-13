---
title: "@refrakt-md/plan"
description: Spec-driven project planning with AI-native workflows and CLI tooling
---

# @refrakt-md/plan

Spec-driven project planning with AI-native workflows. Write specs, track work items, record architectural decisions, and manage milestones — all in Markdown files that live alongside your code.

Unlike most rune packages, `@refrakt-md/plan` is more than just runes. It includes a full [CLI toolchain](/runes/plan/cli) for managing your plan from the terminal, a cross-page pipeline for entity indexing, and a [workflow guide](/runes/plan/workflow) for integrating with AI coding assistants like Claude Code.

## Installation

```bash
npm install @refrakt-md/plan
```

```json
{
  "packages": ["@refrakt-md/plan"]
}
```

Initialize a plan directory in your project:

```bash
refrakt plan init
```

This creates the `plan/` directory structure with example files and updates your `CLAUDE.md` with workflow instructions.

## What's included

### Runes

| Rune | Description |
|------|-------------|
| [spec](/runes/plan/spec) | Specification document with status tracking and versioning |
| [work](/runes/plan/work) | Work item with acceptance criteria, priority, and complexity tracking |
| [bug](/runes/plan/bug) | Bug report with structured reproduction steps and severity |
| [decision](/runes/plan/decision) | Architecture decision record with context, options, and rationale |
| [milestone](/runes/plan/milestone) | Named release target with goals and status |

### Aggregation runes

These runes use the cross-page pipeline to build site-wide views from your plan entities:

| Rune | Description |
|------|-------------|
| [backlog](/runes/plan/backlog) | Aggregation view of work items and bugs with filtering, sorting, and grouping |
| [decision-log](/runes/plan/decision-log) | Chronological view of architecture decision records |
| [plan-progress](/runes/plan/plan-progress) | Progress summary showing status counts per entity type |
| [plan-activity](/runes/plan/plan-activity) | Recent activity feed sorted by file modification time |
| [plan-history](/runes/plan/plan-history) | Git-native entity history timeline derived from commits |

### CLI commands

The plan package extends the `refrakt` CLI with 9 subcommands under `refrakt plan`. See the full [CLI reference](/runes/plan/cli).

| Command | Purpose |
|---------|---------|
| `refrakt plan status` | Project status summary with milestone progress |
| `refrakt plan next` | Find the next actionable work item |
| `refrakt plan update` | Update attributes and check off acceptance criteria |
| `refrakt plan create` | Scaffold new plan items from templates |
| `refrakt plan validate` | Check plan structure for errors |
| `refrakt plan init` | Initialize plan directory structure |
| `refrakt plan history` | View git-derived entity and project history |
| `refrakt plan serve` | Browse plan as an interactive dashboard |
| `refrakt plan build` | Generate a static plan site |

### Cross-page pipeline

The plan package registers pipeline hooks that:

- **Register**: Scan all pages for plan runes and index entities into the site-wide registry
- **Aggregate**: Build cross-page indexes for backlog and decision-log views
- **Post-process**: Resolve aggregation rune placeholders with indexed entity data

### File timestamps

All plan runes automatically receive `created` and `modified` dates from the content pipeline's `$file.created` and `$file.modified` variables. These are derived from git commit history (with filesystem stat as fallback) and displayed in each rune's header metadata. Authors can override them with explicit attribute values.

## Directory structure

```
plan/
  spec/      — Specifications (source of truth for what to build)
  work/      — Work items and bugs (what to implement)
  decision/  — Architecture decision records (why it's built this way)
  index.md   — Overview page with progress and activity runes
```

## When to use

Use this package for spec-driven development workflows, especially with AI coding assistants. Write specs to define what to build, create work items with acceptance criteria, and let the CLI guide you (or your AI assistant) through the backlog. The Markdown-first approach means your project plan lives in version control alongside your code.
