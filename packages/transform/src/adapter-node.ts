import type { RefraktConfig } from '@refrakt-md/types';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load and parse a refrakt.config.json file.
 *
 * Node.js only — not safe for browser bundles.
 */
export function loadRefraktConfig(configPath: string): RefraktConfig {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
			`Create one or pass --config to specify the path.`
		);
	}
	return JSON.parse(readFileSync(absPath, 'utf-8'));
}
