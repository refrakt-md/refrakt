{% work id="WORK-161" status="draft" priority="high" complexity="simple" tags="cli, plugins, mcp, foundation" source="SPEC-043" milestone="v0.11.0" %}

# Extend CliPluginCommand with inputSchema/outputSchema/mcpHandler

Add three optional fields to the `CliPluginCommand` interface so plugin commands can declare structured input/output schemas and an MCP-friendly handler that bypasses argv parsing. Existing plugins keep working unchanged — the fields are purely additive.

## Acceptance Criteria

- [ ] `CliPluginCommand` in `@refrakt-md/types` gains `inputSchema?: JSONSchema7`, `outputSchema?: JSONSchema7`, and `mcpHandler?: (input: unknown) => Promise<unknown>` fields
- [ ] All three fields are optional; existing plugins compile and run without modification
- [ ] JSDoc on each field documents its role: `inputSchema` for MCP tool input validation, `outputSchema` for structured output declaration, `mcpHandler` for direct structured invocation that bypasses argv parsing
- [ ] Type-level test asserts that a plugin without these fields still satisfies the interface
- [ ] `JSONSchema7` type imported from `@types/json-schema` (already a likely transitive dep; add directly if not)

## Approach

1. Locate the current `CliPluginCommand` declaration. Today it lives inline in `packages/cli/src/bin.ts`; promote it to a shared type in `@refrakt-md/types` and re-export from there.

2. Add the three optional fields with JSDoc.

3. Update `packages/cli/src/bin.ts` to import the shared type instead of declaring its own.

4. Update `runes/plan/src/cli-plugin.ts` to import the shared type for type-checking purposes (no runtime change in this work item).

## Dependencies

- None. Pure type additions.

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (Plugin Contract Extension section)
- `packages/cli/src/bin.ts` — current `CliPluginCommand` declaration
- `runes/plan/src/cli-plugin.ts` — first plugin to consume the extended type

{% /work %}
