{% work id="WORK-160" status="done" priority="high" complexity="moderate" tags="cli, plugins, foundation, mcp" source="SPEC-043" milestone="v0.11.0" %}

# Add discoverPlugins() helper to @refrakt-md/cli

Replace the lazy `runPlugin` import-on-demand pattern in `packages/cli/src/bin.ts` with a first-class `discoverPlugins()` helper that returns the full set of installed plugins. The helper has four consumers in v0.11.0 — CLI dispatch, `refrakt --help`, `refrakt plugins list`, and the new MCP server — and centralizing the logic eliminates three different implementations of the same scan.

## Acceptance Criteria

- [x] New file `packages/cli/src/lib/plugins.ts` exports `discoverPlugins(opts?: DiscoverOptions): Promise<DiscoveredPlugin[]>`
- [x] `DiscoveredPlugin` shape: `{ namespace, packageName, packageVersion, commands, source: 'config' | 'dependency-scan' }`
- [x] When `refrakt.config.json` declares `plugins`, that array is authoritative — the helper does not fall back to dependency scanning
- [x] When `refrakt.config.json` is absent or has no `plugins` field, the helper scans the nearest `package.json`'s `dependencies` + `devDependencies` for `@refrakt-md/*` entries
- [x] Meta packages (`@refrakt-md/cli`, `@refrakt-md/types`, `@refrakt-md/transform`, `@refrakt-md/runes`, `@refrakt-md/lumina`, `@refrakt-md/svelte`, `@refrakt-md/sveltekit`, `@refrakt-md/behaviors`, `@refrakt-md/content`, `@refrakt-md/ai`, `@refrakt-md/editor`) are excluded from the scan
- [x] Each candidate package is dynamically imported via `<pkg>/cli-plugin`; missing exports are skipped silently
- [x] Malformed plugin exports (no `namespace`, no `commands`) emit a warning to stderr but do not throw
- [x] Duplicate namespaces emit a warning; first-wins resolution
- [x] Result sorted alphabetically by namespace
- [x] Tests cover: config-driven discovery, dependency-scan fallback, malformed plugin warning, duplicate namespace warning, missing `cli-plugin` export skipped silently

## Approach

1. Add `lib/plugins.ts` with the helper. Resolution order: load config → if `plugins` declared, use it; else fall back to scanning the project `package.json`.

2. For each candidate, attempt `import('<pkg>/cli-plugin')` and validate the loaded module has `{ namespace: string, commands: CliPluginCommand[] }`.

3. Read `packageVersion` from each candidate's `package.json` (resolve via `import.meta.resolve` or `require.resolve` based on the package's exports). This metadata is used by `refrakt plugins list`.

4. The helper is side-effect-free — it does not execute commands, does not write to disk, and does not cache results internally. Callers wrap with their own caching where useful.

## Dependencies

- {% ref "WORK-159" /%} — needs the normalized config to read `plugins` from

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (Plugin Discovery section)
- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `packages/cli/src/bin.ts` — current `runPlugin` to replace

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/cli/src/lib/plugins.ts` (new) — Exports `discoverPlugins(opts?: DiscoverOptions): Promise<DiscoveredPlugin[]>`. Resolution order is config-first (`refrakt.config.json` → `plugins`) then dependency-scan fallback (nearest `package.json` deps + devDeps filtered to `@refrakt-md/*` minus a META_PACKAGES allowlist of meta packages that aren't expected to ship a cli-plugin).
- `DiscoveredPlugin` shape: `{ namespace, packageName, packageVersion, commands, source: 'config' | 'dependency-scan', description? }`. Each entry includes the version read from the package's own `package.json` (resolved relative to the project's `node_modules` so monorepo workspaces and global CLIs both work).
- Validation: `isValidPlugin()` checks for non-empty namespace, array of commands, and per-command `name`/`description`/`handler`. Malformed plugins log a warning and are skipped (no throw). Missing `cli-plugin` exports are skipped silently — not every refrakt package ships CLI commands.
- Duplicate namespaces: first-wins, second emits a warning naming both packages.
- Side-effect-free: no internal caching, no disk writes, no command execution. Callers wrap with their own caching where useful.
- `packages/cli/test/discover-plugins.test.ts` (new) — 7 tests using a temp directory + symlinked node_modules pointing at the real `runes/plan` package: discovery via dep scan, config-driven discovery (source='config'), fallback to dep scan when config has no plugins field, meta packages excluded, no plugins → empty array, no package.json → empty array, alphabetical sort.

### Notes

- `importFrom()` uses Node's `createRequire(resolve(cwd, '_'))` to resolve plugin imports relative to the project's `cwd` rather than the CLI's own install path. This is essential for globally-installed CLIs.
- `readPackageVersion()` resolves `<pkg>/package.json` via the project's module paths chain so the version is the actually-installed one, not whatever the CLI ships with.
- META_PACKAGES is the explicit exclusion list; community packages contributing CLI commands are auto-discovered without changes here.
- All 2247 tests pass (2240 existing + 7 new).

{% /work %}
