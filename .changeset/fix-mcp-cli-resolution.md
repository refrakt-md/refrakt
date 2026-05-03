---
"@refrakt-md/cli": patch
"@refrakt-md/mcp": patch
---

Fix MCP server failing to invoke the refrakt CLI for `inspect`, `contracts`, `reference`, `inspect_list`, and `plugins_list` tools.

The MCP server resolves the CLI bin via `require.resolve('@refrakt-md/cli/package.json')`, but the cli package's `exports` map didn't declare `./package.json`, so Node threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. The MCP server's catch branch silently fell back to the bare string `'refrakt'`, which `execFileSync` then tried to resolve as a relative path against the user's cwd, producing a confusing `Cannot find module '<cwd>/refrakt'` error.

- `@refrakt-md/cli` now exports `./package.json` so the existing resolution path works.
- `@refrakt-md/mcp` adds a secondary fallback (resolve via the always-exported `lib/plugins.js` and walk up to the package root) and now throws a clear error instead of returning a bogus bin path. Both core tools and resource handlers go through the shared helper.
