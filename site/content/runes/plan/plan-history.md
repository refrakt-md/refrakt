---
title: Plan History
description: Git-native entity history timeline showing lifecycle events derived from commits
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Plan History

Renders a timeline of lifecycle events for plan entities, derived directly from git history. Every status transition, priority change, criteria check-off, and resolution is extracted from consecutive commits — no separate activity log or event database required.

This is a self-closing aggregation rune. The pipeline's aggregate hook extracts history from git during the build, and the postProcess hook resolves the sentinel into a styled vertical timeline.

## Per-entity timeline

Show the full history for a single entity by passing its ID.

```markdoc
{% plan-history id="WORK-024" /%}
```

Each event in the timeline shows:

- **Date** and **commit hash** (linked to the repository when a remote is configured)
- **Attribute changes** — `status: ready → done`, `priority: low → high`
- **Criteria progress** — checked/unchecked acceptance criteria with ☑/☐ markers
- **Resolution events** — when a `## Resolution` section is added
- **Content edits** — body changes with no structured diff

Events are displayed newest-first. When more than 3 criteria change in a single event, the list collapses with a "+N more criteria" summary.

### Visual language

- Filled circle markers (●) for events with structured changes
- Open circle markers (○) for creation events
- Attribute values use `data-type="add|remove"` with diff-style background tints — green for new values, red (with strikethrough) for old values

## Global activity feed

Omit the `id` attribute for a project-wide feed grouped by commit.

```markdoc
{% plan-history /%}
{% plan-history limit=10 /%}
{% plan-history type="work" /%}
{% plan-history since="7d" /%}
```

In global mode, events from the same commit are grouped together, showing the commit message and a compact summary for each affected entity. This makes atomic operations visible — when a spec is accepted and 5 work items are created in one commit, they appear as a single grouped entry.

Content-only events (body edits with no attribute/criteria/resolution change) are omitted from the global feed to reduce noise.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Entity ID for single-entity mode. Omit for global feed. |
| `limit` | `number` | `20` | Maximum events (per-entity) or commits (global) to show |
| `type` | `string` | `"all"` | Entity type filter: `work`, `bug`, `spec`, `decision`, or comma-separated |
| `since` | `string` | — | Time filter: `"7d"`, `"30d"`, or ISO date. Maps to git `--since`. |
| `group` | `string` | `"commit"` | Global mode grouping: `commit` (group by commit) or `entity` (group by entity) |

## Event types

The history extractor classifies each commit into one of five event kinds:

| Kind | Meaning |
|------|---------|
| `created` | Entity file first appeared in git |
| `attributes` | One or more tag attributes changed (status, priority, etc.) |
| `criteria` | Acceptance criteria checkboxes were checked or unchecked |
| `resolution` | A `## Resolution` section was added or modified |
| `content` | File changed but no attribute/criteria/resolution diff detected |

## How it works

History is derived from git commits, not a separate event store:

1. `git log --follow` retrieves the ordered commit list for each entity file
2. `git show <hash>:<path>` retrieves the file contents at each commit
3. The opening Markdoc tag (line 1) is parsed for attribute changes
4. Checkbox lines (`- [ ]` / `- [x]`) are diffed for criteria changes
5. The `## Resolution` section is checked for appearance or modification
6. Consecutive versions are compared to emit typed events

Results are cached in `.plan-history-cache.json`, keyed by each file's latest commit hash. Subsequent builds skip files whose history hasn't changed.

### Shallow clones

In shallow clones (common in CI), only available commits are processed. The timeline may be incomplete — earlier events are simply absent rather than fabricated.

### Rename tracking

`git log --follow` tracks files across renames, so entity history is preserved even when files are reorganised. The rename itself is not surfaced as an event.

## Output structure

### Per-entity HTML

```html
<section class="rf-plan-history" data-rune="plan-history">
  <ol class="rf-plan-history__events">
    <li class="rf-plan-history__event" data-kind="attributes">
      <time class="rf-plan-history__date">Apr 12</time>
      <code class="rf-plan-history__hash">a295513</code>
      <div class="rf-plan-history__changes">
        <span class="rf-plan-history__change">
          <span class="rf-plan-history__field">status</span>
          <span class="rf-plan-history__value" data-type="remove">ready</span>
          <span class="rf-plan-history__arrow">→</span>
          <span class="rf-plan-history__value" data-type="add">done</span>
        </span>
      </div>
    </li>
  </ol>
</section>
```

### Global feed HTML

The global feed adds the `rf-plan-history--global` modifier and uses `__commit-message` and `__entity-summary` elements for the commit-grouped layout.

## CLI companion

The [`refrakt plan history`](/runes/plan/cli#refrakt-plan-history) command provides the same history data in the terminal, with additional filtering options (`--author`, `--status`).
