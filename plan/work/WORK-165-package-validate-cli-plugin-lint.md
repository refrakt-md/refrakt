{% work id="WORK-165" status="draft" priority="low" complexity="simple" tags="cli, plugins, validation" source="SPEC-043" milestone="v0.11.0" %}

# Lint cli-plugin shape in `refrakt package validate`

Add a lint pass to `refrakt package validate` that checks a package's `cli-plugin` export for structural issues — missing namespace, missing descriptions, malformed `inputSchema`, namespace conflicts with already-installed plugins. Catches problems at package-publish time rather than at runtime when the MCP server tries to advertise the broken tool.

## Acceptance Criteria

- [ ] `refrakt package validate <pkg>` runs the existing checks plus a new "cli-plugin" pass when the package exposes a `cli-plugin` export
- [ ] Errors: missing `namespace`, missing `commands` array, command without `name`, command without `description`, command without `handler`
- [ ] Errors: `inputSchema` present but not a valid JSON Schema (per a lightweight check using `ajv` or similar)
- [ ] Warnings: command has no `inputSchema` (recommended for MCP exposure), command has no `mcpHandler` (recommended for clean structured I/O)
- [ ] Warnings: namespace clashes with another installed plugin in the current project
- [ ] Lint output integrated into the existing `package validate` text and JSON formats
- [ ] Tests cover: valid plugin (no findings), each error case, each warning case

## Approach

1. Extend `packages/cli/src/commands/package-validate.ts` with a `validateCliPlugin(pkgPath, allDiscovered)` step.

2. Use a small JSON Schema validator (`ajv` is already used elsewhere in the workspace if needed) for `inputSchema`/`outputSchema` syntactic validation.

3. The `allDiscovered` argument lets the namespace-clash check work without re-scanning.

## Dependencies

- {% ref "WORK-160" /%} — to pass discovered plugins for clash detection
- {% ref "WORK-161" /%} — to lint the new schema fields

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server
- `packages/cli/src/commands/package-validate.ts` — current validator to extend

{% /work %}
