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
| `--<attr> <value>` | Set any initial attribute (e.g., `--priority high`, `--status ready`) |

```shell
# Auto-assigned ID
npx refrakt plan create work --title "Add search" --priority high

# Explicit ID
npx refrakt plan create milestone --id v2.0.0 --title "Next major release"
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

Convert legacy filenames to the ID-based convention.

```shell
# Preview changes
npx refrakt plan migrate filenames

# Apply with git history preservation
npx refrakt plan migrate filenames --apply --git
```

| Flag | Description |
|------|-------------|
| `--apply` | Perform renames (default is dry-run) |
| `--git` | Use `git mv` to preserve history |
| `--dir <path>` | Plan directory |
