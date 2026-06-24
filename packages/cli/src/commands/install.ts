/** Shared install surface for distributable extensions (SPEC-110).
 *
 *  Source *resolution* (directory | tarball | registry → a concrete package
 *  name) is common to themes, templates, and preset packs; only the *apply*
 *  step differs per artifact (SPEC-110 §4). This module owns resolution,
 *  package-manager invocation, refrakt-compat validation (ADR-023), and the
 *  multi-site config helpers; the per-artifact apply lives alongside.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { RefraktConfig, SiteConfig, SiteThemeConfig } from '@refrakt-md/types';
import { checkRefraktCompat } from '@refrakt-md/types';
import { detectPackageManager } from '../config-file.js';

export type SourceType = 'directory' | 'tarball' | 'registry';

export interface ResolvedSource {
	/** Package name, known up front for every source type (SPEC-110 §1). */
	name: string;
	/** Version when discoverable (directory/tarball); absent for registry specs. */
	version?: string;
	/** Value handed to the package manager's add/install command. */
	installSource: string;
	sourceType: SourceType;
}

/** Extract the package name from a registry specifier, handling scopes and an
 *  optional `@version` / `@tag` / `@range` suffix. */
export function parsePackageName(spec: string): string {
	if (spec.startsWith('@')) {
		const slash = spec.indexOf('/');
		if (slash === -1) return spec;
		const at = spec.indexOf('@', slash);
		return at === -1 ? spec : spec.slice(0, at);
	}
	const at = spec.indexOf('@');
	return at <= 0 ? spec : spec.slice(0, at);
}

/** Read `package/package.json` from an npm `.tgz` (gzip + ustar tar), without a
 *  tar dependency — npm tarballs are a flat `package/` tree, so a minimal
 *  512-byte-record scan suffices (SPEC-110 §1). */
export function readPackageJsonFromTarball(tgzPath: string): { name?: string; version?: string } {
	const buf = gunzipSync(readFileSync(tgzPath));
	let offset = 0;
	while (offset + 512 <= buf.length) {
		const header = buf.subarray(offset, offset + 512);
		const name = header.subarray(0, 100).toString('utf-8').replace(/\0.*$/, '');
		if (name === '') break; // end-of-archive (zero block)
		const sizeOctal = header.subarray(124, 136).toString('utf-8').replace(/\0.*$/, '').trim();
		const size = sizeOctal ? parseInt(sizeOctal, 8) : 0;
		const contentStart = offset + 512;
		// npm prefixes every entry with "package/"; the manifest is package/package.json
		if (name === 'package/package.json') {
			const content = buf.subarray(contentStart, contentStart + size).toString('utf-8');
			try {
				const pkg = JSON.parse(content) as { name?: string; version?: string };
				return { name: pkg.name, version: pkg.version };
			} catch {
				return {};
			}
		}
		offset = contentStart + Math.ceil(size / 512) * 512;
	}
	return {};
}

/** Resolve a source (directory | tarball | registry name) to a concrete
 *  package name + install source (SPEC-110 §1–§2, §4). Throws on a tarball or
 *  directory whose name can't be determined. */
export function resolveSource(source: string, cwd: string = process.cwd()): ResolvedSource {
	const abs = isAbsolute(source) ? source : resolve(cwd, source);
	if (existsSync(abs)) {
		if (source.endsWith('.tgz') || source.endsWith('.tar.gz')) {
			const { name, version } = readPackageJsonFromTarball(abs);
			if (!name) {
				throw new Error(`Could not read a package name from tarball "${source}".`);
			}
			return { name, version, installSource: abs, sourceType: 'tarball' };
		}
		const pkgPath = resolve(abs, 'package.json');
		if (!existsSync(pkgPath)) {
			throw new Error(`No package.json found in "${abs}".`);
		}
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string; version?: string };
		if (!pkg.name) {
			throw new Error(`package.json in "${abs}" is missing a "name" field.`);
		}
		return { name: pkg.name, version: pkg.version, installSource: `file:${abs}`, sourceType: 'directory' };
	}
	// Registry specifier — name resolved up front; version known after install.
	return { name: parsePackageName(source), installSource: source, sourceType: 'registry' };
}

/** Build a package-manager add command, optionally pinned to a registry
 *  (SPEC-110 §2). Credentials are the package manager's concern, not refrakt's. */
export function buildInstallCommand(
	installSource: string,
	options: { registry?: string; cwd?: string } = {},
): { name: string; cmd: string } {
	const pm = detectPackageManager(options.cwd);
	const base = pm.installCmd(installSource);
	const cmd = options.registry ? `${base} --registry ${options.registry}` : base;
	return { name: pm.name, cmd };
}

/** Read an installed package's manifest from node_modules (post-install). */
export function readInstalledManifest(
	cwd: string,
	pkgName: string,
): Record<string, unknown> | undefined {
	const pkgPath = resolve(cwd, 'node_modules', pkgName, 'package.json');
	if (!existsSync(pkgPath)) return undefined;
	try {
		return JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

/** The current refrakt version, read from the CLI's own package.json. */
export function getProjectRefraktVersion(cwd: string): string | undefined {
	// Prefer an installed @refrakt-md/types (the version the project builds against).
	const fromTypes = readInstalledManifest(cwd, '@refrakt-md/types');
	if (fromTypes?.version) return String(fromTypes.version);
	const fromTransform = readInstalledManifest(cwd, '@refrakt-md/transform');
	if (fromTransform?.version) return String(fromTransform.version);
	return undefined;
}

/** Validate a distributable's declared `refrakt` range against the project
 *  (ADR-023). Returns a list of human messages: hard errors first, then
 *  warnings (e.g. a malformed range). */
export function validateCompat(
	declaredRange: string | undefined,
	projectVersion: string | undefined,
): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	if (!declaredRange) return { errors, warnings };
	if (!projectVersion) {
		warnings.push(`could not determine the project's refrakt version to validate "${declaredRange}"`);
		return { errors, warnings };
	}
	const result = checkRefraktCompat(declaredRange, projectVersion);
	if (!result.ok) {
		if (result.malformed) warnings.push(result.message!);
		else errors.push(result.message!);
	}
	return { errors, warnings };
}

/** Validate a theme's runtime exports, framework-aware (ADR-024): `./transform`
 *  is the required contract; a framework export (`./svelte`, …) is optional and
 *  its absence is NOT a warning. Returns warnings only. */
export function validateThemeExports(manifest: Record<string, unknown> | undefined): string[] {
	const warnings: string[] = [];
	if (!manifest) return ['Theme directory not found in node_modules — install may have failed'];
	const exportsMap = (manifest.exports ?? {}) as Record<string, unknown>;
	if (!exportsMap['./transform']) {
		warnings.push('Theme is missing ./transform export — CSS tree-shaking and identity-transform config will be unavailable');
	}
	return warnings;
}

/** List the framework component layers a theme provides (ADR-024). Empty = a
 *  framework-agnostic theme, which is normal. */
export function detectFrameworkLayers(manifest: Record<string, unknown> | undefined): string[] {
	if (!manifest) return [];
	const exportsMap = (manifest.exports ?? {}) as Record<string, unknown>;
	const layers: string[] = [];
	if (exportsMap['./svelte'] || exportsMap['./svelte/index.js']) layers.push('svelte');
	return layers;
}

// ─── Preset-pack validation (SPEC-111 §2–§4) ────────────────────────────────

/** Chrome (skeleton) token keys a `syntax`-scoped preset must NOT set. A syntax
 *  preset may touch only `syntax.*` and `color.code.*`; anything else under
 *  `color` is chrome and makes it a `palette` preset (SPEC-111 §2). */
export function presetChromeKeys(config: Record<string, unknown>): string[] {
	const keys = new Set<string>();
	const scanColor = (color: unknown, prefix: string) => {
		if (!color || typeof color !== 'object') return;
		for (const k of Object.keys(color as Record<string, unknown>)) {
			if (k === 'code') continue; // code surface is syntax-adjacent, allowed
			keys.add(`${prefix}color.${k}`);
		}
	};
	scanColor((config as { color?: unknown }).color, '');
	const modes = (config as { modes?: Record<string, { color?: unknown }> }).modes;
	if (modes && typeof modes === 'object') {
		for (const [mode, layer] of Object.entries(modes)) {
			scanColor(layer?.color, `modes.${mode}.`);
		}
	}
	return [...keys];
}

/** Validate one preset entry against its resolved token config (SPEC-111 §2–§4):
 *  declared `syntax` that sets chrome → warning; malformed `tunedFor` → warning. */
export function validatePresetEntry(
	entry: { id?: unknown; scope?: unknown; module?: unknown; tunedFor?: unknown },
	config: Record<string, unknown> | undefined,
): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const id = typeof entry.id === 'string' ? entry.id : '(unnamed)';
	if (entry.scope !== 'syntax' && entry.scope !== 'palette') {
		errors.push(`preset "${id}" has an invalid scope "${String(entry.scope)}" (expected "syntax" | "palette")`);
	}
	if (entry.tunedFor !== undefined) {
		if (!Array.isArray(entry.tunedFor) || (entry.tunedFor as unknown[]).some((t) => typeof t !== 'string')) {
			warnings.push(`preset "${id}" has a malformed "tunedFor" (expected an array of theme package names)`);
		}
	}
	if (config && entry.scope === 'syntax') {
		const chrome = presetChromeKeys(config);
		if (chrome.length > 0) {
			warnings.push(`preset "${id}" is declared scope "syntax" but sets chrome tokens (${chrome.join(', ')}) — it is really a "palette" preset`);
		}
	}
	return { errors, warnings };
}

// ─── Multi-site config helpers (SPEC-110 §3) ────────────────────────────────

/** Enumerate the site keys declared by a config, in either shape. The singular
 *  `site` shape reports as the implicit key `default`. */
export function listSiteKeys(raw: RefraktConfig): string[] {
	if (raw.site) return ['default'];
	if (raw.sites) return Object.keys(raw.sites);
	return [];
}

export type SiteSelectionMode = 'existing' | 'new';

export interface SiteSelection {
	/** The resolved key, or undefined when the caller must list + exit. */
	key?: string;
	/** Set when selection failed; the message explains why (e.g. ambiguous). */
	error?: string;
	/** Candidate keys to print when ambiguous. */
	candidates?: string[];
}

/** Resolve which site an install targets.
 *  - `existing`: pick the site to update. Inferred when exactly one exists;
 *    ambiguous (→ list + exit) when multiple and no `--site`.
 *  - `new`: the key must NOT collide with an existing site (full-site templates
 *    don't overlay — SPEC-109). */
export function resolveTargetSite(
	raw: RefraktConfig,
	siteFlag: string | undefined,
	mode: SiteSelectionMode,
): SiteSelection {
	const keys = listSiteKeys(raw);
	if (mode === 'existing') {
		if (siteFlag) {
			if (!keys.includes(siteFlag)) {
				return { error: `site "${siteFlag}" is not declared in refrakt.config.json`, candidates: keys };
			}
			return { key: siteFlag };
		}
		if (keys.length <= 1) return { key: keys[0] ?? 'default' };
		return { error: 'multiple sites declared; pass --site <name> to choose one', candidates: keys };
	}
	// mode === 'new'
	const key = siteFlag ?? 'default';
	if (keys.includes(key)) {
		return { error: `site "${key}" already exists; full-site templates create a new site (choose a fresh --site name)`, candidates: keys };
	}
	return { key };
}

/** Read a site's `SiteConfig` from either config shape by key. */
function getSite(raw: RefraktConfig, key: string): SiteConfig | undefined {
	if (key === 'default' && raw.site) return raw.site;
	return raw.sites?.[key];
}

/** Point a site's `theme` field at a package, preserving an existing object
 *  form's `presets`/`tokens`/`modes`/`colorScheme`. Returns the previous
 *  package name. The site must already exist. */
export function setSiteTheme(raw: RefraktConfig, key: string, pkgName: string): string | undefined {
	const apply = (current: string | SiteThemeConfig | undefined): { previous?: string; next: string | SiteThemeConfig } => {
		if (current === undefined || typeof current === 'string') {
			return { previous: typeof current === 'string' ? current : undefined, next: pkgName };
		}
		return { previous: current.package, next: { ...current, package: pkgName } };
	};
	const site = getSite(raw, key);
	if (!site) {
		// Fall back to the legacy flat top-level theme.
		const { previous, next } = apply(raw.theme);
		raw.theme = next;
		return previous;
	}
	const { previous, next } = apply(site.theme);
	site.theme = next;
	return previous;
}

/** Append a preset module to a site's `theme.presets`, normalising a string
 *  theme to the object form. No-op if already present. */
export function appendSitePreset(raw: RefraktConfig, key: string, presetModule: string): void {
	const site = getSite(raw, key);
	if (!site) return;
	const theme = site.theme;
	const obj: SiteThemeConfig = typeof theme === 'string' ? { package: theme } : { ...(theme ?? { package: '' }) };
	const presets = obj.presets ? [...obj.presets] : [];
	if (!presets.includes(presetModule)) presets.push(presetModule);
	obj.presets = presets;
	site.theme = obj;
}

/** Create a new site entry under `key`, migrating a singular `site:` config to
 *  the plural `sites: { default, <key> }` shape when adding a second site
 *  (SPEC-110 §3). */
export function createSite(raw: RefraktConfig, key: string, site: SiteConfig): void {
	if (raw.sites) {
		raw.sites[key] = site;
		return;
	}
	if (raw.site) {
		// Migrate singular → plural.
		raw.sites = { default: raw.site, [key]: site };
		delete raw.site;
		return;
	}
	if (key === 'default') {
		raw.site = site;
	} else {
		raw.sites = { [key]: site };
	}
}
