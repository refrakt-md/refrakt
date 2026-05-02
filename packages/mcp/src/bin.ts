#!/usr/bin/env node
/**
 * Stdio entry point for the refrakt MCP server.
 *
 * Usage:
 *   refrakt-mcp [--cwd <path>]
 *
 * Reads the project root from `--cwd` (or `process.cwd()` by default), then
 * starts the MCP server on stdio.
 */

import { runStdioServer } from './server.js';

function parseArgs(argv: string[]): { cwd: string | undefined; help: boolean } {
	let cwd: string | undefined;
	let help = false;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]!;
		if (a === '--cwd') {
			cwd = argv[++i];
			if (!cwd) {
				console.error('Error: --cwd requires a path');
				process.exit(1);
			}
		} else if (a === '--help' || a === '-h') {
			help = true;
		} else {
			console.error(`Error: Unknown argument "${a}"`);
			process.exit(1);
		}
	}
	return { cwd, help };
}

const { cwd, help } = parseArgs(process.argv.slice(2));

if (help) {
	console.log(`
Usage: refrakt-mcp [--cwd <path>]

A Model Context Protocol server that wraps the refrakt CLI. Speaks JSON-RPC
over stdio. Register it with your MCP client (Claude Desktop, Claude Code,
Cursor, etc.) by adding to the client's config:

  "refrakt": {
    "command": "npx",
    "args": ["-y", "@refrakt-md/mcp"]
  }

Options:
  --cwd <path>     Project root the server operates against. Defaults to
                   process.cwd(). Useful when the MCP client launches the
                   server from a different directory.

  --help, -h       Show this help message.
`);
	process.exit(0);
}

runStdioServer({ cwd }).catch((err: Error) => {
	process.stderr.write(`refrakt-mcp failed to start: ${err.message}\n`);
	process.exit(1);
});
