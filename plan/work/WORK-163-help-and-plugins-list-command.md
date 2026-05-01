{% work id="WORK-163" status="draft" priority="medium" complexity="simple" tags="cli, plugins, dx" source="SPEC-043" milestone="v0.11.0" %}

# refrakt --help lists installed plugins + new `refrakt plugins list` command

Surface the installed plugin set in two places: the top-level `refrakt --help` output (so users discover available namespaces without reading docs) and a dedicated `refrakt plugins list` command (canonical machine-readable output for tooling, including MCP clients debugging their setup).

## Acceptance Criteria

- [ ] `refrakt --help` includes an "Installed plugins:" section that lists each `<namespace>` with the package it came from and a one-line description (the package's `cli-plugin` namespace description, or the package name if none)
- [ ] When no plugins are installed, the section is omitted (not shown empty)
- [ ] New command `refrakt plugins list` (handled in `packages/cli/src/commands/plugins.ts`) prints a human-readable table with namespace, package name, version, command count, and command names
- [ ] `refrakt plugins list --format json` emits a JSON array matching the `DiscoveredPlugin[]` shape from `discoverPlugins()`
- [ ] `refrakt plugins --help` documents the `list` subcommand (and leaves room for future subcommands like `info`)
- [ ] Tests cover: text and JSON output for both populated and empty plugin sets

## Approach

1. Add `packages/cli/src/commands/plugins.ts` with a `runPlugins(args)` handler that dispatches `list` (default subcommand) and emits text or JSON.

2. Wire `plugins` into `packages/cli/src/bin.ts` as a top-level command alongside `inspect`, `contracts`, etc.

3. Update `printUsage()` in `bin.ts` to call `discoverPlugins()` and append the plugin section. Keep the help output cached so it doesn't re-scan on every `--help`.

## Dependencies

- {% ref "WORK-160" /%} — needs `discoverPlugins()`

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (Example: `refrakt plugins list`)
- `packages/cli/src/bin.ts` — `printUsage` to extend

{% /work %}
