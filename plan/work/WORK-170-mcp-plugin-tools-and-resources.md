{% work id="WORK-170" status="draft" priority="high" complexity="moderate" tags="mcp, plugins, plan" source="SPEC-043" milestone="v0.11.0" %}

# MCP plugin tools (via discovery) and resources

Wire plugin-contributed tools (notably the `@refrakt-md/plan` commands) into the MCP server via `discoverPlugins()`, and implement the read-only resources (`refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>`, `refrakt://plan/*`) so agents that prefer pull semantics have first-class URIs.

## Acceptance Criteria

- [ ] On startup, the MCP server calls `discoverPlugins()` and registers each plugin command as `<namespace>.<name>` (e.g., `plan.next`, `plan.update`)
- [ ] When a command declares `mcpHandler`, the server invokes it directly with the parsed input
- [ ] When a command does not declare `mcpHandler` (legacy plugins), the server falls back to argv-shimming: serializing the input object into argv strings and calling the standard `handler`
- [ ] Tool input schemas come from the command's `inputSchema`; commands without one get a generic `{ type: 'object', additionalProperties: true }` schema and the description from the command
- [ ] Resources implemented: `refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>` (with optional `?attr=value` query), `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, `refrakt://plan/status`
- [ ] Plan resources are only exposed when a plan context is detected
- [ ] Site-scoped resources (`refrakt://contracts`, `refrakt://rune/<name>`) work in single-site mode; multi-site requires an explicit `site=` query parameter or returns a structured error
- [ ] Tests cover: plugin tool registration with and without `mcpHandler`, argv-shim correctness, each resource URI's read behavior, multi-site resource ambiguity error

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

{% /work %}
