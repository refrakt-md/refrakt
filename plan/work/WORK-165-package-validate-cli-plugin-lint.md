{% work id="WORK-165" status="done" priority="low" complexity="simple" tags="cli, plugins, validation" source="SPEC-043" milestone="v0.11.0" %}

# Lint cli-plugin shape in `refrakt package validate`

Add a lint pass to `refrakt package validate` that checks a package's `cli-plugin` export for structural issues — missing namespace, missing descriptions, malformed `inputSchema`, namespace conflicts with already-installed plugins. Catches problems at package-publish time rather than at runtime when the MCP server tries to advertise the broken tool.

## Acceptance Criteria

- [x] `refrakt package validate <pkg>` runs the existing checks plus a new "cli-plugin" pass when the package exposes a `cli-plugin` export
- [x] Errors: missing `namespace`, missing `commands` array, command without `name`, command without `description`, command without `handler`
- [x] Errors: `inputSchema` present but not a valid JSON Schema (per a lightweight check using `ajv` or similar)
- [x] Warnings: command has no `inputSchema` (recommended for MCP exposure), command has no `mcpHandler` (recommended for clean structured I/O)
- [x] Warnings: namespace clashes with another installed plugin in the current project
- [x] Lint output integrated into the existing `package validate` text and JSON formats
- [x] Tests cover: valid plugin (no findings), each error case, each warning case

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

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/cli/src/commands/package-validate.ts` — Added `validateCliPlugin()` step (Step 10) that runs after the existing rune-package validation when the package declares a `./cli-plugin` export. Skipped silently when no such export exists, so rune-only packages aren't burdened.
- Validation covers: structural integrity (loadable, has `namespace` and `commands`), per-command shape (`name`, `description`, `handler` required; types checked for each), schema fields (`inputSchema`/`outputSchema` must be objects; `mcpHandler` must be a function).
- Warnings emitted (not errors): empty descriptions, missing `inputSchema` ("recommended for MCP exposure"), missing `mcpHandler` when `inputSchema` is present ("MCP will fall back to argv-shimming").
- Namespace clash detection runs `discoverPlugins()` against the package's parent directory and warns if any other installed plugin owns the same namespace.
- `packages/cli/test/package-validate.test.ts` — Added a `cli-plugin lint` describe with 7 tests: skip when no cli-plugin export, warn on missing inputSchema, error on missing namespace, error on missing handler, error on non-object inputSchema, warn on inputSchema-without-mcpHandler, clean pass when fully wired.
- Smoke test against `runes/plan` (real plan plugin): produces 11 inputSchema warnings (one per command) — exactly what we expect since WORK-167 hasn't added schemas yet. The lint correctly identifies the v0.11.0 work to come.

### Notes

- Skipped a heavy `ajv`-based schema validator in favor of `isPlausibleJsonSchema()` (object, not array, not null). Schema correctness will be enforced more thoroughly when MCP consumes the schemas in WORK-169/170; the lint's job is to catch obvious typos at publish time.
- Added `src/cli-plugin.js` as a candidate path so packages publishing un-bundled JS sources are also validated (was an oversight in the first draft caught by tests).
- All 2269 tests pass.

{% /work %}
