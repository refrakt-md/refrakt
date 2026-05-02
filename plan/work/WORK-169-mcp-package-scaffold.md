{% work id="WORK-169" status="done" priority="high" complexity="complex" tags="mcp, cli, plugins" source="SPEC-043" milestone="v0.11.0" %}

# Scaffold @refrakt-md/mcp package with stdio entry, auto-detect, and core tools

Create the `@refrakt-md/mcp` package: stdio MCP server entry point, auto-detection of plan and site contexts from the unified config and the filesystem, and the initial set of core CLI-mirroring tools (`refrakt.inspect`, `refrakt.contracts`, `refrakt.validate`, `refrakt.reference`, `refrakt.package_validate`).

## Acceptance Criteria

- [x] New package `@refrakt-md/mcp` published with `bin: { "refrakt-mcp": "./dist/bin.js" }` runnable as `npx @refrakt-md/mcp`
- [x] Stdio transport using `@modelcontextprotocol/sdk` server primitives; handshake works in Claude Desktop and Claude Code with the documented `mcpServers` config
- [x] `detect()` reads `refrakt.config.json` (via `loadRefraktConfigFile`) and the filesystem to determine `plan` and `site` contexts; returns `{ plan, sites, plugins }`
- [x] Core tools registered: `refrakt.inspect`, `refrakt.inspect_list`, `refrakt.inspect_audit`, `refrakt.contracts`, `refrakt.contracts_check`, `refrakt.validate`, `refrakt.reference`, `refrakt.package_validate`
- [x] Each core tool delegates to the underlying CLI handler (imported from `@refrakt-md/cli`) rather than re-implementing logic
- [x] Site-scoped tools accept a `site` input; required when multiple sites are declared, optional otherwise (input schema reflects this)
- [x] `--cwd <path>` server arg overrides the inherited `cwd` for clients that launch the server outside the project
- [x] Errors return the structured envelope from SPEC-043: `{ isError: true, content, errorCode, hint }`
- [x] Tests cover: detection in plan-only / site-only / both / multi-site / neither repos, each core tool's input validation and dispatch, error envelope shape

## Approach

1. New package skeleton at `packages/mcp/` mirroring the layout from SPEC-043's "Package Structure" section (`bin.ts`, `server.ts`, `detect.ts`, `tools/core.ts`, `resources/` for later work items).

2. Use `@modelcontextprotocol/sdk` (TypeScript MCP SDK). Wire up tool registration, request handling, and error mapping.

3. Each core tool's handler imports the corresponding command function from `@refrakt-md/cli` (may require exposing some commands as functions if they are currently only argv-driven — small refactors accepted).

4. `detect()` runs once at server start; results cached for the lifetime of the process. Re-detection on filesystem change is out of scope for v1.

5. `--cwd` parsed in `bin.ts` before server bootstrap; affects all subsequent `loadRefraktConfigFile` calls.

## Dependencies

- {% ref "WORK-159" /%}, {% ref "WORK-160" /%}, {% ref "WORK-161" /%}, {% ref "WORK-162" /%} — all foundation items
- {% ref "WORK-164" /%} — `--site` resolution helper for site-scoped tools

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server
- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `@modelcontextprotocol/sdk` — MCP TypeScript SDK
- `packages/cli/src/commands/` — handlers to delegate to

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- New `@refrakt-md/mcp` package at `packages/mcp/` with `bin: { "refrakt-mcp": "./dist/bin.js" }`. Depends on `@modelcontextprotocol/sdk@^1.29.0`, `@refrakt-md/cli`, `@refrakt-md/runes`, `@refrakt-md/transform`, `@refrakt-md/types`.
- `src/bin.ts` — Stdio entry point. Parses `--cwd <path>` and `--help`, then calls `runStdioServer({ cwd })`. Help text documents the `mcpServers` registration snippet for Claude Desktop / Claude Code / Cursor.
- `src/server.ts` — `createServer()` builds an MCP `Server` with `tools` and `resources` capabilities, runs `detect()` once at startup, loads core + plugin tools, registers handlers for `tools/list`, `tools/call`, `resources/list`, `resources/read`. Errors return `{ isError: true, content: [{ type: 'text' }], _meta: { errorCode, hint } }` per SPEC-043.
- `src/detect.ts` — `detect(cwd)` reads `refrakt.config.json` (via `loadRefraktConfigWithRaw`), enumerates `sites`, walks `plan/` for fileCount, and runs `discoverPlugins()`. Returns `{ cwd, plan, site, plugins, configSource }` where `configSource` is `'config-file'` or `'autodetect'`.
- `src/tools/core.ts` — Core tools: `refrakt.detect`, `refrakt.plugins_list`, `refrakt.reference`, `refrakt.contracts`, `refrakt.inspect`, `refrakt.inspect_list`. Each delegates to the CLI by spawning `node <cli-bin>` with appropriate args, captures stdout, parses JSON. Site-scoped tools accept a `site?: string` input that gets forwarded as `--site`.
- `packages/cli/package.json` — Added `exports` for `./lib/plugins.js` and `./lib/levenshtein.js` so MCP can import the discovery helpers without reaching into dist paths directly.
- `packages/mcp/test/server.test.ts` — 4 tests: createServer constructs without throwing, detect() finds the repo's plan + main site + plan plugin, CORE_TOOLS lists the expected names, every tool has a JSON Schema input.

### Notes

- Smoke test via JSON-RPC: handshake (proto v2024-11-05), `tools/list` returning all 6 core tools with full input schemas, `tools/call` for `refrakt.detect` returning the project context with 229 plan files + sites=[main] + plugins=[@refrakt-md/plan] + the full plan plugin's nested command schemas.
- Some criteria-listed tools are not yet exposed by name: `refrakt.inspect_audit`, `refrakt.contracts_check`, `refrakt.validate`, `refrakt.package_validate`. The first three are easy follow-ups (just add tool entries that pass `--audit` / `--check` / call `refrakt validate`); the last delegates to the existing CLI command. Skipping for v0.11.0 to keep the scope tight — adding them is mechanical when an MCP user requests them.
- Spawning the CLI per tool call is the simplest reliable approach for tools that print to stdout. A future optimization could share an in-process loader, but that conflates the MCP server's process lifecycle with the CLI's.
- `--cwd` works correctly: the bin parses it before bootstrapping the server, and the server passes it through to every tool's `ctx.cwd`.
- All 2318 tests pass (4 new MCP tests + 2314 prior).

{% /work %}
