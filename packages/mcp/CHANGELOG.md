# @refrakt-md/mcp

## 0.11.2

### Patch Changes

- bda80cc: Fix MCP server failing to invoke the refrakt CLI for `inspect`, `contracts`, `reference`, `inspect_list`, and `plugins_list` tools.

  The MCP server resolves the CLI bin via `require.resolve('@refrakt-md/cli/package.json')`, but the cli package's `exports` map didn't declare `./package.json`, so Node threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. The MCP server's catch branch silently fell back to the bare string `'refrakt'`, which `execFileSync` then tried to resolve as a relative path against the user's cwd, producing a confusing `Cannot find module '<cwd>/refrakt'` error.

  - `@refrakt-md/cli` now exports `./package.json` so the existing resolution path works.
  - `@refrakt-md/mcp` adds a secondary fallback (resolve via the always-exported `lib/plugins.js` and walk up to the package root) and now throws a clear error instead of returning a bogus bin path. Both core tools and resource handlers go through the shared helper.

- Updated dependencies [bda80cc]
  - @refrakt-md/cli@0.11.2
  - @refrakt-md/runes@0.11.2
  - @refrakt-md/transform@0.11.2
  - @refrakt-md/types@0.11.2

## 0.11.1

### Patch Changes

- c9f572c: Include `packages/mcp` in the root build chain so the published tarball contains `dist/`. Previously the package was added to the workspace but never built during `npm run release`, causing `npx -y @refrakt-md/mcp` to fail because `bin: ./dist/bin.js` was missing from the npm artifact (only `package.json` shipped).
  - @refrakt-md/cli@0.11.1
  - @refrakt-md/runes@0.11.1
  - @refrakt-md/transform@0.11.1
  - @refrakt-md/types@0.11.1

## 0.11.0

### Minor Changes

- 6a89ebe: v0.11.0 — unified config + multi-site + MCP server.

  - **Unified `refrakt.config.json`**. New `$schema`, `plugins`, `plan`, `site` / `sites` sections collapsed into a canonical sites map by `normalizeRefraktConfig()` in `@refrakt-md/transform/node`. Flat / singular / plural shapes all valid; single-site fields mirror to the top level for backwards compat. JSON Schema published from `@refrakt-md/transform` and referenced from a repo-root symlink for in-repo `$schema` references.
  - **Plugin discovery**. `discoverPlugins()` in `@refrakt-md/cli/lib/plugins` resolves `config.plugins` first, then falls back to scanning `package.json` deps + `node_modules/@refrakt-md/*`. CLI dispatch uses it for routing, "Did you mean?" suggestions on misspellings, and `--help` plugin listing. New `refrakt plugins list` command.
  - **Multi-site support**. New `--site <name>` flag on site-scoped commands (`inspect`, `contracts`, `scaffold-css`, `validate`, `package validate`). Resolves via `resolveSite()`; multi-site without `--site` errors with available names; unknown name errors with a suggestion. All five framework adapters (`sveltekit`, `astro`, `nuxt`, `next`, `eleventy`) accept a `site?: string` option.
  - **`@refrakt-md/mcp`** (new package). Model Context Protocol server wrapping the refrakt CLI. Stdio transport, six core tools (`refrakt.detect`, `refrakt.plugins_list`, `refrakt.reference`, `refrakt.contracts`, `refrakt.inspect`, `refrakt.inspect_list`), plugin-discovered tools registered as `<namespace>.<name>`, and read-only resources (`refrakt://detect`, `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, etc.). Errors return structured envelopes with `errorCode` + `hint`. `--cwd <path>` overrides cwd. Long-running commands (`plan.serve`, `plan.build`) intentionally excluded.
  - **Plan + MCP integration**. New `inputSchema` / `outputSchema` / `mcpHandler` fields on `CliPluginCommand`. Plan commands ship MCP bindings (`next`, `update`, `create`, `status`, `validate`, `next-id`, `init`, `history`, `migrate`). Plan package consumes the unified config via `resolvePlanDir()` (precedence: flag → env → config → `'plan'`). `plan init` scaffolds `refrakt.config.json` by default (`--no-config` opts out).
  - **`refrakt config migrate`**. New subcommand. Default is dry-run with a line diff; `--apply` writes. `--to nested` (default) handles flat → singular; `--to multi-site --name <n>` handles singular → plural. Idempotent. Auto-populates `plugins` from `discoverPlugins()` on first migration.
  - **`.mcp.json` scaffolding**. `plan init` and `create-refrakt` (all six site scaffolds) drop a project-scoped `.mcp.json` registering `@refrakt-md/mcp` for MCP-aware agents (Claude Code, Cursor). Gated on agent detection; `--no-mcp` opts out.
  - **Site docs**. New `site/content/docs/configuration/` (overview, plugins, plan, sites, migration, schema) and `site/content/docs/mcp/` (overview, installation, tools, resources, errors). `packages/authoring.md` extended with an "Adding CLI Commands and MCP Tools" section. `CLAUDE.md` gains an MCP section directing agents to prefer MCP tools over the CLI when both are available.
  - **Path resolution semantics**. Nested-shape paths (`contentDir`, `sandbox.examplesDir`, `theme`, `overrides`, `runes.local`) now resolve relative to the config file's directory when a `configDir` is provided to `normalizeRefraktConfig()`. Flat-shape paths remain cwd-relative for legacy projects. `DEFAULT_SITE_NAME` exported as `'main'` (was `'default'`) so flat / singular configs promote to `sites.main` and match the `create-refrakt` scaffolds.

### Patch Changes

- Updated dependencies [6a89ebe]
  - @refrakt-md/transform@0.11.0
  - @refrakt-md/cli@0.11.0
  - @refrakt-md/runes@0.11.0
  - @refrakt-md/types@0.11.0
