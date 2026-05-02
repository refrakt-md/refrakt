---
title: Plan Configuration
description: The `plan` section — controlling where plan content lives.
---

# Plan Configuration

The `plan` section configures the plan-management directory used by `@refrakt-md/plan`. Currently it has one field; more may be added as needs emerge.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dir` | `string` | `"plan"` | Plan directory, relative to project root. |

```json
{
  "plan": {
    "dir": "plan"
  }
}
```

## Resolution order

Plan commands resolve the active plan directory through this precedence chain (highest first):

1. **CLI flag** — `--dir <path>` passed to a plan command.
2. **Environment variable** — `REFRAKT_PLAN_DIR`.
3. **Config field** — `plan.dir` from `refrakt.config.json`.
4. **Default** — `./plan`.

The first match wins. This means a `--dir` flag always overrides the config, and the env var is reserved for ad-hoc overrides (CI scripts, test harnesses).

## When `plan init` writes the section

`refrakt plan init` is the canonical way to scaffold the plan structure. It also takes care of `refrakt.config.json`:

- **Config absent** → creates `refrakt.config.json` with `{ "plan": { "dir": <relativeDir> } }`.
- **Config exists, no `plan` section** → adds the section in place, preserving the existing JSON indentation.
- **Config exists, `plan` already declared** → leaves it untouched and logs that the section was preserved.

Pass `--no-config` to opt out of config scaffolding entirely.

## Plan-only repos

A planning-only repo can either skip `refrakt.config.json` entirely (autodetect picks up `plan/`), or write a minimal config with just the `plan` section:

```json
{
  "plan": {
    "dir": "plan"
  }
}
```

The latter is what `refrakt plan init` produces by default. It enables MCP detection to report a `config-file` source rather than `autodetect`, and lets you customize the directory location.

## Custom plan directories

If your repo organizes content differently — say, planning content lives under `project/plan/` — declare it explicitly:

```json
{
  "plan": {
    "dir": "project/plan"
  }
}
```

All plan commands (`refrakt plan next`, `refrakt plan update`, `refrakt plan status`, …) will resolve to that directory.

## Specs path

The plan section currently exposes only `dir`. Specs live as a child folder of the plan directory by convention (e.g., `plan/specs/`); surfacing the specs path as a separate config field can be added if real-world projects need it. For now, customize via the CLI's `--specs <path>` flag where commands accept it.
