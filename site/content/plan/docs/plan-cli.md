---
title: Plan CLI Reference
description: Complete reference for all refrakt plan CLI commands
---

# Plan CLI Reference

All commands use the `refrakt plan <command>` namespace. Add `--format json` to any command for machine-readable output.

## init

Initialize a plan directory in your project.

```shell
npx refrakt plan init
```

| Flag | Description |
|------|-------------|
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--project-root <path>` | Project root for agent files (default: `.`) |
| `--agent <tool>` | AI agent: `claude`, `cursor`, `copilot`, `windsurf`, `cline`, `none` (auto-detected) |
| `--minimal` | Skip hooks, wrapper script, and package.json updates |
| `--no-hooks` | Skip `.claude/settings.json` hook |
| `--no-wrapper` | Skip `./plan.sh` wrapper script |
| `--no-package-json` | Skip adding dependencies to package.json |

Creates the directory structure, example files, and optionally wires your AI agent with plan context.

## create

Scaffold a new entity.

```shell
npx refrakt plan create <type> --title "Description"
```

**Types:** `spec`, `work`, `bug`, `decision`, `milestone`

| Flag | Description |
|------|-------------|
| `--id <id>` | Explicit ID (auto-assigned if omitted; required for milestones) |
| `--title "..."` | Entity title (required) |
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--<attr> <value>` | Set any initial attribute (see table below) |

**Attributes by entity type:**

| Type | Attributes |
|------|------------|
| `spec` | `status`, `version`, `supersedes`, `tags` |
| `work` | `status`, `priority`, `complexity`, `assignee`, `milestone`, `source`, `tags` |
| `bug` | `status`, `severity`, `assignee`, `milestone`, `source`, `tags` |
| `decision` | `status`, `date`, `supersedes`, `source`, `tags` |
| `milestone` | `status`, `target` |

```shell
# Auto-assigned ID
npx refrakt plan create work --title "Add search" --priority high --complexity moderate

# Explicit ID
npx refrakt plan create milestone --id v2.0.0 --title "Next major release" --target 2026-09-01
```

## next

Find the next actionable work item.

```shell
npx refrakt plan next
```

Returns the highest-priority item whose status is `ready` (work) or `confirmed` (bug) and whose dependencies are all complete.

| Flag | Description |
|------|-------------|
| `--milestone <name>` | Filter to milestone |
| `--tag <tag>` | Filter by tag |
| `--assignee <name>` | Filter by assignee |
| `--type work\|bug\|all` | Entity type (default: `all`) |
| `--count N` | Number of items to show (default: `1`) |
| `--dir <path>` | Plan directory |

## update

Modify an entity's attributes, check off criteria, or add a resolution.

```shell
npx refrakt plan update <id> [options]
```

| Flag | Description |
|------|-------------|
| `--status <value>` | Change status (validated per entity type) |
| `--check "text"` | Mark an acceptance criterion as done |
| `--uncheck "text"` | Unmark a criterion |
| `--resolve "text"` | Resolution summary (appended when marking done) |
| `--resolve-file <path>` | Read resolution from a file |
| `--<attr> <value>` | Update any attribute (priority, assignee, milestone, etc.) |

Pass an empty string to clear an attribute: `--assignee ""`

```shell
# Change status and assign
npx refrakt plan update WORK-042 --status in-progress --assignee "alice"

# Check off a criterion
npx refrakt plan update WORK-042 --check "Login form validates email"

# Complete with resolution
npx refrakt plan update WORK-042 --status done --resolve "Implemented in PR #123"
```

## status

Terminal dashboard showing project status.

```shell
npx refrakt plan status
```

| Flag | Description |
|------|-------------|
| `--milestone <name>` | Show progress for a specific milestone |

Displays status counts, blocked items, ready queue, recent completions, and warnings.

## validate

Check plan integrity.

```shell
npx refrakt plan validate
```

| Flag | Description |
|------|-------------|
| `--strict` | Treat warnings as errors (useful in CI) |

Checks for: duplicate IDs, broken references, invalid attribute values, filename format mismatches.

## next-id

Show the next auto-increment ID for a type without creating anything.

```shell
npx refrakt plan next-id work
# → WORK-126
```

**Types:** `spec`, `work`, `bug`, `decision` (not milestones — they use explicit names).

## history

View git-native change history.

```shell
# Single entity
npx refrakt plan history WORK-042

# Global activity
npx refrakt plan history --since 7d
```

| Flag | Description |
|------|-------------|
| `<id>` | Entity ID (omit for global feed) |
| `--limit N` | Max events (default: `20`) |
| `--since <duration\|date>` | Time filter: `7d`, `30d`, `2w`, or ISO date |
| `--type <types>` | Comma-separated entity types |
| `--author <name>` | Filter by commit author |
| `--status <status>` | Show transitions to a specific status |
| `--all` | Include content-only events (global mode) |

## serve

Local web dashboard for browsing your plan.

```shell
npx refrakt plan serve
```

| Flag | Description |
|------|-------------|
| `--port N` | Server port (default: `3000`) |
| `--theme <name>` | Theme (default: `auto`) |
| `--open` | Auto-open in browser |
| `--css <file>` | Additional CSS file |

## build

Generate a static plan site.

```shell
npx refrakt plan build
```

| Flag | Description |
|------|-------------|
| `--out <dir>` | Output directory (default: `./plan-site`) |
| `--theme <name>` | Theme (default: `auto`) |
| `--base-url <url>` | Base URL for assets (default: `/`) |
| `--css <file>` | Additional CSS file |

## migrate

Convert legacy filenames to the `{ID}-{slug}.md` naming convention. Use this when you have plan files that were created manually or with an older version of the CLI that used a different naming scheme.

By default, `migrate` runs in dry-run mode and shows what would change without modifying any files.

```shell
# Preview changes (dry-run)
npx refrakt plan migrate filenames

# Apply renames
npx refrakt plan migrate filenames --apply

# Apply with git history preservation
npx refrakt plan migrate filenames --apply --git
```

| Flag | Description |
|------|-------------|
| `--apply` | Perform renames (default is dry-run) |
| `--git` | Use `git mv` to preserve history |
| `--dir <path>` | Plan directory |

## JSON output

All commands support `--format json` for machine-readable output. This is useful for scripting, CI pipelines, and integration with other tools.

```shell
npx refrakt plan next --format json
```

```json
{
  "id": "WORK-042",
  "title": "Implement login flow",
  "status": "ready",
  "priority": "high",
  "complexity": "moderate",
  "milestone": "v1.0.0",
  "source": "SPEC-001",
  "assignee": null,
  "tags": ["auth"],
  "criteria": {
    "total": 4,
    "checked": 0
  },
  "file": "plan/work/WORK-042-implement-login-flow.md"
}
```

The exact shape varies by command — `plan status` returns aggregate counts, `plan validate` returns an array of diagnostics, etc. Pipe through `jq` for further processing:

```shell
# Get IDs of all ready work items
npx refrakt plan next --count 100 --format json | jq -r '.[].id'
```
