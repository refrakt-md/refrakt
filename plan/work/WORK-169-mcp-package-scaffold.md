{% work id="WORK-169" status="draft" priority="high" complexity="complex" tags="mcp, cli, plugins" source="SPEC-043" milestone="v0.11.0" %}

# Scaffold @refrakt-md/mcp package with stdio entry, auto-detect, and core tools

Create the `@refrakt-md/mcp` package: stdio MCP server entry point, auto-detection of plan and site contexts from the unified config and the filesystem, and the initial set of core CLI-mirroring tools (`refrakt.inspect`, `refrakt.contracts`, `refrakt.validate`, `refrakt.reference`, `refrakt.package_validate`).

## Acceptance Criteria

- [ ] New package `@refrakt-md/mcp` published with `bin: { "refrakt-mcp": "./dist/bin.js" }` runnable as `npx @refrakt-md/mcp`
- [ ] Stdio transport using `@modelcontextprotocol/sdk` server primitives; handshake works in Claude Desktop and Claude Code with the documented `mcpServers` config
- [ ] `detect()` reads `refrakt.config.json` (via `loadRefraktConfigFile`) and the filesystem to determine `plan` and `site` contexts; returns `{ plan, sites, plugins }`
- [ ] Core tools registered: `refrakt.inspect`, `refrakt.inspect_list`, `refrakt.inspect_audit`, `refrakt.contracts`, `refrakt.contracts_check`, `refrakt.validate`, `refrakt.reference`, `refrakt.package_validate`
- [ ] Each core tool delegates to the underlying CLI handler (imported from `@refrakt-md/cli`) rather than re-implementing logic
- [ ] Site-scoped tools accept a `site` input; required when multiple sites are declared, optional otherwise (input schema reflects this)
- [ ] `--cwd <path>` server arg overrides the inherited `cwd` for clients that launch the server outside the project
- [ ] Errors return the structured envelope from SPEC-043: `{ isError: true, content, errorCode, hint }`
- [ ] Tests cover: detection in plan-only / site-only / both / multi-site / neither repos, each core tool's input validation and dispatch, error envelope shape

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

{% /work %}
