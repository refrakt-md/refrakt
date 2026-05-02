---
title: Errors
description: Error envelope shape and error codes returned by the MCP server.
---

# Errors

MCP tools and resources return structured errors that AI agents can react to programmatically rather than parsing text.

## Tool error envelope

When a tool invocation fails, the response carries `isError: true` and a `_meta` object with an error code and optional hint:

```json
{
  "isError": true,
  "content": [
    { "type": "text", "text": "Plan directory not found at ./plan" }
  ],
  "_meta": {
    "errorCode": "PLAN_DIR_MISSING",
    "hint": "Run plan.init to scaffold the plan/ directory"
  }
}
```

Agents should:

1. Read `_meta.errorCode` to decide programmatic next steps.
2. Surface `_meta.hint` (if present) to the user.
3. Use `content[0].text` as the human-readable message.

## Resource error envelope

Resource reads that fail throw a standard MCP error rather than returning an envelope. The error message includes the URI and a description of what went wrong:

```
Failed to read resource: plan entity WORK-999 not found (refrakt://plan/work/WORK-999)
```

## Error codes

| Code | Source | Meaning | Typical hint |
|------|--------|---------|--------------|
| `UNKNOWN_TOOL` | Server | The tool name doesn't exist. | Lists available tools. |
| `TOOL_FAILED` | Tool handler | Generic catch-all for unexpected handler exceptions. | The error message text. |
| `CLI_INVOCATION_FAILED` | Core tool | The underlying CLI process exited non-zero. | The CLI's stderr output. |
| `PLAN_DIR_MISSING` | Plan resource/tool | A plan operation was requested but no `plan/` directory is configured or detected. | "Run `plan.init` to scaffold the plan/ directory." |
| `SITE_CONFIG_MISSING` | Site resource/tool | A site-scoped operation was requested but `refrakt.config.json` declares no sites. | "Add a `site` or `sites` section to refrakt.config.json." |
| `RESOURCE_FAILED` | Resource read | A resource read failed for a non-MCP reason (file not found, parse error). | The specific error message. |

## Multi-site ambiguity

When a site-scoped tool or resource is invoked on a multi-site project without an explicit site name, the server returns a `TOOL_FAILED` (or `RESOURCE_FAILED`) error with a message like:

```
refrakt.config.json declares multiple sites ("main", "blog"). Pass an explicit site name.
```

The hint includes the available site names. Agents should pick one and re-call.

## Unknown site name

When the requested site doesn't exist, the error message includes a "did you mean?" suggestion (Levenshtein distance ≤ 2):

```
Site "maim" is not declared in refrakt.config.json. Available: "main", "blog". Did you mean "main"?
```

## Patterns for agent recovery

A common pattern is to call `refrakt.detect` first to learn the project context, then choose tools based on what's available:

1. Call `refrakt.detect` → see `result.site.sites` (e.g., `["main", "blog"]`) and `result.plan` (e.g., `{ dir, fileCount }`).
2. Pick a site if there are multiple.
3. Make the actual call with the correct site argument.

For plan operations, check `result.plan !== null` before calling plan tools — saves a round-trip through a `PLAN_DIR_MISSING` error.
