---
title: Installation
description: Register the refrakt MCP server with Claude Desktop, Claude Code, Cursor, and other MCP clients.
---

# Installation

The MCP server ships as `@refrakt-md/mcp` with a `refrakt-mcp` bin entry. Install it as a project dev dependency, then point your MCP client at it.

## Install

```bash
npm install --save-dev @refrakt-md/mcp
```

Project-scoped install is recommended so the server's version stays locked with your other refrakt packages. Global installs work but make version drift more likely.

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the Windows equivalent:

```json
{
  "mcpServers": {
    "refrakt": {
      "command": "npx",
      "args": ["@refrakt-md/mcp"]
    }
  }
}
```

For an isolated install (no project `node_modules`):

```json
{
  "mcpServers": {
    "refrakt": {
      "command": "npx",
      "args": ["-y", "@refrakt-md/mcp"]
    }
  }
}
```

## Claude Code

```bash
claude mcp add refrakt -- npx @refrakt-md/mcp
```

Or add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "refrakt": {
      "command": "npx",
      "args": ["@refrakt-md/mcp"]
    }
  }
}
```

## Cursor / other clients

Most MCP clients accept the same `command` + `args` shape as Claude Desktop. Use the project-scoped form (no `-y`) so the version pinning from `package.json` applies.

## Working directory

The server inherits `cwd` from the launching client, which is how it auto-detects your project. If your client launches the server from a different directory than your project root, pass `--cwd` explicitly:

```json
{
  "mcpServers": {
    "refrakt": {
      "command": "npx",
      "args": ["@refrakt-md/mcp", "--cwd", "/path/to/project"]
    }
  }
}
```

## Verifying the connection

Once registered, restart your MCP client. You should see refrakt's tools appear (look for `refrakt.detect`, `refrakt.contracts`, `plan.next`, etc.). Run `refrakt.detect` first — its output tells you what other tools and resources the server is exposing for your project.

Or inspect manually from the command line:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | npx @refrakt-md/mcp
```

If the handshake succeeds, the server is reachable.

## Troubleshooting

- **"Unknown tool" errors**: the project doesn't have the context the tool needs. Run `refrakt.detect` to see what's active. Plan tools require a `plan/` directory; site tools require `refrakt.config.json` with `site` or `sites`.
- **Multi-site ambiguity**: site-scoped tools fail with "declares multiple sites" when no `site` argument is passed. Always include the site name in tool input for multi-site repos.
- **Server doesn't start**: confirm `npx @refrakt-md/mcp --help` runs cleanly from the project's working directory. If it doesn't, the package isn't installed or `node_modules/.bin/refrakt-mcp` isn't on the path.
