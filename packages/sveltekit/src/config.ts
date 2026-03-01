import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';

export function loadRefraktConfig(configPath: string): RefraktConfig {
	const absPath = resolve(configPath);

	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
			`Create one with at minimum: { "contentDir": "./content", "theme": "<package-name>", "target": "svelte" }`
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

	let packages: string[] | undefined;
	if (obj.packages !== undefined) {
		if (!Array.isArray(obj.packages)) {
			throw new Error('refrakt.config.json: "packages" must be an array of package name strings');
		}
		for (let i = 0; i < obj.packages.length; i++) {
			if (typeof obj.packages[i] !== 'string' || !obj.packages[i]) {
				throw new Error(`refrakt.config.json: packages[${i}] must be a non-empty string`);
			}
		}
		packages = obj.packages as string[];
	}

	let runes: RefraktConfig['runes'];
	if (obj.runes !== undefined) {
		if (typeof obj.runes !== 'object' || obj.runes === null || Array.isArray(obj.runes)) {
			throw new Error('refrakt.config.json: "runes" must be an object');
		}
		const runesObj = obj.runes as Record<string, unknown>;
		let prefer: Record<string, string> | undefined;
		if (runesObj.prefer !== undefined) {
			if (typeof runesObj.prefer !== 'object' || runesObj.prefer === null || Array.isArray(runesObj.prefer)) {
				throw new Error('refrakt.config.json: "runes.prefer" must be an object mapping rune names to package names');
			}
			const preferObj = runesObj.prefer as Record<string, unknown>;
			for (const [key, value] of Object.entries(preferObj)) {
				if (typeof value !== 'string' || !value) {
					throw new Error(`refrakt.config.json: runes.prefer["${key}"] must be a non-empty string`);
				}
			}
			prefer = preferObj as Record<string, string>;
		}
		runes = { ...(prefer && { prefer }) };
	}

	return {
		contentDir: obj.contentDir,
		theme: obj.theme,
		target: obj.target,
		...(overrides && { overrides }),
		...(routeRules && { routeRules }),
		...(highlight && { highlight }),
		...(packages && { packages }),
		...(runes && { runes }),
	};
}
