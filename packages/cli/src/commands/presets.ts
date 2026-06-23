/** Preset-pack discovery, listing, and validation (SPEC-111 §4).
 *
 *  A preset pack is any installed package carrying a `presets.json` — a
 *  capability scanned independently of `kind` (SPEC-111 §1), so a theme that
 *  also ships presets is found here too. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PresetEntry, PresetPackManifest, PresetScope } from '@refrakt-md/types';
import { execSync } from 'node:child_process';
import { loadRefraktConfigFile, writeRefraktConfigFile } from '../config-file.js';
import {
	validatePresetEntry,
	resolveSource,
	buildInstallCommand,
	readInstalledManifest,
	getProjectRefraktVersion,
	validateCompat,
	resolveTargetSite,
	appendSitePreset,
} from './install.js';

export interface PresetsListOptions {
	scope?: PresetScope;
}

export interface PresetsValidateOptions {
	/** Pack package name or directory; defaults to scanning all installed packs. */
	pack?: string;
}

export interface PresetsInstallOptions {
	source: string;
	/** Preset id to append to the target site's `theme.presets`. */
	use?: string;
	site?: string;
	registry?: string;
}

interface DiscoveredPack {
	packageName: string;
	dir: string;
	manifest: PresetPackManifest;
}

/** Find installed packages carrying a `presets.json`. */
function discoverPacks(cwd: string): DiscoveredPack[] {
	const modulesDir = resolve(cwd, 'node_modules');
	if (!existsSync(modulesDir)) return [];
	const packs: DiscoveredPack[] = [];
	const consider = (pkgDir: string, packageName: string) => {
		const manifestPath = resolve(pkgDir, 'presets.json');
		if (!existsSync(manifestPath)) return;
		try {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PresetPackManifest;
			if (Array.isArray(manifest.presets)) packs.push({ packageName, dir: pkgDir, manifest });
		} catch {
			// skip malformed
		}
	};
	const isDir = (e: { isDirectory(): boolean; isSymbolicLink(): boolean }) => e.isDirectory() || e.isSymbolicLink();
	for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
		if (!isDir(entry)) continue;
		if (entry.name.startsWith('@')) {
			const scopeDir = resolve(modulesDir, entry.name);
			for (const sub of readdirSync(scopeDir, { withFileTypes: true })) {
				if (isDir(sub)) consider(resolve(scopeDir, sub.name), `${entry.name}/${sub.name}`);
			}
		} else if (!entry.name.startsWith('.')) {
			consider(resolve(modulesDir, entry.name), entry.name);
		}
	}
	return packs;
}

/** Active theme package(s) across all sites — used to flag compatibility. */
function activeThemes(raw: import('@refrakt-md/types').RefraktConfig): string[] {
	const out = new Set<string>();
	const add = (t: string | { package: string } | undefined) => {
		if (!t) return;
		out.add(typeof t === 'string' ? t : t.package);
	};
	if (raw.site) add(raw.site.theme);
	for (const site of Object.values(raw.sites ?? {})) add(site.theme);
	add(raw.theme);
	return [...out];
}

/** `refrakt theme presets list` — list presets from installed packs + the active
 *  theme, filterable by `--scope` and flagged by compatibility (SPEC-111 §4). */
export async function themePresetsListCommand(options: PresetsListOptions): Promise<void> {
	const cwd = process.cwd();
	let raw: import('@refrakt-md/types').RefraktConfig | undefined;
	try {
		raw = loadRefraktConfigFile(cwd).raw;
	} catch {
		// listing works without a project config; compatibility flags are just omitted
	}
	const themes = raw ? activeThemes(raw) : [];
	const packs = discoverPacks(cwd);

	if (packs.length === 0) {
		console.log('No preset packs (packages with presets.json) found in node_modules.');
		return;
	}

	let total = 0;
	for (const pack of packs) {
		const entries = pack.manifest.presets.filter((p) => !options.scope || p.scope === options.scope);
		if (entries.length === 0) continue;
		console.log(`\n${pack.packageName}:`);
		for (const p of entries) {
			total++;
			console.log(`  ${formatEntry(p, themes)}`);
		}
	}
	if (total === 0) {
		console.log(`No presets${options.scope ? ` with scope "${options.scope}"` : ''} found.`);
	} else if (themes.length) {
		console.log(`\n  ⚠ = palette preset not tuned for the active theme (${themes.join(', ')}); still applies, may need adjustment`);
	}
}

function formatEntry(p: PresetEntry, activeThemeNames: string[]): string {
	const ref = `${p.id} — ${p.title} [${p.scope}]`;
	// Universal (syntax, or no tunedFor) is always compatible.
	if (p.scope === 'syntax' || !p.tunedFor || p.tunedFor.length === 0) return ref;
	const tuned = activeThemeNames.some((t) => p.tunedFor!.includes(t));
	return tuned ? ref : `⚠ ${ref}`;
}

/** `refrakt theme presets install <source>` — the lightest apply (SPEC-110 §4):
 *  resolve via the shared resolver, add the dependency, validate `presets.json`
 *  + compat, and optionally append `--use <id>` to the target site's
 *  `theme.presets`. No scaffold-copy, no site creation, no `theme`-field change. */
export async function themePresetsInstallCommand(options: PresetsInstallOptions): Promise<void> {
	const cwd = process.cwd();
	let resolved;
	try {
		resolved = resolveSource(options.source, cwd);
	} catch (err) {
		console.error(`Error: ${(err as Error).message}`);
		process.exit(1);
	}
	const { name: pmName, cmd } = buildInstallCommand(resolved.installSource, { registry: options.registry, cwd });
	console.log(`Using ${pmName} to install preset pack "${resolved.name}"...`);
	try {
		execSync(cmd, { cwd, stdio: 'inherit' });
	} catch {
		console.error(`\nError: Failed to install. Command: ${cmd}`);
		process.exit(1);
	}

	// Validate the installed pack's manifest + compat.
	const packDir = resolve(cwd, 'node_modules', resolved.name);
	const manifestPath = resolve(packDir, 'presets.json');
	if (!existsSync(manifestPath)) {
		console.error(`Error: "${resolved.name}" has no presets.json — it is not a preset pack.`);
		process.exit(1);
	}
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PresetPackManifest;
	const compat = validateCompat(manifest.refrakt ?? (readInstalledManifest(cwd, resolved.name)?.refrakt as string | undefined), getProjectRefraktVersion(cwd));
	for (const w of compat.warnings) console.log(`  ⚠ ${w}`);
	if (compat.errors.length) {
		for (const e of compat.errors) console.error(`  ✗ ${e}`);
		console.error('The pack was installed but no preset was applied.');
		process.exit(1);
	}

	// Optionally append the chosen preset to the target site.
	if (options.use) {
		const entry = manifest.presets.find((p) => p.id === options.use);
		if (!entry) {
			console.error(`Error: preset "${options.use}" not found in ${resolved.name} (have: ${manifest.presets.map((p) => p.id).join(', ')}).`);
			process.exit(1);
		}
		const configData = loadRefraktConfigFile(cwd);
		const selection = resolveTargetSite(configData.raw, options.site, 'existing');
		if (!selection.key) {
			console.error(`Error: ${selection.error}.`);
			process.exit(1);
		}
		// The preset module identifier the loader resolves: package + export subpath.
		const moduleId = `${resolved.name}/${entry.id}`;
		appendSitePreset(configData.raw, selection.key, moduleId);
		writeRefraktConfigFile(configData.path, configData.raw);
		console.log(`\nApplied preset "${entry.id}" → ${selection.key !== 'default' ? `site "${selection.key}" ` : ''}theme.presets ("${moduleId}").`);
		console.log('Ensure the pack exports that preset subpath (e.g. "./' + entry.id + '" → its module).');
	} else {
		console.log(`\nInstalled. Apply a preset with: refrakt theme presets install ${options.source} --use <id>`);
		console.log(`Available: ${manifest.presets.map((p) => p.id).join(', ')}`);
	}
}

/** `refrakt theme presets validate` — validate pack manifests: scope vs actual
 *  tokens (for JSON-carrier presets), `tunedFor` well-formedness, and module
 *  resolvability (SPEC-111 §4). Returns a non-zero exit on errors. */
export async function themePresetsValidateCommand(options: PresetsValidateOptions): Promise<void> {
	const cwd = process.cwd();
	let packs = discoverPacks(cwd);
	if (options.pack) {
		packs = packs.filter((p) => p.packageName === options.pack);
		if (packs.length === 0) {
			// Allow a direct directory path.
			const dir = resolve(cwd, options.pack);
			const manifestPath = resolve(dir, 'presets.json');
			if (existsSync(manifestPath)) {
				packs = [{ packageName: options.pack, dir, manifest: JSON.parse(readFileSync(manifestPath, 'utf-8')) }];
			}
		}
	}
	if (packs.length === 0) {
		console.error('No preset packs found to validate.');
		process.exit(1);
	}

	let errors = 0;
	let warnings = 0;
	for (const pack of packs) {
		console.log(`\n${pack.packageName}:`);
		for (const entry of pack.manifest.presets) {
			const modulePath = resolve(pack.dir, entry.module ?? '');
			let config: Record<string, unknown> | undefined;
			let resolveError: string | undefined;
			if (!entry.module) {
				resolveError = `preset "${entry.id}" has no "module"`;
			} else if (!existsSync(modulePath)) {
				resolveError = `preset "${entry.id}" module "${entry.module}" does not resolve`;
			} else if (entry.module.endsWith('.json')) {
				// JSON carrier — read directly for scope-vs-tokens validation.
				try {
					config = JSON.parse(readFileSync(modulePath, 'utf-8')) as Record<string, unknown>;
				} catch (err) {
					resolveError = `preset "${entry.id}" JSON is invalid: ${(err as Error).message}`;
				}
			}
			// JS/TS carriers aren't loaded here (may need a build) — scope-vs-tokens
			// is skipped for them, but resolvability is still checked.
			const { errors: e, warnings: w } = validatePresetEntry(entry, config);
			const all = [...(resolveError ? [resolveError] : []), ...e];
			for (const msg of all) { console.log(`  ✗ ${msg}`); errors++; }
			for (const msg of w) { console.log(`  ⚠ ${msg}`); warnings++; }
			if (all.length === 0 && w.length === 0) console.log(`  ✓ ${entry.id} [${entry.scope}]`);
		}
	}
	console.log(`\n${errors} error(s), ${warnings} warning(s).`);
	if (errors > 0) process.exit(1);
}
