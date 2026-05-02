---
title: MCP Server Overview
description: Run the refrakt CLI as a Model Context Protocol server so AI agents can call refrakt operations through typed tools and structured I/O.
---

# MCP Server Overview

`@refrakt-md/mcp` is a Model Context Protocol server that wraps the refrakt CLI. AI agents that speak MCP (Claude Desktop, Claude Code, Cursor, and others) can register the server once and then call refrakt operations through typed tools and read project state through addressable resources — without shelling out and parsing text.

## What it provides

The server exposes two surfaces:

| Surface | Purpose |
|---------|---------|
| **Tools** | Actions the agent invokes: inspect a rune, generate contracts, list plugins, run plan commands. Inputs are validated against published JSON Schemas. |
| **Resources** | Read-only addressable data: `refrakt://detect`, `refrakt://contracts`, `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, etc. Agents fetch these by URI without consuming a tool slot. |

## Auto-detection

The server runs `detect()` once at startup and adapts to your project:

- **Plan present** (a `plan/` directory exists): plan tools (`plan.next`, `plan.update`, `plan.create`, …) are exposed alongside plan resources (`refrakt://plan/index`, `refrakt://plan/status`, `refrakt://plan/<type>/<id>`).
- **Sites present** (`refrakt.config.json` declares `site` or `sites`): site-scoped tools (`refrakt.inspect`, `refrakt.contracts`, `refrakt.reference`) and resources (`refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>`) are exposed.
- **Both present**: both groups active.
- **Neither**: only the diagnostic `refrakt.detect` and `refrakt.plugins_list` tools are available.

The detection result is itself exposed as `refrakt://detect` so an agent can ask "what is this project?" before deciding what to do.

## Excluded commands

Some commands are intentionally not exposed via MCP because they don't fit the request/response model:

- `refrakt plan serve` — long-running dev server.
- `refrakt plan build` — multi-file static site generation.
- `refrakt write`, `refrakt edit`, `refrakt scaffold-css` — interactive or large filesystem writes.

These remain available via the CLI; agents that need them shell out the old way.

## Why use it?

Three reasons over plain CLI invocation:

1. **Typed inputs.** Each tool ships a JSON Schema describing its inputs. Agents see `status` enum values, `priority` enum values, required fields, etc. without reading prose docs.
2. **Structured outputs.** Plan commands return their data as objects via `mcpHandler` rather than printing to stdout; agents skip text parsing entirely.
3. **Discovery.** `refrakt://detect` and `refrakt.plugins_list` give agents a structured view of the project's available capabilities.

## Next steps

- [Installation](/docs/mcp/installation) — registering the server with Claude Desktop / Claude Code / Cursor.
- [Tools](/docs/mcp/tools) — full reference for the tool surface.
- [Resources](/docs/mcp/resources) — read-only URI scheme.
- [Errors](/docs/mcp/errors) — error envelope and `errorCode` values.
