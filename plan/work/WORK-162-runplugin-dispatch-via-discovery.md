{% work id="WORK-162" status="done" priority="high" complexity="moderate" tags="cli, plugins, dx" source="SPEC-043" milestone="v0.11.0" %}

# Refactor runPlugin dispatch to use discoverPlugins

Switch the CLI's plugin dispatch in `packages/cli/src/bin.ts` from blind `import('@refrakt-md/<namespace>/cli-plugin')` to a `discoverPlugins()` lookup. This produces a friendlier "did you mean?" error when a namespace is misspelled (since we know the full set of installed plugins) and centralizes plugin loading on the new helper.

## Acceptance Criteria

- [x] `runPlugin(namespace, args)` in `packages/cli/src/bin.ts` calls `discoverPlugins()` once and looks up the namespace in the result
- [x] Unknown namespace produces an error message that lists installed namespaces and suggests the closest match (Levenshtein distance ≤ 2)
- [x] When no plugins are installed, the error message points the user at how to install one (e.g., `npm install @refrakt-md/plan`)
- [x] Existing behavior preserved: known namespace + unknown subcommand still lists available subcommands
- [x] Tests cover: known namespace + known subcommand, known namespace + unknown subcommand, unknown namespace with suggestion, unknown namespace with no plugins installed

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

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/cli/src/bin.ts` — Replaced the lazy `import('@refrakt-md/<ns>/cli-plugin')` block in `runPlugin()` with a `discoverPlugins()` lookup. Unknown namespaces now report installed namespaces + a "Did you mean?" suggestion (Levenshtein ≤ 2). Unknown subcommands also get a suggestion based on the plugin's command list. The original "no plugins installed → install instruction" path is preserved as a fallback when discovery returns empty.
- `packages/cli/src/lib/levenshtein.ts` (new) — `levenshtein(a, b)` and `closestMatch(input, candidates)` (returns the closest match if distance ≤ 2, else undefined). Same algorithm as the helper inside `@refrakt-md/transform/node`'s `resolveSite`, kept local so the CLI doesn't import transform internals just for typo suggestions.
- `packages/cli/src/lib/plugins.ts` — Augmented `candidatesFromPackageJson()` to also scan `node_modules/@refrakt-md/*` directly, not just `package.json` deps. This catches workspace-linked packages — essential for the refrakt monorepo itself (where `@refrakt-md/plan` is a workspace package and isn't listed in the root `package.json`'s deps) and for future monorepos that adopt similar layouts.
- `packages/cli/test/plugin.test.ts` — Updated the "missing plugin" test to assert the new error wording and added two new tests: misspelled namespace gets a "Did you mean?" suggestion, misspelled subcommand gets a "Did you mean?" suggestion.

### Notes

- `getPlugins()` is a function declaration (not `let`/`const`) with a property cache because the dispatch block at the top of `bin.ts` runs before module-level let/const bindings initialize (TDZ). The function form is hoisted, so it works regardless of where in the file it appears. Caching matters because WORK-163's `--help` will call `discoverPlugins()` too — without caching that would scan twice per invocation.
- The unknown-namespace error wording is friendlier than before: it lists what's actually installed instead of just "install @refrakt-md/<ns>", which is misleading when the user typoed an existing plugin.
- All 2253 tests still pass.

{% /work %}
