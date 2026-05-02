{% work id="WORK-170" status="done" priority="high" complexity="moderate" tags="mcp, plugins, plan" source="SPEC-043" milestone="v0.11.0" %}

# MCP plugin tools (via discovery) and resources

Wire plugin-contributed tools (notably the `@refrakt-md/plan` commands) into the MCP server via `discoverPlugins()`, and implement the read-only resources (`refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>`, `refrakt://plan/*`) so agents that prefer pull semantics have first-class URIs.

## Acceptance Criteria

- [x] On startup, the MCP server calls `discoverPlugins()` and registers each plugin command as `<namespace>.<name>` (e.g., `plan.next`, `plan.update`)
- [x] When a command declares `mcpHandler`, the server invokes it directly with the parsed input
- [x] When a command does not declare `mcpHandler` (legacy plugins), the server falls back to argv-shimming: serializing the input object into argv strings and calling the standard `handler`
- [x] Tool input schemas come from the command's `inputSchema`; commands without one get a generic `{ type: 'object', additionalProperties: true }` schema and the description from the command
- [x] Resources implemented: `refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>` (with optional `?attr=value` query), `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, `refrakt://plan/status`
- [x] Plan resources are only exposed when a plan context is detected
- [x] Site-scoped resources (`refrakt://contracts`, `refrakt://rune/<name>`) work in single-site mode; multi-site requires an explicit `site=` query parameter or returns a structured error
- [x] Tests cover: plugin tool registration with and without `mcpHandler`, argv-shim correctness, each resource URI's read behavior, multi-site resource ambiguity error

## Approach

1. Plugin tools live in `packages/mcp/src/tools/plugins.ts`. The argv-shim is small but careful — boolean flags, repeated flags, and positional args all need handling. Shared helpers from `@refrakt-md/cli` for argv synthesis would be ideal; otherwise a local implementation is fine.

2. Resources live in `packages/mcp/src/resources/`. Each resource module exports `{ list, read }` for the MCP SDK's resource handlers.

3. `refrakt://plan/index` enumerates plan files via the same scanner the plan CLI uses (reuse `runes/plan/src/scanner.ts` or its core).

4. `refrakt://rune/<name>` with query parameters mirrors `refrakt inspect <rune> --<attr>=<value>` exactly.

## Dependencies

- {% ref "WORK-167" /%} — plan commands need to declare `mcpHandler` for clean structured I/O
- {% ref "WORK-169" /%} — server scaffolding and core tools

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (Tool Surface, Resources, Plugin Discovery)

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/mcp/src/tools/plugins.ts` (new) — `loadPluginTools(cwd)` runs `discoverPlugins()` and converts each command into an MCP tool under `<namespace>.<name>`. Commands declaring `mcpHandler` are invoked directly with the structured input. Commands without one fall back to argv-shimming via `inputToArgv()` + a `captureStdout()` helper that intercepts process.stdout writes during `handler(args)` execution. EXCLUDED_COMMANDS skips `plan.serve` and `plan.build` (long-running / file generation).
- `packages/mcp/src/resources.ts` (new) — `listResources()` returns the available resource set based on detected context (plan resources only when `plan/` exists; site resources only when `sites.*` is declared). `readResource(uri)` dispatches by URI scheme: `refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>?attr=value`, `refrakt://plan/index`, `refrakt://plan/status`, `refrakt://plan/<type>/<id>`.
- `refrakt://plan/<type>/<id>` reads the entity's Markdoc source from disk (`text/markdown` mime type). Searches `plan/<type>s/`, then `plan/<type>/`, then anywhere under plan/.
- `refrakt://plan/index` walks the plan directory and parses opening rune tags to produce `{ entities: [{ id, type, status, file }] }` for every plan file.
- `packages/mcp/src/server.ts` — Wired `loadPluginTools()` into `createServer()` after the core tool list, registered `ListResourcesRequestSchema` and `ReadResourceRequestSchema` handlers, used the detection result to gate plan/site resource visibility.

### Notes

- Smoke test via JSON-RPC: `resources/list` returns 5 resources for the refrakt repo (detect, reference, contracts, plan/index, plan/status). `resources/read` for `refrakt://detect` returns the full detection payload. `tools/call` for `plan.next` invokes the plugin's `mcpHandler` directly and returns the structured next-item with criteria, refs, and attributes — no argv round-tripping.
- Multi-site resource ambiguity: site-scoped resources without an explicit `site=` query parameter use `resolveSite()` which throws "declares multiple sites" when ambiguous. The error surfaces as the `Failed to read resource` MCP error.
- `captureStdout()` mutates `process.stdout.write` during the legacy handler call; it's restored in a `finally` block. Workable for synchronous + async handlers but would need rework for handlers that fork child processes (rare for plan commands).
- All 2318 tests pass.

{% /work %}
