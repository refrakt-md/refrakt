import type { RefraktConfig } from '@refrakt-md/types';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	normalizeRefraktConfig,
	type NormalizedRefraktConfig,
} from './config-normalize.js';

export {
	normalizeRefraktConfig,
	resolveSite,
	resolvePlanConfig,
} from './config-normalize.js';
export type { NormalizedRefraktConfig } from './config-normalize.js';

/**
 * Load and normalize a refrakt.config.json file.
 *
 * Returns the normalized config (where `sites` is always populated and the
 * legacy flat fields mirror the single site for backwards compatibility).
 *
 * Node.js only — not safe for browser bundles.
 */
export function loadRefraktConfig(configPath: string): NormalizedRefraktConfig {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
				`Create one or pass --config to specify the path.`,
		);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(absPath, 'utf-8'));
	} catch (err) {
		throw new Error(`Failed to parse refrakt.config.json at ${absPath}: ${(err as Error).message}`);
	}
	return normalizeRefraktConfig(raw);
}

/**
 * Load a refrakt.config.json file and return both the raw input and the
 * normalized form. Useful for tools (like the migration command) that need to
 * preserve the original shape on disk while still consulting the normalized
 * fields for logic.
 */
export function loadRefraktConfigWithRaw(configPath: string): {
	raw: RefraktConfig;
	normalized: NormalizedRefraktConfig;
} {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
				`Create one or pass --config to specify the path.`,
		);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(absPath, 'utf-8'));
	} catch (err) {
		throw new Error(`Failed to parse refrakt.config.json at ${absPath}: ${(err as Error).message}`);
	}
	return { raw: raw as RefraktConfig, normalized: normalizeRefraktConfig(raw) };
}
