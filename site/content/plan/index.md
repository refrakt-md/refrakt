---
title: Plan — Project Planning in Your Repo
description: Structured project planning with specs, work items, decisions, and milestones that live in your repository and sync to an interactive dashboard
---

{% hero align="center" %}

# Plan in your repo. Track on the web.

Specs, work items, bugs, decisions, and milestones as version-controlled Markdoc files. Managed from the CLI. Browsable on [PlanHub](https://plan.refrakt.md).

```shell
npm create refrakt my-plan --type plan
```

- [Get Started](/plan/docs/plan-overview)
- [See a live dashboard](https://plan.refrakt.md/refrakt-md/refrakt)

{% /hero %}

{% steps %}

## Create a plan

Scaffold a planning project or add planning to an existing repo. Your `plan/` directory becomes the single source of truth.

```shell
npx refrakt plan init
```

---

## Work with the CLI

Create entities, find what to work on next, check off acceptance criteria, and mark items done — all from the terminal.

```shell
npx refrakt plan next
npx refrakt plan update WORK-042 --status in-progress
npx refrakt plan update WORK-042 --check "Login validates email"
npx refrakt plan update WORK-042 --status done --resolve "Implemented in PR #42"
```

---

## Browse on PlanHub

Push to GitHub, visit `plan.refrakt.md/{owner}/{repo}`. No deploy step, no config. Your plan is rendered as an interactive dashboard with search, filtering, and cross-references.

{% /steps %}

{% feature-grid columns="3" %}

## Version-controlled

Every status change, criterion check-off, and resolution is a git commit. Your project history is your changelog.

---

## AI-agent friendly

Structured Markdoc files are easy for coding agents to read and update. Wire up Claude, Cursor, or Copilot with `plan init --agent`.

---

## CLI-driven workflow

Find the next task, update status, check off criteria, validate cross-references — all without leaving the terminal.

---

## Dependency tracking

Work items declare dependencies. `plan next` only surfaces items whose blockers are resolved.

---

## Cross-references

Link specs to work items, decisions to specs. `plan validate` catches broken references before they become problems.

---

## PlanHub dashboard

An interactive web view of your plan — no build step, no hosting. Just push to GitHub and browse.

{% /feature-grid %}
