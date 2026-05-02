{% work id="WORK-161" status="done" priority="high" complexity="simple" tags="cli, plugins, mcp, foundation" source="SPEC-043" milestone="v0.11.0" %}

# Extend CliPluginCommand with inputSchema/outputSchema/mcpHandler

Add three optional fields to the `CliPluginCommand` interface so plugin commands can declare structured input/output schemas and an MCP-friendly handler that bypasses argv parsing. Existing plugins keep working unchanged — the fields are purely additive.

## Acceptance Criteria

- [ ] `CliPluginCommand` in `@refrakt-md/types` gains `inputSchema?: JSONSchema7`, `outputSchema?: JSONSchema7`, and `mcpHandler?: (input: unknown) => Promise<unknown>` fields
- [ ] All three fields are optional; existing plugins compile and run without modification
- [ ] JSDoc on each field documents its role: `inputSchema` for MCP tool input validation, `outputSchema` for structured output declaration, `mcpHandler` for direct structured invocation that bypasses argv parsing
- [ ] Type-level test asserts that a plugin without these fields still satisfies the interface
- [x] `JSONSchema7` type imported from `@types/json-schema` (already a likely transitive dep; add directly if not)

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

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/types/src/cli-plugin.ts` (new) — Promotes `CliPluginCommand` and `CliPlugin` to shared types in `@refrakt-md/types`. Adds optional `inputSchema?: JSONSchema7`, `outputSchema?: JSONSchema7`, and `mcpHandler?: (input) => Promise<unknown>` fields to `CliPluginCommand`. Each field is JSDoc-annotated explaining its role for MCP. Re-exports `JSONSchema7` from `json-schema` so consumers don't need to install `@types/json-schema` themselves.
- `packages/types/src/index.ts` — Exports `CliPlugin`, `CliPluginCommand`, and `JSONSchema7`.
- `packages/types/package.json` — Added `@types/json-schema` as a runtime dependency so tsc can resolve the imported types in published `.d.ts` output.
- `packages/cli/src/bin.ts` — Removed inline `CliPluginCommand` and `CliPlugin` interfaces; now imports from `@refrakt-md/types`.
- `runes/plan/src/cli-plugin.ts` — Same swap; uses the shared types instead of duplicating them.
- `packages/types/test/cli-plugin.test.ts` (new) — 6 type-level tests via `expectTypeOf`: legacy minimal shape, extended shape with all schemas + mcpHandler, fields stay optional, sync vs async handler, `CliPlugin` shape with optional description, JSONSchema7 re-export.

### Notes

- `@types/json-schema` is a `dependencies` (not `devDependencies`) entry on `@refrakt-md/types` because the published `.d.ts` references the type. Type-only at runtime — no JS bundle impact.
- The interfaces are intentionally additive — pre-v0.11.0 plugins (`CliPluginCommand` with only `name`/`description`/`handler`) continue to satisfy the type without changes.
- All 2240 existing tests still pass.

{% /work %}
