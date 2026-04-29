---
title: PlanHub
description: Browse and share your project plan on the web with PlanHub
---

# PlanHub

[PlanHub](https://plan.refrakt.md) is a web dashboard for browsing refrakt plan projects. It reads your `plan/` directory directly from GitHub and renders an interactive view of your specs, work items, bugs, decisions, and milestones.

## Getting started

1. Push your `plan/` directory to a GitHub repository
2. Visit `https://plan.refrakt.md/{owner}/{repo}`

That's it. No configuration, no deploy step, no authentication needed for public repositories.

## What you get

PlanHub renders your plan entities with the same rune system used on your docs site:

- **Dashboard** — status overview with progress indicators and activity feed
- **Entity pages** — full rendering of each spec, work item, bug, decision, and milestone
- **Filtering** — browse by status, type, priority, milestone, or tag
- **Cross-references** — entity links resolve to their PlanHub pages
- **Search** — full-text search across all entities

## Linking to PlanHub

Add a link to your project's README, docs site, or navigation:

```markdown
[Roadmap](https://plan.refrakt.md/{owner}/{repo})
```

## Local alternatives

If you prefer to browse your plan locally or want a self-hosted option:

```shell
# Interactive local dashboard
npx refrakt plan serve --open

# Generate a static site
npx refrakt plan build
```

The local `serve` command provides the same browsing experience as PlanHub, running against your local files with live updates as you edit.
