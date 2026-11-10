---
title: Plan History
description: Git-native entity history timeline showing lifecycle events derived from commits
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:plan-history"} /%}

Every status transition, priority change, criteria check-off, and resolution is extracted from consecutive commits — no separate activity log or event database required.
## Per-entity timeline

Show the full history for a single entity by passing its ID.

{% preview source=true %}

	{% plan-history id="WORK-716" /%}

{% /preview %}

Each event in the timeline shows:

- **Date** and **commit hash** (linked to the repository when a remote is configured)
- **Attribute changes** — `status: ready → done`, `priority: low → high`
- **Criteria progress** — checked/unchecked acceptance criteria with ☑/☐ markers
- **Resolution events** — when a `## Resolution` section is added
- **Content edits** — body changes with no structured diff

Events are displayed newest-first. When more than 3 criteria change in a single event, the list collapses with a "+N more criteria" summary.

### Visual language

- A filled circle (●) marks an event with changes; an open circle (○) marks the entity's creation.
- A changed value shows the old value struck through and the new one beside it.

## Global activity feed

Omit the `id` attribute for a project-wide feed grouped by commit.

{% preview source=true %}

	{% plan-history type="spec" limit=5 /%}

{% /preview %}

`limit` caps the number of commits shown, `type` keeps one entity type (`work`, `bug`, `spec`, `decision`), and `since` keeps recent activity only (`since="7d"`).

In global mode, events from the same commit are grouped together, showing the commit message and a compact summary for each affected entity. This makes atomic operations visible — when a spec is accepted and 5 work items are created in one commit, they appear as a single grouped entry.

Content-only events (body edits with no attribute/criteria/resolution change) are omitted from the global feed to reduce noise.

## Event types

The history extractor classifies each commit into one of five event kinds:

| Kind | Meaning |
|------|---------|
| `created` | Entity file first appeared in git |
| `attributes` | One or more tag attributes changed (status, priority, etc.) |
| `criteria` | Acceptance criteria checkboxes were checked or unchecked |
| `resolution` | A `## Resolution` section was added or modified |
| `content` | File changed but no attribute/criteria/resolution diff detected |

## Where the history comes from

The timeline is read from git: every commit that changed an entity's file, compared with the one before. Nothing else needs to be kept. A file's history follows it when it is renamed within the plan directory. In a shallow clone, which CI often uses, the timeline starts at the oldest commit available. Results are cached in `.plan-history-cache.json`, which you can add to `.gitignore`.

## CLI companion

The [`refrakt plan history`](/runes/plan/cli#refrakt-plan-history) command provides the same history data in the terminal, with additional filtering options (`--author`, `--status`).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:plan-history"} /%}
