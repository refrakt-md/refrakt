---
title: Plan — Project Planning in Your Repo
description: Structured project planning with specs, work items, decisions, and milestones that live in your repository and publish as a browsable site
---

{% hero align="center" %}

# Plan in your repo. Track on the web.

Keep your project plan in Git alongside your code. Track progress from the terminal, see your roadmap on the web. No SaaS accounts, no sync issues — just Markdoc files and the CLI.

```shell
npm create refrakt my-plan --type plan
```

- [Get Started](/plan/docs/plan-overview)
- [Publish your plan](/plan/docs/plan-site)

{% /hero %}

{% steps %}

## Create a plan

Start a new standalone planning project, or add planning to an existing repo. Either way, your `plan/` directory becomes the single source of truth.

```shell
# New project
npm create refrakt my-plan --type plan

# Existing repo
npx refrakt plan init  # adds @refrakt-md/cli + @refrakt-md/plan to package.json
npm install
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

## Publish your plan

Browse it locally as you work, or ship it. `refrakt plan serve` opens a live dashboard; `refrakt plan build` exports a static site. Or scaffold a deployable site with `--target` and customize it like any refrakt project.

```shell
npx refrakt plan serve --open
npm create refrakt my-plan --type plan --target sveltekit
```

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

- {% icon name="globe" /%} **Publish as a site**

  Browse locally with `plan serve`, export a static site with `plan build`, or scaffold a deployable site you own and theme — no SaaS, no lock-in.

- {% icon name="wifi-off" /%} **Works offline, zero lock-in**

  No network needed for the CLI. Your plan is plain text in your repo — stop using the tools and the files are still useful.

{% /feature %}
