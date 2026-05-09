import { existsSync, readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { execSync } from 'node:child_process';
import {
	detectPackageManager,
	loadRefraktConfigFile,
	writeRefraktConfigFile,
} from '../config-file.js';

export interface ThemeInstallOptions {
	source: string;
}

export interface ThemeInfoOptions {
	// currently no options
}

/** Install a theme package and update refrakt.config.json */
export async function themeInstallCommand(options: ThemeInstallOptions): Promise<void> {
	const { source } = options;
	const cwd = process.cwd();

	// 1. Determine source type and package name
	const absSource = isAbsolute(source) ? source : resolve(cwd, source);
	let pluginName: string;
	let installSource: string;

	if (existsSync(absSource)) {
		// Local directory or tarball
		const pkgJsonPath = source.endsWith('.tgz')
			? null // Can't easily read from tarball without tar parser
			: resolve(absSource, 'package.json');

		if (pkgJsonPath && existsSync(pkgJsonPath)) {
			const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
			pluginName = pkg.name;
			if (!pluginName) {
				console.error('Error: Theme package.json is missing a "name" field');
				process.exit(1);
			}
			installSource = `file:${absSource}`;
		} else if (source.endsWith('.tgz')) {
			// For tarballs, install first then read name from node_modules
			installSource = absSource;
			pluginName = ''; // resolved after install
		} else {
			console.error(`Error: No package.json found in ${absSource}`);
			process.exit(1);
		}
	} else {
		// npm package name
		pluginName = source;
		installSource = source;
	}

	// 2. Detect package manager
	const pm = detectPackageManager(cwd);
	console.log(`Using ${pm.name} to install theme...`);

	// 3. Install
	const cmd = pm.installCmd(installSource);
	try {
		execSync(cmd, { cwd, stdio: 'inherit' });
	} catch {
		console.error(`\nError: Failed to install theme. Command: ${cmd}`);
		process.exit(1);
	}

	// 4. For tarballs, resolve package name from the install output
	if (!pluginName) {
		// After npm install of a tarball, the package is in node_modules
		// We need to search for it — check recent additions
		console.error('Error: Could not determine package name from tarball.');
		console.error('Please install from the unzipped directory instead:');
		console.error('  refrakt theme install ./path/to/theme-directory');
		process.exit(1);
	}

	// 5. Update refrakt.config.json
	let configData;
	try {
		configData = loadRefraktConfigFile(cwd);
	} catch {
		console.error('Error: No refrakt.config.json found in the current directory.');
		console.error('Are you in a refrakt.md project root?');
		process.exit(1);
	}

	// `theme install` only knows how to update one site's theme. For multi-site
	// configs the user has to pick which site explicitly — out of scope for this
	// command today.
	const rawSites = (configData.raw.sites ?? {}) as Record<string, unknown>;
	const siteNames = Object.keys(rawSites);
	if (siteNames.length > 1) {
		console.error(`Error: refrakt.config.json declares multiple sites (${siteNames.map((n) => `"${n}"`).join(', ')}).`);
		console.error('`theme install` cannot pick a target automatically. Update the relevant site\'s "theme" field manually.');
		process.exit(1);
	}

	const previousTheme = writeThemeIntoConfig(configData.raw, pluginName);
	writeRefraktConfigFile(configData.path, configData.raw);

	// 6. Validate the installed theme
	const warnings: string[] = [];
	try {
		const themeDir = resolve(cwd, 'node_modules', pluginName);
		if (!existsSync(themeDir)) {
			warnings.push('Theme directory not found in node_modules — install may have failed');
		} else {
			const themePkg = JSON.parse(readFileSync(resolve(themeDir, 'package.json'), 'utf-8'));
			const exports = themePkg.exports ?? {};
			if (!exports['./svelte'] && !exports['./svelte/index.js']) {
				warnings.push('Theme is missing ./svelte export — runtime rendering may fail');
			}
			if (!exports['./transform']) {
				warnings.push('Theme is missing ./transform export — CSS tree-shaking will be skipped');
			}
		}
	} catch {
		// Validation is best-effort
	}

	// 7. Output results
	console.log('');
	console.log(`Theme "${pluginName}" installed successfully.`);
	if (previousTheme !== pluginName) {
		console.log(`  Updated refrakt.config.json: "${previousTheme}" → "${pluginName}"`);
	}
	if (warnings.length > 0) {
		console.log('');
		console.log('Warnings:');
		for (const w of warnings) {
			console.log(`  ⚠ ${w}`);
		}
	}
	console.log('');
	console.log('Run your dev server to see the new theme in action.');
}

/** Show info about the currently configured theme */
export async function themeInfoCommand(_options: ThemeInfoOptions): Promise<void> {
	const cwd = process.cwd();

	let configData;
	try {
		configData = loadRefraktConfigFile(cwd);
	} catch {
		console.error('Error: No refrakt.config.json found in the current directory.');
		process.exit(1);
	}

	const themeName = readThemeFromConfig(configData.raw);
	if (!themeName) {
		console.error('Error: refrakt.config.json does not declare a theme. Add one under "site.theme" or pick a site to inspect with --site.');
		process.exit(1);
	}
	console.log(`Current theme: ${themeName}`);

	// Try to resolve and show details
	try {
		const themeDir = resolve(cwd, 'node_modules', themeName);
		if (existsSync(themeDir)) {
			const pkg = JSON.parse(readFileSync(resolve(themeDir, 'package.json'), 'utf-8'));
			console.log(`  Version: ${pkg.version ?? 'unknown'}`);
			console.log(`  Path: ${themeDir}`);
			if (pkg.description) {
				console.log(`  Description: ${pkg.description}`);
			}
			const exports = pkg.exports ?? {};
			const features: string[] = [];
			if (exports['./svelte']) features.push('svelte');
			if (exports['./transform']) features.push('transform');
			if (exports['./styles/runes/*.css']) features.push('rune CSS');
			if (features.length > 0) {
				console.log(`  Exports: ${features.join(', ')}`);
			}
		} else if (themeName.startsWith('.')) {
			console.log(`  Type: Local directory`);
			console.log(`  Path: ${resolve(cwd, themeName)}`);
		} else {
			console.log(`  Status: Not found in node_modules`);
		}
	} catch {
		// Best-effort info display
	}
}

/** Read the theme name from a raw config, preferring the modern `site.theme`
 *  / `sites[only].theme` over the legacy flat top-level `theme` field. */
function readThemeFromConfig(raw: import('@refrakt-md/types').RefraktConfig): string | undefined {
	if (raw.site?.theme) return raw.site.theme;
	if (raw.sites) {
		const entries = Object.entries(raw.sites);
		if (entries.length === 1) {
			return entries[0]![1].theme;
		}
		return undefined;
	}
	return raw.theme;
}

/** Mutate the raw config to set the theme on whichever shape it was authored
 *  in. Returns the previous theme value. */
function writeThemeIntoConfig(
	raw: import('@refrakt-md/types').RefraktConfig,
	pluginName: string,
): string | undefined {
	if (raw.site) {
		const previous = raw.site.theme;
		raw.site.theme = pluginName;
		return previous;
	}
	if (raw.sites) {
		const entries = Object.entries(raw.sites);
		if (entries.length === 1) {
			const [, site] = entries[0]!;
			const previous = site.theme;
			site.theme = pluginName;
			return previous;
		}
	}
	const previous = raw.theme;
	raw.theme = pluginName;
	return previous;
}
