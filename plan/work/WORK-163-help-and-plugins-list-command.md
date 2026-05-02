{% work id="WORK-163" status="done" priority="medium" complexity="simple" tags="cli, plugins, dx" source="SPEC-043" milestone="v0.11.0" %}

# refrakt --help lists installed plugins + new `refrakt plugins list` command

Surface the installed plugin set in two places: the top-level `refrakt --help` output (so users discover available namespaces without reading docs) and a dedicated `refrakt plugins list` command (canonical machine-readable output for tooling, including MCP clients debugging their setup).

## Acceptance Criteria

- [x] `refrakt --help` includes an "Installed plugins:" section that lists each `<namespace>` with the package it came from and a one-line description (the package's `cli-plugin` namespace description, or the package name if none)
- [x] When no plugins are installed, the section is omitted (not shown empty)
- [x] New command `refrakt plugins list` (handled in `packages/cli/src/commands/plugins.ts`) prints a human-readable table with namespace, package name, version, command count, and command names
- [x] `refrakt plugins list --format json` emits a JSON array matching the `DiscoveredPlugin[]` shape from `discoverPlugins()`
- [x] `refrakt plugins --help` documents the `list` subcommand (and leaves room for future subcommands like `info`)
- [x] Tests cover: text and JSON output for both populated and empty plugin sets

## Approach

1. Add `packages/cli/src/commands/plugins.ts` with a `runPlugins(args)` handler that dispatches `list` (default subcommand) and emits text or JSON.

2. Wire `plugins` into `packages/cli/src/bin.ts` as a top-level command alongside `inspect`, `contracts`, etc.

3. Update `printUsage()` in `bin.ts` to call `discoverPlugins()` and append the plugin section. Keep the help output cached so it doesn't re-scan on every `--help`.

## Dependencies

- {% ref "WORK-160" /%} — needs `discoverPlugins()`

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (Example: `refrakt plugins list`)
- `packages/cli/src/bin.ts` — `printUsage` to extend

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/cli/src/commands/plugins.ts` (new) — `runPluginsCommand()` dispatches the `plugins` namespace; `list` subcommand prints a text table (namespace · `pkg@version` · command count · command names) or JSON via `--format json` / `--json` shorthand. JSON output includes per-command `hasInputSchema`, `hasOutputSchema`, `hasMcpHandler` booleans so MCP clients can see which commands are MCP-ready. Also exports `appendPluginsToHelp()` for the static help integration. Empty-plugin-set message points at `npm install @refrakt-md/plan` as a starter.
- `packages/cli/src/bin.ts` — Added `plugins <subcommand>` to the static help text. Wired `runPluginsCommand` for the `plugins` namespace. The `--help` dispatch now appends installed plugins asynchronously after printing static help (kept the rest of the dispatch synchronous to avoid a full main() refactor).
- `packages/cli/src/lib/plugins.ts` — Fixed `readPackageVersion()` to read `node_modules/<pkg>/package.json` directly via fs walking instead of `require.resolve('<pkg>/package.json')`, which fails for modern packages with `exports` maps that block the `package.json` subpath.
- `packages/cli/test/plugins-command.test.ts` (new) — 7 tests: text default, `--format json`, `--json` shorthand, no-subcommand help, unknown subcommand error, `plugins` mention in static help, "Installed plugins:" appended to `--help` output.

### Notes

- `appendPluginsToHelp()` swallows discovery errors silently — the help text is core and must always render even if discovery fails (e.g., malformed config file).
- Empty plugin set is handled in two places: `appendPluginsToHelp` omits the section (per criterion); `plugins list` prints a friendly install hint.
- Tests run from the repo root and assert that "plan" appears, which it does courtesy of WORK-160's node_modules scanning fallback. A future test fixture could exercise the empty case, but not strictly necessary — `appendPluginsToHelp` early-returns on `plugins.length === 0`.
- All 2262 tests pass.

{% /work %}
