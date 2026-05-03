---
'@refrakt-md/types': patch
'@refrakt-md/mcp': patch
'@refrakt-md/plan': patch
---

Fix plan tools failing with `ENOENT: ... 'plan'` when the MCP server is launched from outside the project directory (e.g. via `scripts/start-mcp.sh`, which `cd`s to `/tmp` before exec).

The MCP server already accepted `--cwd` and forwarded it to its core tools, but plugin-contributed tools dropped it: `buildPluginTool` called `command.mcpHandler(input)` without the cwd context, so `@refrakt-md/plan`'s handlers fell back to `process.cwd()` when resolving `refrakt.config.json` and the default `'plan'` directory.

Changes:

- `@refrakt-md/types`: `CliPluginCommand.mcpHandler` now takes an optional second `ctx?: McpHandlerContext` argument carrying the server's resolved cwd. New `McpHandlerContext` type is re-exported from the package entry. The change is non-breaking — existing handlers that ignore the second argument keep compiling.
- `@refrakt-md/mcp`: `buildPluginTool` forwards the server's `ctx` to the plugin's `mcpHandler`. The argv-shimming fallback path is unchanged (it still uses `process.cwd()`); plugins that need project-cwd awareness should provide an explicit `mcpHandler`.
- `@refrakt-md/plan`: every `*McpHandler` accepts the new `ctx`, threads it into `resolvePlanDir`, and absolutizes the resolved `dir` against `ctx.cwd` so relative paths from any source (flag, env, config, default) consistently resolve against the project root.
