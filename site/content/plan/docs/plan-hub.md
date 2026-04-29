---
title: PlanHub
description: Browse and share your project plan on the web with PlanHub
---

# PlanHub

[PlanHub](https://plan.refrakt.md) is a web dashboard for browsing refrakt plan projects. It reads your `plan/` directory directly from GitHub and renders an interactive view of your specs, work items, bugs, decisions, and milestones.

## Getting started

1. Push your `plan/` directory to a GitHub repository
2. Visit [plan.refrakt.md](https://plan.refrakt.md) and click **Connect your repository**
3. Authorize PlanHub to read your repo

That's it. No deploy step, no config files. Public repositories can also be browsed directly at `plan.refrakt.md/{owner}/{repo}`.

## What you get

PlanHub renders your plan entities with the same rune system used on your docs site:

- **Dashboard** — status overview with progress indicators and activity feed
- **Entity pages** — full rendering of each spec, work item, bug, decision, and milestone
- **Filtering** — browse by status, type, priority, milestone, or tag
- **Cross-references** — entity links resolve to their PlanHub pages
- **Search** — full-text search across all entities

## PlanHub CLI

PlanHub includes a CLI plugin that extends `refrakt` with commands for authentication, server-backed ID allocation, and history import.

### Installation

```shell
npm install -D @refrakt-md/planhub
```

The plugin is auto-discovered by the CLI once installed — all commands are available under `refrakt planhub`.

### Login

Authenticate with PlanHub using GitHub's device flow:

```shell
npx refrakt planhub login
```

This prints a code and URL. Open the URL in your browser, enter the code, and the CLI stores a session token locally. The GitHub token itself is not retained — only the PlanHub session.

Log out with:

```shell
npx refrakt planhub logout
```

### Server-backed next-id

When multiple contributors work in parallel across branches, local ID auto-assignment can collide. PlanHub provides a server-backed alternative:

```shell
npx refrakt planhub next-id work
# → WORK-126
```

This reserves the ID server-side, preventing duplicates. Public repos don't require authentication; private repos need a login or API token.

### Import git history

Backfill PlanHub with your existing plan history from git:

```shell
npx refrakt planhub import-history
```

This walks your git log for `plan/**/*.md` files and uploads each version to PlanHub. It deduplicates by commit SHA, so re-running is safe. Runs in dry-run mode by default and prompts before applying.

### Agent companion file

For projects using AI coding agents, scaffold a companion file that teaches agents to prefer PlanHub-backed commands:

```shell
npx refrakt planhub init
```

This creates `plan/PLANHUB.md` alongside the existing `plan/INSTRUCTIONS.md`.

### API tokens

Create repo-scoped API tokens for CI, webhooks, or scripted access:

```shell
# Create a token
npx refrakt planhub token create --owner myorg --repo myrepo \
  --name "CI token" --scope entities:read,mutations:execute

# List tokens
npx refrakt planhub token list --owner myorg --repo myrepo

# Revoke a token
npx refrakt planhub token revoke <id> --owner myorg --repo myrepo
```

Available scopes: `entities:read`, `mutations:execute`, `events:subscribe`, `webhooks:manage`, `tokens:manage`.

## Linking to PlanHub

Add a link to your project's README, docs site, or navigation:

```markdown
[Roadmap](https://plan.refrakt.md/{owner}/{repo})
```

## Local alternatives

If you prefer to browse your plan locally:

```shell
# Interactive local dashboard
npx refrakt plan serve --open

# Generate a static site
npx refrakt plan build
```

The local `serve` command provides the same browsing experience as PlanHub, running against your local files with live updates as you edit.
