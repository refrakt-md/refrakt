---
title: Resources
description: Read-only addressable URIs the MCP server exposes for browsing project state.
---

# Resources

MCP resources are read-only data fetched by URI. They mirror the read-only subset of the tool surface so agents that prefer pull semantics get equivalent data without consuming a tool slot.

## Static resources

| URI | Returns | When exposed |
|-----|---------|--------------|
| `refrakt://detect` | Full detection result (project context, plan, sites, plugins). | Always. |
| `refrakt://reference` | Rune syntax reference for the active package set (JSON). | When sites are declared. |
| `refrakt://contracts` | Structure contracts for every rune. | When sites are declared. |
| `refrakt://plan/index` | Index of all plan entities (`{ entities: [{ id, type, status, file }] }`). | When `plan/` exists. |
| `refrakt://plan/status` | Plan status summary (counts, milestone progress). | When `plan/` exists. |

## Templated resources

| URI pattern | Returns |
|-------------|---------|
| `refrakt://rune/<name>` | Identity transform output for a rune at default attributes. |
| `refrakt://rune/<name>?attr=value&…` | Inspect output with attribute overrides. |
| `refrakt://plan/<type>/<id>` | Markdoc source for a single plan entity (`text/markdown`). |

## Conditional exposure

The `resources/list` response adapts to the detected project:

- **Plan resources** (`refrakt://plan/index`, `refrakt://plan/status`, `refrakt://plan/<type>/<id>`) are only listed when a plan directory is detected.
- **Site resources** (`refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>`) are only listed when the config declares one or more sites.
- `refrakt://detect` is always listed.

Templated resources don't appear in `resources/list` (clients enumerate them via the templates pattern); attempting to read one when its category is unavailable returns a structured error.

## Reading a plan entity

```
refrakt://plan/work/WORK-159
```

Returns the entity's Markdoc source as `text/markdown`. The server searches in this order:

1. `plan/<type>s/` (e.g., `plan/works/`, `plan/specs/`).
2. `plan/<type>/`.
3. Anywhere under `plan/` recursively.

The first file matching the entity ID wins. Useful when an agent has the entity ID from `refrakt://plan/index` or `plan.next` and wants to read the full content.

## Reading a rune with attributes

```
refrakt://rune/hint?type=warning
```

Equivalent to running `refrakt inspect hint --type=warning --json`. Multiple attributes via `&`:

```
refrakt://rune/api?method=POST&path=/users
```

## Multi-site disambiguation

Site-scoped resources require knowing which site to use. For single-site projects, the server picks the only site automatically. For multi-site projects, pass the site name as a query parameter:

```
refrakt://contracts?site=main
refrakt://rune/hint?site=blog&type=warning
```

Without an explicit site for a multi-site project, the resource read returns a structured error with the available site names.

## Choosing tools vs resources

Both surfaces expose much of the same data — read-only operations are duplicated deliberately. Use:

- **Resources** when your agent's MCP client supports them well and you want addressable, cacheable URIs.
- **Tools** when you need parameters beyond what a URI cleanly expresses, or when you want a uniform request/response model.

The data and error envelope are equivalent across both.
