import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, isAbsolute } from 'node:path';
import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Resolve and load a preset module by specifier. Accepts:
 *   - Package paths: `@refrakt-md/lumina/presets/tideline`
 *   - Relative paths: `./presets/my-warm`
 *   - Absolute paths: `/abs/path/to/preset.js`
 *
 * Expected exports (resolved in order):
 *   - `default`
 *   - `config`
 *
 * Throws if the specifier doesn't resolve, the module exports nothing, or
 * the resolved export is not a plain object.
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
