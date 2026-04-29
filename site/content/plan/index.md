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

Start a new standalone planning project, or add planning to an existing repo. Either way, your `plan/` directory becomes the single source of truth.

```shell
# New project
npm create refrakt my-plan --type plan

# Existing repo
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

{% feature align="left" spacing="loose" %}
Why Plan?
## Your project plan belongs in the repo

Issue trackers live outside your code. Boards go stale. Status updates get lost in chat. Plan puts your project plan where it belongs — in version control, next to the code it describes.

- {% icon name="git-commit" /%} **Every change is a commit**

  Status transitions, criterion check-offs, and resolutions are tracked in git history — not a proprietary database.

- {% icon name="brain" /%} **AI-agent friendly**

  Structured Markdoc files are first-class input for coding agents. Wire up Claude, Cursor, or Copilot with `plan init --agent`.

- {% icon name="terminal" /%} **CLI-driven workflow**

  Find the next task, update status, check off criteria, validate cross-references — all without leaving the terminal.

- {% icon name="link" /%} **Dependency and cross-reference tracking**

  Work items declare dependencies. Specs link to decisions. `plan next` respects blockers, `plan validate` catches broken references.

- {% icon name="globe" /%} **PlanHub dashboard**

  Push to GitHub, visit `plan.refrakt.md/{owner}/{repo}`. An interactive web view of your plan — no build step, no hosting.

- {% icon name="wifi-off" /%} **Works offline, zero lock-in**

  No network needed for the CLI. Your plan is plain text in your repo — stop using the tools and the files are still useful.

{% /feature %}
