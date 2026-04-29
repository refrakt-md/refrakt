---
title: Plan Overview
description: Structured project planning with specs, work items, decisions, and milestones — managed from the CLI and browsable on PlanHub
---

# Plan

Plan is a structured project planning system built into refrakt.md. It replaces issue trackers and project boards with version-controlled Markdoc files that live in your repository.

Every plan entity — specs, work items, bugs, decisions, milestones — is a `.md` file in your `plan/` directory. The CLI manages these files, tracks acceptance criteria, resolves dependencies, and validates cross-references. [PlanHub](https://plan.refrakt.md) provides a web dashboard for browsing and sharing your roadmap.

## Why plan in the repo?

- **Single source of truth** — plans live next to the code they describe
- **Git history is your changelog** — every status transition, criterion check-off, and resolution is a commit
- **AI-agent friendly** — structured Markdoc files are easy for coding agents to read and update
- **No external dependencies** — no SaaS accounts, no sync issues, no stale boards

## Quick start

### New standalone project

```shell
npm create refrakt my-plan --type plan
cd my-plan
npm install
```

### Add to an existing project

```shell
npx refrakt plan init
```

This creates the `plan/` directory structure with example files and optionally wires up your AI coding agent (Claude, Cursor, Copilot, etc.) with plan context.

See [Plan Init](/plan/docs/plan-cli#init) for all options.

## Project structure

```
plan/
  specs/        SPEC-001-auth-system.md, SPEC-002-api-design.md, ...
  work/         WORK-001-setup-project.md, WORK-002-add-search.md, ...
  bugs/         BUG-001-crash-fix.md, BUG-002-login-error.md, ...
  decisions/    ADR-001-use-postgres.md, ADR-002-api-style.md, ...
  milestones/   v1.0.0.md, v1.1.0.md, ...
```

Files follow the `{ID}-{slug}.md` naming convention. IDs are auto-assigned when you create entities with the CLI.

## Entity types at a glance

| Type | Prefix | Purpose |
|------|--------|---------|
| Spec | `SPEC-` | Design documents — the source of truth for what to build |
| Work | `WORK-` | Discrete, implementable tasks with acceptance criteria |
| Bug | `BUG-` | Defect reports with reproduction steps |
| Decision | `ADR-` | Architecture decision records — why it's built this way |
| Milestone | *(name)* | Named release targets that group work items |

## Next steps

- [Workflow](/plan/docs/plan-workflow) — learn the day-to-day create/next/update cycle
- [Entities](/plan/docs/plan-entities) — deep dive into each entity type and its attributes
- [CLI Reference](/plan/docs/plan-cli) — full command reference
- [PlanHub](/plan/docs/plan-hub) — browse your plan on the web
