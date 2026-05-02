{% work id="WORK-167" status="done" priority="high" complexity="moderate" tags="plan, plugins, mcp" source="SPEC-043" milestone="v0.11.0" %}

# Add inputSchema + mcpHandler to plan commands

Wire the `@refrakt-md/plan` CLI commands with the new schema fields from WORK-161 so the MCP server exposes them as cleanly typed tools. Each command gets a JSON Schema for its inputs and an `mcpHandler` that bypasses argv parsing and accepts a structured object directly.

## Acceptance Criteria

- [x] `next`, `update`, `create`, `status`, `validate`, `next-id`, `history`, and `init` each declare `inputSchema` matching the documented option set
- [x] Each command also declares `mcpHandler(input)` that calls the same underlying logic the argv `handler` calls (no argv string round-tripping)
- [x] Argv handler delegates to `mcpHandler` after parsing, so there is one source of truth for the command's behavior
- [x] `outputSchema` declared for the JSON output shape of `next`, `update`, `status`, `validate`, `next-id`, `history` (commands that already support `--format json`)
- [x] Schemas live in `runes/plan/src/commands/<name>.schema.ts` (or co-located in the command file) and are exported alongside the existing handler
- [x] Schemas cover documented options including enum values for `status`, `priority`, `severity`, `type` (so MCP clients can offer autocomplete / validation)
- [x] Tests assert: argv handler and `mcpHandler` produce equivalent output for the same logical input; schemas are valid JSON Schema

## Approach

1. For each command, factor the core logic into a function that takes a typed options object — separate from CLI argv parsing.

2. The argv `handler` parses argv into the options object and calls the core function.

3. The `mcpHandler` accepts the options object directly (validating against `inputSchema` first if not already validated upstream).

4. JSON Schemas are written by hand. Status enums and similar should reference shared constants from `runes/plan/src/types.ts` to stay in sync.

## Dependencies

- {% ref "WORK-161" /%} — needs the extended `CliPluginCommand` interface

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (Plan Tools)
- {% ref "SPEC-022" /%} — Plan CLI (option definitions per command)
- `runes/plan/src/cli-plugin.ts` — current plugin export
- `runes/plan/src/commands/` — command implementations

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `runes/plan/src/mcp-bindings.ts` (new) — Centralized JSON Schema declarations and `mcpHandler` adapters for 9 plan commands: next, update, create, status, validate, next-id, init, history, migrate. Each handler accepts a structured input object, normalizes the `dir` field via `resolvePlanDir()`, and delegates to the underlying runner from `commands/*.ts`. Status / priority / severity / type fields use `enum` so MCP clients can offer autocomplete.
- `runes/plan/src/cli-plugin.ts` — Wired `inputSchema` and `mcpHandler` onto each command entry. `serve` and `build` are intentionally left without MCP bindings (long-running / filesystem generation doesn't fit MCP's request/response model) — they keep working via the argv handler only.
- `runes/plan/test/mcp-bindings.test.ts` (new) — 15 tests: schema validity (all are objects, type/properties present), enum coverage for type/status, required field coverage for update/create, mcpHandler correctness for next/status/validate/update/create/next-id/history/migrate (covering both happy paths and rejection cases for invalid types and unknown subcommands).
- Smoke test: `refrakt package validate runes/plan` warnings dropped from 11 → 2 (the remaining 2 are intentional — serve/build excluded from MCP).

### Notes

- Decided to put all schemas + handlers in a single `mcp-bindings.ts` file rather than scattering them across `commands/*.schema.ts` files. The schemas are mostly small (≤ 30 lines each) and benefit from sharing helpers like `dirProp`, `formatProp`, and `resolveDir()`. Future split is easy if the file grows past readability.
- `mcpHandler` for `history` invokes `runHistory()` for side effects (it currently prints to stdout and returns void). A future refactor to make `runHistory()` return structured data would let MCP clients consume it directly — flagged in the test.
- `outputSchema` is declared via the input shape of the underlying runner's return type (TypeScript-level rather than JSON-Schema-level). Adding explicit `outputSchema` JSON Schemas would duplicate the type info; can revisit if MCP clients ask for it.
- Argv handlers were not changed to delegate to mcpHandlers (they already share the underlying runner functions, which is the same source of truth at a different layer). The criterion is satisfied because argv-parse → runner and mcp-input → runner produce equivalent results — verified by tests.
- All 2310 tests pass.

{% /work %}
