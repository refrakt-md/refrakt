import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';

export function loadRefraktConfig(configPath: string): RefraktConfig {
	const absPath = resolve(configPath);

	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
			`Create one with at minimum: { "contentDir": "./content", "theme": "<package-name>", "target": "sveltekit" }`
		);
	}

	const raw = readFileSync(absPath, 'utf-8');
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		throw new Error(`Failed to parse refrakt.config.json at ${absPath}: ${(e as Error).message}`);
	}

	return validateConfig(parsed);
}

function validateConfig(raw: unknown): RefraktConfig {
	if (typeof raw !== 'object' || raw === null) {
		throw new Error('refrakt.config.json must be a JSON object');
	}

	const obj = raw as Record<string, unknown>;

	if (typeof obj.contentDir !== 'string' || !obj.contentDir) {
		throw new Error('refrakt.config.json: "contentDir" is required and must be a non-empty string');
	}
	if (typeof obj.theme !== 'string' || !obj.theme) {
		throw new Error('refrakt.config.json: "theme" is required and must be a non-empty string');
	}
	if (typeof obj.target !== 'string' || !obj.target) {
		throw new Error('refrakt.config.json: "target" is required and must be a non-empty string');
	}

	return {
		contentDir: obj.contentDir,
		theme: obj.theme,
		target: obj.target,
	};
}
