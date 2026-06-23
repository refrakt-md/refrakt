import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import {
	loadRefraktConfigFile,
	writeRefraktConfigFile,
} from '../config-file.js';
import {
	resolveSource,
	buildInstallCommand,
	readInstalledManifest,
	getProjectRefraktVersion,
	validateCompat,
	validateThemeExports,
	detectFrameworkLayers,
	resolveTargetSite,
	setSiteTheme,
} from './install.js';

export interface ThemeInstallOptions {
	source: string;
	/** Target site key for multi-site projects (SPEC-110 §3). */
	site?: string;
	/** Alternate registry passthrough (SPEC-110 §2). */
	registry?: string;
}

export interface ThemeInfoOptions {
	site?: string;
}

export interface ThemeListOptions {
	// no options yet
}

/** Read a theme's declared `refrakt` compatibility range from its installed
 *  manifest.json (ThemeManifest) or package.json (ADR-023). */
function readThemeCompatRange(cwd: string, pkgName: string): string | undefined {
	const manifestPath = resolve(cwd, 'node_modules', pkgName, 'manifest.json');
	if (existsSync(manifestPath)) {
		try {
			const m = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { refrakt?: string };
			if (m.refrakt) return m.refrakt;
		} catch {
			// fall through
		}
	}
	const pkg = readInstalledManifest(cwd, pkgName);
	return pkg?.refrakt as string | undefined;
}

/** Install a theme package and point a site's `theme` field at it. */
export async function themeInstallCommand(options: ThemeInstallOptions): Promise<void> {
	const { source, site: siteFlag, registry } = options;
	const cwd = process.cwd();

	// 1. Resolve the source to a concrete package name (SPEC-110 §1).
	let resolved;
	try {
		resolved = resolveSource(source, cwd);
	} catch (err) {
		console.error(`Error: ${(err as Error).message}`);
		process.exit(1);
	}
	const pluginName = resolved.name;

	// 2. Install via the detected package manager (+ optional --registry).
	const { name: pmName, cmd } = buildInstallCommand(resolved.installSource, { registry, cwd });
	console.log(`Using ${pmName} to install theme "${pluginName}"...`);
	try {
		execSync(cmd, { cwd, stdio: 'inherit' });
	} catch {
		console.error(`\nError: Failed to install theme. Command: ${cmd}`);
		process.exit(1);
	}

	// 3. Load config + choose the target site.
	let configData;
	try {
		configData = loadRefraktConfigFile(cwd);
	} catch {
		console.error('Error: No refrakt.config.json found in the current directory.');
		console.error('Are you in a refrakt.md project root?');
		process.exit(1);
	}
	const selection = resolveTargetSite(configData.raw, siteFlag, 'existing');
	if (!selection.key) {
		console.error(`Error: ${selection.error}.`);
		if (selection.candidates?.length) {
			console.error(`Sites: ${selection.candidates.map((s) => `"${s}"`).join(', ')}`);
		}
		process.exit(1);
	}

	// 4. Validate refrakt compatibility (ADR-023) before wiring it in.
	const compat = validateCompat(readThemeCompatRange(cwd, pluginName), getProjectRefraktVersion(cwd));
	if (compat.errors.length > 0) {
		console.error('');
		console.error(`Error: theme "${pluginName}" is not compatible with this project:`);
		for (const e of compat.errors) console.error(`  ✗ ${e}`);
		console.error('The package was installed but refrakt.config.json was not updated.');
		process.exit(1);
	}

	// 5. Point the site's theme at the package.
	const previousTheme = setSiteTheme(configData.raw, selection.key, pluginName);
	writeRefraktConfigFile(configData.path, configData.raw);

	// 6. Framework-aware export validation (ADR-024).
	const pkg = readInstalledManifest(cwd, pluginName);
	const warnings = [...validateThemeExports(pkg), ...compat.warnings];
	const layers = detectFrameworkLayers(pkg);

	// 7. Report.
	console.log('');
	console.log(`Theme "${pluginName}" installed successfully${selection.key !== 'default' ? ` for site "${selection.key}"` : ''}.`);
	if (previousTheme !== pluginName) {
		console.log(`  Updated refrakt.config.json: "${previousTheme ?? '(none)'}" → "${pluginName}"`);
	}
	console.log(`  Framework layer: ${layers.length ? layers.join(', ') : 'none (framework-agnostic)'}`);
	if (warnings.length > 0) {
		console.log('');
		console.log('Warnings:');
		for (const w of warnings) console.log(`  ⚠ ${w}`);
	}
	console.log('');
	console.log('Run your dev server to see the new theme in action.');
}

/** Show info about the currently configured theme. */
export async function themeInfoCommand(options: ThemeInfoOptions): Promise<void> {
	const cwd = process.cwd();

	let configData;
	try {
		configData = loadRefraktConfigFile(cwd);
	} catch {
		console.error('Error: No refrakt.config.json found in the current directory.');
		process.exit(1);
	}

	const selection = resolveTargetSite(configData.raw, options.site, 'existing');
	const themeName = selection.key ? readThemeForSite(configData.raw, selection.key) : undefined;
	if (!themeName) {
		console.error('Error: refrakt.config.json does not declare a theme for the selected site.');
		process.exit(1);
	}
	console.log(`Current theme: ${themeName}`);

	const pkg = readInstalledManifest(cwd, themeName);
	if (pkg) {
		console.log(`  Version: ${pkg.version ?? 'unknown'}`);
		if (pkg.description) console.log(`  Description: ${pkg.description}`);
		const exportsMap = (pkg.exports ?? {}) as Record<string, unknown>;
		const features: string[] = [];
		if (exportsMap['./transform']) features.push('transform');
		if (exportsMap['./layouts']) features.push('layouts');
		if (exportsMap['./styles/runes/*.css']) features.push('rune CSS');
		const layers = detectFrameworkLayers(pkg);
		if (features.length) console.log(`  Provides: ${features.join(', ')}`);
		console.log(`  Framework layer: ${layers.length ? layers.join(', ') : 'none (framework-agnostic)'}`);
	} else if (themeName.startsWith('.')) {
		console.log(`  Type: Local directory`);
		console.log(`  Path: ${resolve(cwd, themeName)}`);
	} else {
		console.log(`  Status: Not found in node_modules`);
	}
}

/** List installed themes (packages exporting `./transform`) + the active one
 *  (SPEC-110 §5). */
export async function themeListCommand(_options: ThemeListOptions): Promise<void> {
	const cwd = process.cwd();
	let configData;
	try {
		configData = loadRefraktConfigFile(cwd);
	} catch {
		console.error('Error: No refrakt.config.json found in the current directory.');
		process.exit(1);
	}

	const active = new Set<string>();
	for (const key of (configData.raw.site ? ['default'] : Object.keys(configData.raw.sites ?? {}))) {
		const t = readThemeForSite(configData.raw, key);
		if (t) active.add(t);
	}

	const modulesDir = resolve(cwd, 'node_modules');
	const found: Array<{ name: string; version: string; layers: string[] }> = [];
	for (const dir of listPackageDirs(modulesDir)) {
		const pkg = readInstalledManifest(cwd, dir);
		const exportsMap = (pkg?.exports ?? {}) as Record<string, unknown>;
		if (pkg && exportsMap['./transform']) {
			found.push({ name: dir, version: String(pkg.version ?? '?'), layers: detectFrameworkLayers(pkg) });
		}
	}

	if (found.length === 0) {
		console.log('No themes (packages exporting ./transform) found in node_modules.');
		return;
	}
	console.log('Installed themes:');
	for (const t of found.sort((a, b) => a.name.localeCompare(b.name))) {
		const marker = active.has(t.name) ? '*' : ' ';
		const layer = t.layers.length ? ` [${t.layers.join(', ')}]` : ' [framework-agnostic]';
		console.log(`  ${marker} ${t.name}@${t.version}${layer}`);
	}
	if (active.size) console.log(`\n  * = active`);
}

/** Enumerate package directories under node_modules, descending into a single
 *  level of scopes (`@scope/name`). */
function listPackageDirs(modulesDir: string): string[] {
	if (!existsSync(modulesDir)) return [];
	const out: string[] = [];
	const isDir = (e: { isDirectory(): boolean; isSymbolicLink(): boolean }) => e.isDirectory() || e.isSymbolicLink();
	for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
		if (!isDir(entry)) continue;
		if (entry.name.startsWith('@')) {
			for (const sub of readdirSync(resolve(modulesDir, entry.name), { withFileTypes: true })) {
				if (isDir(sub)) out.push(`${entry.name}/${sub.name}`);
			}
		} else if (!entry.name.startsWith('.')) {
			out.push(entry.name);
		}
	}
	return out;
}

/** Read the theme package name configured for a given site key. */
function readThemeForSite(raw: import('@refrakt-md/types').RefraktConfig, key: string): string | undefined {
	const site = key === 'default' && raw.site ? raw.site : raw.sites?.[key];
	const value = site?.theme ?? raw.theme;
	if (value === undefined) return undefined;
	return typeof value === 'string' ? value : value.package;
}
