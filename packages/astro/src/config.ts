import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';

export function loadRefraktConfig(configPath: string): RefraktConfig {
	const absPath = resolve(configPath);

	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
			`Create one with at minimum: { "contentDir": "./content", "theme": "<package-name>", "target": "astro" }`
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

	let overrides: Record<string, string> | undefined;
	if (obj.overrides !== undefined) {
		if (typeof obj.overrides !== 'object' || obj.overrides === null || Array.isArray(obj.overrides)) {
			throw new Error('refrakt.config.json: "overrides" must be an object mapping typeof names to component paths');
		}
		const entries = obj.overrides as Record<string, unknown>;
		for (const [key, value] of Object.entries(entries)) {
			if (typeof value !== 'string' || !value) {
				throw new Error(`refrakt.config.json: overrides["${key}"] must be a non-empty string path`);
			}
		}
		overrides = entries as Record<string, string>;
	}

	let routeRules: RefraktConfig['routeRules'];
	if (obj.routeRules !== undefined) {
		if (!Array.isArray(obj.routeRules)) {
			throw new Error('refrakt.config.json: "routeRules" must be an array');
		}
		for (let i = 0; i < obj.routeRules.length; i++) {
			const rule = obj.routeRules[i];
			if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
				throw new Error(`refrakt.config.json: routeRules[${i}] must be an object with "pattern" and "layout" strings`);
			}
			const r = rule as Record<string, unknown>;
			if (typeof r.pattern !== 'string' || !r.pattern) {
				throw new Error(`refrakt.config.json: routeRules[${i}].pattern is required and must be a non-empty string`);
			}
			if (typeof r.layout !== 'string' || !r.layout) {
				throw new Error(`refrakt.config.json: routeRules[${i}].layout is required and must be a non-empty string`);
			}
		}
		routeRules = obj.routeRules as RefraktConfig['routeRules'];
	}

	let highlight: RefraktConfig['highlight'];
	if (obj.highlight !== undefined) {
		if (typeof obj.highlight !== 'object' || obj.highlight === null || Array.isArray(obj.highlight)) {
			throw new Error('refrakt.config.json: "highlight" must be an object');
		}
		const hl = obj.highlight as Record<string, unknown>;
		if (hl.theme !== undefined) {
			if (typeof hl.theme === 'string') {
				highlight = { theme: hl.theme };
			} else if (typeof hl.theme === 'object' && hl.theme !== null && !Array.isArray(hl.theme)) {
				const pair = hl.theme as Record<string, unknown>;
				if (typeof pair.light !== 'string' || !pair.light || typeof pair.dark !== 'string' || !pair.dark) {
					throw new Error('refrakt.config.json: highlight.theme object must have "light" and "dark" string fields');
				}
				highlight = { theme: { light: pair.light, dark: pair.dark } };
			} else {
				throw new Error('refrakt.config.json: highlight.theme must be a string or { light, dark } object');
			}
		}
	}

	return {
		contentDir: obj.contentDir,
		theme: obj.theme,
		target: obj.target,
		...(overrides && { overrides }),
		...(routeRules && { routeRules }),
		...(highlight && { highlight }),
	};
}
