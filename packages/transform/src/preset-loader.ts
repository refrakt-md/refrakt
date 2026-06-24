import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Resolve and load a preset by specifier. A preset travels in one of two
 * carrier formats (SPEC-111 §6):
 *   - a declarative `.json` file (the default for new packs) — read + parsed
 *   - a JS/TS module with a `default`/`config` export (Lumina's current form)
 *
 * Accepts the same specifier shapes for both:
 *   - Package paths: `@refrakt-md/lumina/presets/tideline`, `@acme/presets/ember.json`
 *   - Relative paths: `./presets/my-warm`, `./presets/ember.json`
 *   - Absolute paths: `/abs/path/to/preset.js`
 *
 * Throws if the specifier doesn't resolve, the module exports nothing, or
 * the resolved value is not a plain `ThemeTokensConfig` object.
 */
export async function loadPreset(
	specifier: string,
	options: { from?: string } = {},
): Promise<ThemeTokensConfig> {
	const baseDir = options.from ?? process.cwd();
	const fromPath = isAbsolute(baseDir) ? baseDir : resolve(baseDir);

	let resolvedSpec: string;
	if (specifier.startsWith('.')) {
		resolvedSpec = pathToFileURL(resolve(fromPath, specifier)).href;
	} else if (isAbsolute(specifier)) {
		resolvedSpec = pathToFileURL(specifier).href;
	} else {
		// Package specifier — let Node resolve relative to the `from` directory.
		const req = createRequire(resolve(fromPath, 'package.json'));
		try {
			resolvedSpec = pathToFileURL(req.resolve(specifier)).href;
		} catch (err) {
			throw new Error(
				`preset '${specifier}' not found — check the package is installed and the export path is correct (${(err as Error).message})`,
			);
		}
	}

	// JSON carrier (SPEC-111 §6): read + parse rather than `import()`. The
	// resolved value is a plain object, which satisfies the same guard below.
	if (resolvedSpec.endsWith('.json')) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(fileURLToPath(resolvedSpec), 'utf-8'));
		} catch (err) {
			throw new Error(
				`failed to load JSON preset '${specifier}': ${(err as Error).message}`,
			);
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new Error(
				`preset '${specifier}' JSON is not a ThemeTokensConfig object`,
			);
		}
		return parsed as ThemeTokensConfig;
	}

	let mod: Record<string, unknown>;
	try {
		mod = await import(resolvedSpec);
	} catch (err) {
		throw new Error(
			`failed to load preset '${specifier}': ${(err as Error).message}`,
		);
	}

	const config = (mod.default ?? mod.config) as ThemeTokensConfig | undefined;
	if (config === undefined) {
		throw new Error(
			`preset '${specifier}' has no default or named 'config' export`,
		);
	}
	if (typeof config !== 'object' || config === null || Array.isArray(config)) {
		throw new Error(
			`preset '${specifier}' export is not a ThemeTokensConfig object`,
		);
	}

	return config;
}

/**
 * Load multiple presets in declared order. Returns the configs in the same
 * order, ready for {@link mergeThemeTokensConfigs}. Resolution errors include
 * the offending specifier.
 */
export async function loadPresets(
	specifiers: readonly string[],
	options: { from?: string } = {},
): Promise<ThemeTokensConfig[]> {
	return Promise.all(specifiers.map(s => loadPreset(s, options)));
}
