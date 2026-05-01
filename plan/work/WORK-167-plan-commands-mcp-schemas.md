{% work id="WORK-167" status="draft" priority="high" complexity="moderate" tags="plan, plugins, mcp" source="SPEC-043" milestone="v0.11.0" %}

# Add inputSchema + mcpHandler to plan commands

Wire the `@refrakt-md/plan` CLI commands with the new schema fields from WORK-161 so the MCP server exposes them as cleanly typed tools. Each command gets a JSON Schema for its inputs and an `mcpHandler` that bypasses argv parsing and accepts a structured object directly.

## Acceptance Criteria

- [ ] `next`, `update`, `create`, `status`, `validate`, `next-id`, `history`, and `init` each declare `inputSchema` matching the documented option set
- [ ] Each command also declares `mcpHandler(input)` that calls the same underlying logic the argv `handler` calls (no argv string round-tripping)
- [ ] Argv handler delegates to `mcpHandler` after parsing, so there is one source of truth for the command's behavior
- [ ] `outputSchema` declared for the JSON output shape of `next`, `update`, `status`, `validate`, `next-id`, `history` (commands that already support `--format json`)
- [ ] Schemas live in `runes/plan/src/commands/<name>.schema.ts` (or co-located in the command file) and are exported alongside the existing handler
- [ ] Schemas cover documented options including enum values for `status`, `priority`, `severity`, `type` (so MCP clients can offer autocomplete / validation)
- [ ] Tests assert: argv handler and `mcpHandler` produce equivalent output for the same logical input; schemas are valid JSON Schema

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

{% /work %}
