---
title: "@refrakt-md/plan"
description: Spec-driven project planning with AI-native workflows and CLI tooling
icon: clipboard-list
---

# @refrakt-md/plan

Spec-driven project planning with AI-native workflows. Write specs, track work items, record architectural decisions, and manage milestones — all in Markdown files that live alongside your code.

Unlike most rune packages, `@refrakt-md/plan` is more than just runes. It includes a full [CLI toolchain](/docs/cli/plan) for managing your plan from the terminal, a cross-page pipeline for entity indexing, and a [workflow guide](/runes/plan/workflow) for integrating with AI coding assistants.

## Installation

```bash
npm install @refrakt-md/plan
```

```json
{
  "plugins": ["@refrakt-md/plan"]
}
```

Initialize a plan directory in your project:

```bash
refrakt plan init
```

This wires the host project end-to-end: it scaffolds the `plan/` directory with example files, writes the canonical `AGENTS.md` with the full workflow guide, adds `@refrakt-md/cli` + `@refrakt-md/plan` to `devDependencies` with a `plan` script, and (for Claude users) installs a `SessionStart` hook that auto-runs `install` on first use. See [`refrakt plan init`](/docs/cli/plan#refrakt-plan-init) for the complete list of side effects and opt-out flags (`--minimal`, `--no-hooks`, etc.).

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

The plan package extends the `refrakt` CLI with subcommands under `refrakt plan`. See the full [CLI reference](/docs/cli/plan).

| Command | Purpose |
|---------|---------|
| `refrakt plan status` | Project status summary with milestone progress |
| `refrakt plan next` | Find the next actionable work item |
| `refrakt plan update` | Update attributes and check off acceptance criteria |
| `refrakt plan create` | Scaffold new plan items from templates |
| `refrakt plan validate` | Check plan structure for errors |
| `refrakt plan init` | Initialize plan directory structure |
| `refrakt plan history` | View git-derived entity and project history |

To view or publish your plan as a site, scaffold one with `create-refrakt --type plan` and use the standard adapter dev server and build — see [Publish a Plan Site](/plan/docs/plan-site).

### File timestamps

Every plan rune shows when its file was created and last modified, read from git. Set `created` or `modified` on the rune to override either.

## Directory structure

```
plan/
  specs/      — Specifications (source of truth for what to build)
  work/       — Work items and bugs (what to implement)
  decisions/  — Architecture decision records (why it's built this way)
  milestones/ — Named release targets with scope and goals
  index.md    — Overview page with progress and activity runes
```

## When to use

Use this package for spec-driven development workflows, especially with AI coding assistants. Write specs to define what to build, create work items with acceptance criteria, and let the CLI guide you (or your AI assistant) through the backlog. The Markdown-first approach means your project plan lives in version control alongside your code.
