{% work id="WORK-160" status="draft" priority="high" complexity="moderate" tags="cli, plugins, foundation, mcp" source="SPEC-043" milestone="v0.11.0" %}

# Add discoverPlugins() helper to @refrakt-md/cli

Replace the lazy `runPlugin` import-on-demand pattern in `packages/cli/src/bin.ts` with a first-class `discoverPlugins()` helper that returns the full set of installed plugins. The helper has four consumers in v0.11.0 — CLI dispatch, `refrakt --help`, `refrakt plugins list`, and the new MCP server — and centralizing the logic eliminates three different implementations of the same scan.

## Acceptance Criteria

- [ ] New file `packages/cli/src/lib/plugins.ts` exports `discoverPlugins(opts?: DiscoverOptions): Promise<DiscoveredPlugin[]>`
- [ ] `DiscoveredPlugin` shape: `{ namespace, packageName, packageVersion, commands, source: 'config' | 'dependency-scan' }`
- [ ] When `refrakt.config.json` declares `plugins`, that array is authoritative — the helper does not fall back to dependency scanning
- [ ] When `refrakt.config.json` is absent or has no `plugins` field, the helper scans the nearest `package.json`'s `dependencies` + `devDependencies` for `@refrakt-md/*` entries
- [ ] Meta packages (`@refrakt-md/cli`, `@refrakt-md/types`, `@refrakt-md/transform`, `@refrakt-md/runes`, `@refrakt-md/lumina`, `@refrakt-md/svelte`, `@refrakt-md/sveltekit`, `@refrakt-md/behaviors`, `@refrakt-md/content`, `@refrakt-md/ai`, `@refrakt-md/editor`) are excluded from the scan
- [ ] Each candidate package is dynamically imported via `<pkg>/cli-plugin`; missing exports are skipped silently
- [ ] Malformed plugin exports (no `namespace`, no `commands`) emit a warning to stderr but do not throw
- [ ] Duplicate namespaces emit a warning; first-wins resolution
- [ ] Result sorted alphabetically by namespace
- [ ] Tests cover: config-driven discovery, dependency-scan fallback, malformed plugin warning, duplicate namespace warning, missing `cli-plugin` export skipped silently

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

{% /work %}
