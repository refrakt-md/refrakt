---
'@refrakt-md/mcp': patch
---

Fix two bugs in the MCP server:

- `serverInfo.version` was hardcoded as `0.10.1` and never tracked the package version. It now reads the version from `package.json` at startup so each release reports correctly.
- Tool calls that returned arrays (notably `refrakt.plugins_list`) failed the SDK's response validator because `structuredContent` was set unconditionally and the SDK rejects non-record values. Arrays are now wrapped under `{ items: [...] }`, and the field is omitted entirely for non-object results.
