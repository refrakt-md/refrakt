{% work id="WORK-162" status="draft" priority="high" complexity="moderate" tags="cli, plugins, dx" source="SPEC-043" milestone="v0.11.0" %}

# Refactor runPlugin dispatch to use discoverPlugins

Switch the CLI's plugin dispatch in `packages/cli/src/bin.ts` from blind `import('@refrakt-md/<namespace>/cli-plugin')` to a `discoverPlugins()` lookup. This produces a friendlier "did you mean?" error when a namespace is misspelled (since we know the full set of installed plugins) and centralizes plugin loading on the new helper.

## Acceptance Criteria

- [ ] `runPlugin(namespace, args)` in `packages/cli/src/bin.ts` calls `discoverPlugins()` once and looks up the namespace in the result
- [ ] Unknown namespace produces an error message that lists installed namespaces and suggests the closest match (Levenshtein distance ≤ 2)
- [ ] When no plugins are installed, the error message points the user at how to install one (e.g., `npm install @refrakt-md/plan`)
- [ ] Existing behavior preserved: known namespace + unknown subcommand still lists available subcommands
- [ ] Tests cover: known namespace + known subcommand, known namespace + unknown subcommand, unknown namespace with suggestion, unknown namespace with no plugins installed

## Approach

1. Replace the inline `import` block in `runPlugin` with a `discoverPlugins()` call.

2. Add a small Levenshtein helper (or use a tiny dependency like `fastest-levenshtein` if already available in the workspace) for "did you mean?" suggestions.

3. Cache the `discoverPlugins()` result for the lifetime of the CLI invocation — important because both dispatch and `--help` may call it.

## Dependencies

- {% ref "WORK-160" /%} — needs `discoverPlugins()` to exist
- {% ref "WORK-161" /%} — uses the shared `CliPluginCommand` type

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server
- `packages/cli/src/bin.ts` — `runPlugin` to refactor

{% /work %}
