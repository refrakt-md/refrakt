---
title: Plan CLI Commands
description: Command reference for refrakt plan — project management from the terminal
---

# Plan CLI Commands

The `@refrakt-md/plan` package extends the `refrakt` CLI with subcommands for managing your project plan. All commands read Markdown files from your plan directory (default: `plan/`, configurable via `--dir` or the `REFRAKT_PLAN_DIR` environment variable).

## refrakt plan status

Terminal status summary showing milestone progress, entity counts, blocked items, and warnings.

```bash
refrakt plan status
refrakt plan status --milestone v1.0
refrakt plan status --format json
```

### Options

| Flag | Description |
|------|-------------|
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--milestone <name>` | Filter to a specific milestone |
| `--format json` | Output JSON instead of human-readable text |

### Output

- **Milestone progress** — progress bar for the active milestone (or the one specified with `--milestone`)
- **Status counts** — breakdown by entity type (specs, work, bugs, decisions) and status
- **Blocked items** — items with status `blocked`, showing what they're waiting on
- **Ready items** — top 5 actionable items sorted by priority then complexity
- **Warnings** — broken references, orphaned work items, completed milestones with open items

## refrakt plan next

Find the next actionable work item. Filters to items with status `ready` (work) or `confirmed` (bug) whose dependencies are all complete.

```bash
refrakt plan next
refrakt plan next --count 5
refrakt plan next --milestone v1.0 --type work
refrakt plan next --tag backend --assignee alice
```

### Options

| Flag | Description |
|------|-------------|
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--milestone <name>` | Filter to a specific milestone |
| `--tag <tag>` | Filter by comma-separated tags |
| `--assignee <name>` | Filter by assignee |
| `--type <type>` | Filter by type: `work`, `bug`, or `all` (default: `all`) |
| `--count <n>` | Number of items to return (default: `1`) |
| `--format json` | Output JSON instead of human-readable text |

### Output

For each item: ID, title, type, priority, complexity, file path, acceptance criteria progress, and references.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Found items |
| `1` | No matches found |
| `2` | Invalid arguments |

## refrakt plan update

Update plan item attributes or toggle acceptance criteria checkboxes.

```bash
refrakt plan update WORK-042 --status in-progress
refrakt plan update WORK-042 --source "SPEC-021,ADR-005"
refrakt plan update WORK-042 --check "Add unit tests"
refrakt plan update WORK-042 --uncheck "Add unit tests"
refrakt plan update BUG-003 --severity major --assignee alice
refrakt plan update WORK-042 --status done
```

### Options

| Flag | Description |
|------|-------------|
| `<id>` | Required: entity ID (matches `id` or `name` attribute) |
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--status <value>` | Update status (validated per entity type) |
| `--check "<text>"` | Check off an acceptance criterion (partial text matching) |
| `--uncheck "<text>"` | Uncheck an acceptance criterion |
| `--<attr> <value>` | Set any allowed attribute (priority, complexity, assignee, etc.) |
| `--format json` | Output JSON instead of human-readable text |

### Valid statuses

| Type | Statuses |
|------|----------|
| work | `draft`, `ready`, `in-progress`, `review`, `done`, `blocked` |
| bug | `reported`, `confirmed`, `in-progress`, `fixed`, `wontfix`, `duplicate` |
| spec | `draft`, `review`, `accepted`, `superseded`, `deprecated` |
| decision | `proposed`, `accepted`, `superseded`, `deprecated` |
| milestone | `planning`, `active`, `complete` |

### Valid enums

| Attribute | Values |
|-----------|--------|
| priority (work) | `critical`, `high`, `medium`, `low` |
| complexity (work) | `trivial`, `simple`, `moderate`, `complex`, `unknown` |
| severity (bug) | `critical`, `major`, `minor`, `cosmetic` |
| source (work, bug) | Comma-separated entity IDs, e.g. `SPEC-001,ADR-002` |

## refrakt plan create

Scaffold a new plan item from a template. When `--id` is omitted, the next available ID is assigned automatically by scanning existing plan files. Duplicate IDs are rejected at create time.

```bash
refrakt plan create work --title "Add search indexing"
refrakt plan create bug --title "Login fails on Safari" --severity critical
refrakt plan create spec --title "Search API"
refrakt plan create decision --title "Use SQLite for local storage"
refrakt plan create milestone --id v2.0 --title "Version 2.0"
```

You can also specify an explicit ID if needed:

```bash
refrakt plan create work --id WORK-042 --title "Add search indexing"
```

### Options

| Flag | Description |
|------|-------------|
| `<type>` | Required: `work`, `bug`, `spec`, `decision`, or `milestone` |
| `--id <id>` | Unique identifier. Auto-assigned when omitted (required for `milestone`) |
| `--title "..."` | Required: item title |
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--<attr> <value>` | Set optional attributes (e.g., `--priority high`) |
| `--format json` | Output JSON instead of human-readable text |

### File locations

| Type | Directory |
|------|-----------|
| work | `plan/work/` |
| bug | `plan/work/` |
| spec | `plan/specs/` |
| decision | `plan/decisions/` |
| milestone | `plan/milestones/` |

## refrakt plan next-id

Show the next available ID for a given entity type without creating anything. Useful for previewing what ID will be assigned.

```bash
refrakt plan next-id work
refrakt plan next-id spec --format json
```

### Options

| Flag | Description |
|------|-------------|
| `<type>` | Required: `work`, `bug`, `spec`, or `decision` |
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--format json` | Output JSON instead of human-readable text |

### Output

Displays the next ID and the current highest existing ID (if any):

```
WORK-076  (highest existing: WORK-075)
```

## refrakt plan validate

Check plan structure for errors and inconsistencies.

```bash
refrakt plan validate
refrakt plan validate --strict
refrakt plan validate --format json
```

### Options

| Flag | Description |
|------|-------------|
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--strict` | Treat warnings as errors |
| `--format json` | Output JSON instead of human-readable text |

### Issues detected

| Type | Severity | Description |
|------|----------|-------------|
| `broken-ref` | error | Entity references an undefined ID |
| `duplicate-id` | error | Same ID appears in multiple files |
| `invalid-status` | error | Status not valid for the entity type |
| `invalid-priority` | error | Priority not in allowed values |
| `invalid-severity` | error | Severity not in allowed values |
| `circular-dependency` | error | Cycle in work/bug dependency graph |
| `no-milestone` | warning | Work/bug item not assigned to a milestone |
| `complete-milestone-open-item` | warning | Completed milestone still has open items |

## refrakt plan init

Wire `@refrakt-md/plan` into a host project. `plan init` does several things at once so that running `refrakt plan next` works immediately — it scaffolds the plan directory, writes the canonical `AGENTS.md` with the full workflow guide, wires `@refrakt-md/cli` and `@refrakt-md/plan` into your `package.json`, and (for Claude users) installs a `SessionStart` hook that runs `install` if the CLI isn't resolvable yet. Each side effect has an opt-out flag.

```bash
refrakt plan init                     # full setup with agent auto-detection
refrakt plan init --agent cursor      # target a specific AI tool
refrakt plan init --minimal           # plan/ + AGENTS.md only
refrakt plan init --no-hooks          # skip .claude/settings.json
refrakt plan init --agent none --dir planning
```

### Options

| Flag | Description |
|------|-------------|
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--project-root <path>` | Project root for agent file detection, `package.json` wiring, and hook/wrapper placement (default: `.`) |
| `--agent <tool>` | AI tool instruction file to update: `claude`, `cursor`, `copilot`, `windsurf`, `cline`, or `none`. Auto-detects when omitted. |
| `--no-package-json` | Skip modifying the host `package.json` |
| `--no-hooks` | Skip writing `.claude/settings.json` `SessionStart` hook |
| `--no-wrapper` | Skip writing `./plan.sh` wrapper script |
| `--minimal` | Equivalent to `--no-package-json --no-hooks --no-wrapper` — only scaffolds `plan/` content and agent files |
| `--format json` | Output JSON instead of human-readable text |

### What it creates

**Plan content** (always):
- `plan/specs/`, `plan/work/`, `plan/decisions/`, `plan/milestones/` — directories for each entity type
- `plan/index.md` — overview page with quick start
- `plan/INSTRUCTIONS.md` — full workflow guide (tool-agnostic; kept in-tree for convenience)
- Example work item, spec, decision, and milestone files

**Agent instruction files** (always):
- `AGENTS.md` — canonical agent-facing workflow at the project root, following the [AGENTS.md convention](https://agent-rules.org). Contains the full plan workflow guide.
- Tool-specific file (e.g. `CLAUDE.md`, `.cursorrules`) — gets a single-line pointer back to `AGENTS.md`. Auto-detected or specified via `--agent`. See [Agent auto-detection](#agent-auto-detection).

**Host project wiring** (unless `--no-package-json` or `--minimal`):
- Adds `@refrakt-md/cli` and `@refrakt-md/plan` to `devDependencies`, pinned to the version of `@refrakt-md/plan` running the command
- Adds a `plan` script that runs `refrakt plan`
- Never clobbers existing keys. Walks up to the install root, preferring workspace roots (`npm`/`yarn` workspaces, `pnpm-workspace.yaml`, `lerna.json`).

**Claude SessionStart hook** (when Claude is targeted and `--no-hooks`/`--minimal` are not set):
- `.claude/settings.json` gets a `SessionStart` hook that runs `install` if `node_modules/.bin/refrakt` isn't present. The hook detects the package manager at execution time by reading lockfiles (`bun.lockb`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`), so switching package managers later just works. Existing `settings.json` files are merged into, not replaced.

**Wrapper script** (unless `--no-wrapper` or `--minimal`):
- `./plan.sh` — POSIX shell wrapper for environments where hooks aren't available. Installs dependencies on first run, then defers to `npx refrakt plan`. Uses the `.sh` suffix because the content directory is also called `plan/`.

### Agent auto-detection

When `--agent` is omitted, `plan init` checks the project root for known instruction files (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`) and appends a pointer to `AGENTS.md` in each that exists. If none are found, it falls back to creating a `CLAUDE.md` pointer file and targeting Claude for the `SessionStart` hook.

### Idempotent re-runs

Every side effect is safe to repeat. Existing keys in `package.json`, existing hook commands in `.claude/settings.json`, and existing pointer markers in agent instruction files are detected and left alone. Running `plan init` on an already-initialized project prints `Plan structure already exists. No changes made.` and exits successfully.

## refrakt plan history

View the git-derived lifecycle history for a single entity or for the entire project. Every status transition, priority change, criteria check-off, and resolution is extracted from consecutive git commits.

### Single-entity mode

```bash
refrakt plan history WORK-024
refrakt plan history SPEC-038 --limit 10
refrakt plan history WORK-024 --format json
```

Shows a reverse-chronological timeline for a single entity: date, structured changes, and short commit hash.

```
WORK-024: Add knownSections to content model framework

Apr 12  status: ready → done                              a295513
        ☑ knownSections supported in the content model framework
        ☑ Work rune declares known sections with aliases
        ☑ Bug rune declares known sections with aliases
Apr 12  status: blocked → ready                            1676387
        priority: low → medium
Apr 10  source: +SPEC-003, +SPEC-021                       f262d7b
Apr 08  Created (blocked, low, moderate)                   da12420
```

### Global mode

```bash
refrakt plan history
refrakt plan history --limit 20
refrakt plan history --since 7d --type work --status done
```

Shows recent events across all entities, grouped by commit:

```
Apr 12  a295513  Mark all SPEC-037 work items done
        WORK-024  status: ready → done  (☑ 8/8 criteria)
        WORK-127  status: ready → done  (☑ 3/3 criteria)

Apr 12  1676387  Accept SPEC-037 and break into work items
        SPEC-037  status: draft → accepted
        WORK-127  Created (ready, high, simple)
```

### Options

| Flag | Description |
|------|-------------|
| `[id]` | Entity ID for single-entity mode. Omit for global feed. |
| `--dir <path>` | Plan directory (default: `plan/`) |
| `--limit <n>` | Maximum events/commits to show (default: `20`) |
| `--since <duration\|date>` | Time filter: `7d`, `30d`, or ISO date. Passed to `git log --since`. |
| `--type <types>` | Entity type filter: `work`, `spec`, `bug`, `decision` (comma-separated) |
| `--author <name>` | Filter by commit author (substring match) |
| `--status <status>` | Show only events where an entity transitioned to this status |
| `--all` | Include content-only events in global mode (omitted by default) |
| `--format json` | Output JSON instead of human-readable text |

### Event kinds

| Kind | Meaning |
|------|---------|
| `created` | Entity file first appeared |
| `attributes` | Tag attributes changed (status, priority, etc.) |
| `criteria` | Acceptance criteria checkboxes changed |
| `resolution` | A `## Resolution` section was added or modified |
| `content` | File changed but no structured diff detected |

## refrakt plan serve

Browse your plan as an interactive dashboard with hot reload.

```bash
refrakt plan serve
refrakt plan serve --port 4000 --open
```

### Options

| Flag | Description |
|------|-------------|
| `[directory]` | Plan directory (positional, default: `plan/`) |
| `--dir <path>` | Plan directory (named flag) |
| `--port <n>` | HTTP port (default: `3000`) |
| `--specs <dir>` | Separate specs directory |
| `--theme <name>` | Theme name (default: `auto`) |
| `--open` | Open browser automatically |

The dashboard shows an overview of all entities, milestone progress, and links to individual entity pages. File changes trigger automatic reload.

## refrakt plan build

Generate a static HTML site from your plan.

```bash
refrakt plan build
refrakt plan build --out dist/plan --base-url /plan/
```

### Options

| Flag | Description |
|------|-------------|
| `[directory]` | Plan directory (positional, default: `plan/`) |
| `--dir <path>` | Plan directory (named flag) |
| `--out <dir>` | Output directory (default: `./plan-site`) |
| `--specs <dir>` | Separate specs directory |
| `--theme <name>` | Theme name (default: `auto`) |
| `--base-url <url>` | Base URL for the site (default: `/`) |

## Environment variables

| Variable | Description |
|----------|-------------|
| `REFRAKT_PLAN_DIR` | Default plan directory, overridden by `--dir` |

## JSON output

All commands support `--format json` for machine-readable output. This is useful for scripting, CI pipelines, and AI tool integration.
