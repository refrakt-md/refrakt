/**
 * Resolve the path to the `@refrakt-md/cli` bin entry from the running MCP
 * package. Used by both the CLI-shelling tool handlers and the resource
 * handlers.
 *
 * Resolution order:
 *   1. `@refrakt-md/cli/package.json` (works when the cli package exports it).
 *   2. `@refrakt-md/cli/lib/plugins.js` (always exported); walk up to the
 *      package root and append `dist/bin.js`.
 *
 * If both fail, throws a clear error rather than returning a bare `'refrakt'`
 * string — that fallback used to silently produce confusing
 * `Cannot find module '<cwd>/refrakt'` errors when execFileSync resolved the
 * relative path against the user's cwd.
 */

import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';

const require_ = createRequire(import.meta.url);

let cached: string | undefined;

export function resolveCliBin(): string {
	if (cached) return cached;
	const errors: string[] = [];

	try {
		const pkgJsonPath = require_.resolve('@refrakt-md/cli/package.json');
		cached = resolve(dirname(pkgJsonPath), 'dist', 'bin.js');
		return cached;
	} catch (err) {
		errors.push(`package.json: ${(err as Error).message}`);
	}

	try {
		// `lib/plugins.js` is always declared in @refrakt-md/cli's exports map.
		// From .../node_modules/@refrakt-md/cli/dist/lib/plugins.js, walk up two
		// directories to reach the package root.
		const pluginsPath = require_.resolve('@refrakt-md/cli/lib/plugins.js');
		const pkgDir = dirname(dirname(dirname(pluginsPath)));
		cached = resolve(pkgDir, 'dist', 'bin.js');
		return cached;
	} catch (err) {
		errors.push(`lib/plugins.js: ${(err as Error).message}`);
	}

	throw new Error(
		`Unable to resolve @refrakt-md/cli bin from MCP server. Tried:\n  - ${errors.join('\n  - ')}`,
	);
}
