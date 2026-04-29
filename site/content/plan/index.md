---
title: Plan — Project Planning in Your Repo
description: Structured project planning with specs, work items, decisions, and milestones that live in your repository and sync to an interactive dashboard
---

{% hero align="center" %}

# Plan in your repo. Track on the web.

Keep your project plan in Git alongside your code. Track progress from the terminal, see your roadmap on the web. No SaaS accounts, no sync issues — just Markdoc files and the CLI.

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

## Why Plan?

Issue trackers live outside your repo. Boards go stale. Status updates get lost in chat. Plan puts your project plan where it belongs — in version control, next to the code it describes.

- **Every change is a commit** — status transitions, criterion check-offs, and resolutions are tracked in git history, not a proprietary database
- **AI agents can read and update it** — structured Markdoc files are first-class input for coding agents like Claude, Cursor, and Copilot
- **Works offline** — no network required for `plan next`, `plan update`, or `plan status`
- **Zero lock-in** — your plan is plain text in your repo; stop using the CLI and the files are still useful

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
