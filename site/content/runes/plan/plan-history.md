---
title: Plan History
description: Git-native entity history timeline showing lifecycle events derived from commits
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:plan-history"} /%}

Show how a plan entity changed over time: every status change, priority change, checked criterion and resolution, read from the commits that touched its file. There is no activity log to keep.

## Basic usage

Pass an entity's ID for its full history:

{% preview source=true %}

	{% plan-history id="WORK-716" /%}

{% /preview %}

## Read the timeline

Events run newest first. Each shows its date and commit (linked to the repository when a remote is configured), and what changed:

- **Attributes**, such as `status: ready → done`, with the old value struck through.
- **Acceptance criteria** checked (☑) or unchecked (☐). More than three in one commit collapse into "+N more criteria".
- **A resolution** added.
- **Body edits** with no change to the above.

A filled circle (●) marks a change; an open circle (○) marks the commit that created the entity.

## Show recent activity across the plan

Leave out `id` for a project-wide feed, one entry per commit:

{% preview source=true %}

	{% plan-history type="spec" limit=5 /%}

{% /preview %}

`limit` caps the number of commits, `type` keeps one entity type (`work`, `bug`, `spec`, `decision`), and `since` keeps recent activity only (`since="7d"`). A commit that touched several entities, such as accepting a spec and creating its work items, is one entry. Body-only edits are left out of the feed.

## Where the history comes from

The timeline is read from git: every commit that changed an entity's file, compared with the one before. A file's history follows it when it is renamed within the plan directory. In a shallow clone, which CI often uses, the timeline starts at the oldest commit available. Results are cached in `.plan-history-cache.json`, which you can add to `.gitignore`.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:plan-history"} /%}

## See also

- [`refrakt plan history`](/docs/cli/plan#refrakt-plan-history) — the same history in the terminal, with `--author` and `--status` filters.
