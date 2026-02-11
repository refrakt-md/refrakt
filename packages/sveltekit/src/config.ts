import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefractConfig } from '@refract-md/types';

export function loadRefractConfig(configPath: string): RefractConfig {
	const absPath = resolve(configPath);

	if (!existsSync(absPath)) {
		throw new Error(
			`refract.config.json not found at ${absPath}. ` +
			`Create one with at minimum: { "contentDir": "./content", "theme": "<package-name>", "target": "sveltekit" }`
		);
	}

	const raw = readFileSync(absPath, 'utf-8');
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		throw new Error(`Failed to parse refract.config.json at ${absPath}: ${(e as Error).message}`);
	}

	return validateConfig(parsed);
}

function validateConfig(raw: unknown): RefractConfig {
	if (typeof raw !== 'object' || raw === null) {
		throw new Error('refract.config.json must be a JSON object');
	}

	const obj = raw as Record<string, unknown>;

	if (typeof obj.contentDir !== 'string' || !obj.contentDir) {
		throw new Error('refract.config.json: "contentDir" is required and must be a non-empty string');
	}
	if (typeof obj.theme !== 'string' || !obj.theme) {
		throw new Error('refract.config.json: "theme" is required and must be a non-empty string');
	}
	if (typeof obj.target !== 'string' || !obj.target) {
		throw new Error('refract.config.json: "target" is required and must be a non-empty string');
	}

	return {
		contentDir: obj.contentDir,
		theme: obj.theme,
		target: obj.target,
	};
}
