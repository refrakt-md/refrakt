/**
 * Normalization for refrakt.config.json.
 *
 * Three valid input shapes — all collapse to the same canonical form:
 * - **Flat** (legacy): top-level `contentDir`, `theme`, `target`, … Paths
 *   are interpreted relative to the consumer's working directory (vite's
 *   resolvedRoot for adapters), preserving pre-v0.11.0 behavior.
 * - **Singular**: `{ "site": { contentDir, theme, target, … } }`. Paths are
 *   absolutized against the config file's directory at normalization time,
 *   so adapters always see file-relative semantics.
 * - **Plural**: `{ "sites": { "main": { … }, "blog": { … } } }`. Same
 *   path semantics as singular.
 *
 * Flat and singular shapes both produce `sites.main` (the canonical default
 * site name, matching what `create-refrakt` scaffolds). Plural shapes pass
 * through with their declared names. The `site` and `sites` keys are
 * mutually exclusive.
 */

import { dirname, isAbsolute, resolve } from 'node:path';
import type { PlanConfig, RefraktConfig, SiteConfig } from '@refrakt-md/types';

/** Default site name used when promoting flat / singular configs to the
 *  canonical `sites` map. Matches `create-refrakt` scaffold output. */
export const DEFAULT_SITE_NAME = 'main';

/** Tracks whether the flat-shape deprecation warning has already been emitted
 *  for this process, so we only nag the user once even if the loader runs
 *  many times during a build. */
let flatShapeWarningEmitted = false;

/** Tracks whether the legacy `packages` field deprecation warning has already
 *  been emitted for this process. Renamed to `plugins` in v0.12.0; the old
 *  field is auto-migrated with a warning until v1.0. */
let legacyPackagesWarningEmitted = false;

/** Reset the once-per-process flags — only useful for tests. */
export function __resetFlatShapeWarningForTests(): void {
	flatShapeWarningEmitted = false;
	legacyPackagesWarningEmitted = false;
}

/** A normalized refrakt config — `sites` is always populated, and the legacy
 *  flat fields mirror the lone site when there is exactly one so existing
 *  adapter code continues to work without changes. */
export interface NormalizedRefraktConfig extends RefraktConfig {
	/** Always populated, keyed by site name. Single-site projects (flat or
	 *  singular shape) use the key `main` (matching scaffolds). Multi-site
	 *  projects use whatever names appear under `sites`. */
	sites: Record<string, SiteConfig>;
}

export interface NormalizeOptions {
	/** Path to the config file's directory. When provided, relative paths in
	 *  nested-shape (`site` / `sites`) inputs are absolutized against it so
	 *  they're interpreted file-relative rather than cwd-relative. Flat-shape
	 *  paths are left as-is for legacy cwd-relative behavior. */
	configDir?: string;
	/** Suppress the once-per-process flat-shape deprecation warning. Used by
	 *  tooling that intentionally inspects flat-shape configs (e.g., the
	 *  migration command itself) so it doesn't double-warn on top of its own
	 *  output. */
	suppressFlatShapeWarning?: boolean;
	/** Suppress the once-per-process legacy-`packages`-field deprecation warning. */
	suppressLegacyPackagesWarning?: boolean;
}

/** Site fields that mirror to the top level of the config when there is exactly
 *  one site, so adapters that read `config.contentDir` keep working. */
const SITE_FIELDS = [
	'contentDir',
	'theme',
	'target',
	'overrides',
	'routeRules',
	'highlight',
	'icons',
	'plugins',
	// `tints` is intentionally NOT mirrored to the top level — the deprecated
	// `RefraktConfig.tints` flat-shape field was dropped in SPEC-053. Use
	// `sites.<name>.tints` (or the singular `site.tints`) instead.
	'backgrounds',
	'sandbox',
	'baseUrl',
	'siteName',
	'defaultImage',
	'logo',
	'runes',
] as const satisfies readonly (keyof SiteConfig)[];

/**
 * Normalize a raw refrakt config object into the canonical form.
 *
 * Throws on structural errors (e.g., declaring both `site` and `sites`).
 * Does not perform deep validation of individual fields — that responsibility
 * stays with the adapter or CLI consumer that knows what fields it requires.
 */
export function normalizeRefraktConfig(
	raw: unknown,
	options: NormalizeOptions = {},
): NormalizedRefraktConfig {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error('refrakt.config.json must be a JSON object');
	}

	// Auto-migrate the legacy `packages` field (renamed to `plugins` in v0.12.0).
	// Handles top-level (flat shape) and per-site occurrences. Emits a one-time
	// deprecation warning so users learn to rename, but keeps the site building.
	const migratedFromLegacyPackages = renameLegacyPackagesField(raw as Record<string, unknown>);
	if (migratedFromLegacyPackages && !legacyPackagesWarningEmitted && !options.suppressLegacyPackagesWarning) {
		legacyPackagesWarningEmitted = true;
		const where = options.configDir ? ` (${options.configDir}/refrakt.config.json)` : '';
		// eslint-disable-next-line no-console
		console.warn(
			`[refrakt] refrakt.config.json uses the legacy \`packages\` field${where}. ` +
				`Rename to \`plugins\` — the field was renamed in v0.12.0 when rune packages and ` +
				`CLI plugins were unified. The legacy field will be removed in v1.0.`,
		);
	}

	const input = raw as RefraktConfig;

	const hasSingular = input.site !== undefined;
	const hasPlural = input.sites !== undefined;
	const configDir = options.configDir;

	if (hasSingular && hasPlural) {
		throw new Error(
			'refrakt.config.json: declare either "site" (singular) or "sites" (plural map), not both. ' +
				'Use "sites" for multi-site projects.',
		);
	}

	// Build the sites map.
	let sites: Record<string, SiteConfig>;

	if (hasPlural) {
		if (typeof input.sites !== 'object' || input.sites === null || Array.isArray(input.sites)) {
			throw new Error('refrakt.config.json: "sites" must be an object mapping names to site configs');
		}
		const entries = Object.entries(input.sites);
		if (entries.length === 0) {
			throw new Error('refrakt.config.json: "sites" must declare at least one site');
		}
		sites = {};
		for (const [name, site] of entries) {
			// Nested-shape paths are file-relative — absolutize against configDir
			// when we have one so adapters see absolute paths and don't have to
			// guess the anchor.
			sites[name] = configDir ? absolutizeSitePaths(site as SiteConfig, configDir) : (site as SiteConfig);
		}
	} else if (hasSingular) {
		const site = configDir ? absolutizeSitePaths(input.site as SiteConfig, configDir) : (input.site as SiteConfig);
		sites = { [DEFAULT_SITE_NAME]: site };
	} else if (hasFlatSiteFields(input)) {
		// Flat shape — leave paths as-is so legacy cwd-relative resolution
		// continues to work in adapters. Deprecated in v0.12.0; will be
		// removed in v1.0. Emit a one-time warning to nudge migration.
		if (!flatShapeWarningEmitted && !options.suppressFlatShapeWarning) {
			flatShapeWarningEmitted = true;
			const where = options.configDir ? ` (${options.configDir}/refrakt.config.json)` : '';
			// eslint-disable-next-line no-console
			console.warn(
				`[refrakt] refrakt.config.json uses the legacy flat shape${where}. ` +
					`Run \`refrakt config migrate\` to upgrade to the nested form. ` +
					`Flat shape is deprecated in v0.12 and will be removed in v1.0.`,
			);
		}
		sites = { [DEFAULT_SITE_NAME]: extractFlatSite(input) };
	} else {
		// Plan-only or empty config — sites map is empty but still defined.
		sites = {};
	}

	// Build the normalized config. When there is exactly one site, mirror its
	// fields to the top level so legacy adapter code keeps working.
	const normalized: NormalizedRefraktConfig = {
		...input,
		sites,
	};

	const siteEntries = Object.entries(sites);
	if (siteEntries.length === 1) {
		const [, only] = siteEntries[0]!;
		mirrorSiteToTopLevel(only, normalized);
	}

	// Clean up: drop the singular `site` field on the normalized output since
	// `sites.main` is the canonical home for promoted single-site configs.
	delete (normalized as { site?: unknown }).site;

	return normalized;
}

/** True if any flat-shape site field is present at the top level. */
function hasFlatSiteFields(input: RefraktConfig): boolean {
	return SITE_FIELDS.some((field) => input[field] !== undefined);
}

/** Rewrite legacy `packages` fields to `plugins` in-place across every level
 *  where they can appear (top-level, `site.*`, `sites.X.*`). Returns true if
 *  any rewrite happened, so the caller can warn the user.
 *
 *  When both `packages` and `plugins` are set on the same object, the values
 *  are unioned (plugins entries first, then any packages entries not already
 *  present) and the legacy field is dropped. */
function renameLegacyPackagesField(raw: Record<string, unknown>): boolean {
	let migrated = false;

	const rewriteOne = (obj: Record<string, unknown>): void => {
		if (!Array.isArray(obj.packages)) return;
		const legacy = obj.packages as unknown[];
		const existing = Array.isArray(obj.plugins) ? (obj.plugins as unknown[]) : [];
		const seen = new Set(existing);
		const merged = [...existing];
		for (const entry of legacy) {
			if (!seen.has(entry)) {
				seen.add(entry);
				merged.push(entry);
			}
		}
		obj.plugins = merged;
		delete obj.packages;
		migrated = true;
	};

	rewriteOne(raw);

	if (raw.site && typeof raw.site === 'object' && !Array.isArray(raw.site)) {
		rewriteOne(raw.site as Record<string, unknown>);
	}

	if (raw.sites && typeof raw.sites === 'object' && !Array.isArray(raw.sites)) {
		for (const site of Object.values(raw.sites as Record<string, unknown>)) {
			if (site && typeof site === 'object' && !Array.isArray(site)) {
				rewriteOne(site as Record<string, unknown>);
			}
		}
	}

	return migrated;
}

/** Resolve site-scoped path fields against the config file's directory.
 *
 *  Applies to: `contentDir`, `sandbox.examplesDir`, `theme` (when relative),
 *  `overrides` values, `runes.local` values. Package names (e.g.,
 *  `@refrakt-md/lumina`) and absolute paths are passed through unchanged. */
function absolutizeSitePaths(site: SiteConfig, configDir: string): SiteConfig {
	const result: SiteConfig = { ...site };
	result.contentDir = absolutizeIfRelative(site.contentDir, configDir);
	if (typeof site.theme === 'string') {
		result.theme = absolutizeIfRelative(site.theme, configDir);
	}
	if (site.sandbox?.examplesDir) {
		result.sandbox = {
			...site.sandbox,
			examplesDir: absolutizeIfRelative(site.sandbox.examplesDir, configDir),
		};
	}
	if (site.overrides) {
		const overrides: Record<string, string> = {};
		for (const [key, value] of Object.entries(site.overrides)) {
			overrides[key] = absolutizeIfRelative(value, configDir);
		}
		result.overrides = overrides;
	}
	if (site.runes?.local) {
		const local: Record<string, string> = {};
		for (const [key, value] of Object.entries(site.runes.local)) {
			local[key] = absolutizeIfRelative(value, configDir);
		}
		result.runes = { ...site.runes, local };
	}
	return result;
}

/** Absolutize a path string against a base directory if it's relative AND
 *  starts with `./` or `../` (i.e., looks like a file path rather than a
 *  package name like `@refrakt-md/lumina`). Already-absolute paths pass
 *  through unchanged. */
function absolutizeIfRelative(value: string, base: string): string {
	if (isAbsolute(value)) return value;
	if (!value.startsWith('./') && !value.startsWith('../')) return value;
	return resolve(base, value);
}

/** Pull the flat-shape fields off the top level into a SiteConfig. */
function extractFlatSite(input: RefraktConfig): SiteConfig {
	const site: Record<string, unknown> = {};
	for (const field of SITE_FIELDS) {
		const value = input[field];
		if (value !== undefined) {
			site[field] = value;
		}
	}
	return site as unknown as SiteConfig;
}

/** Copy a site's fields onto the top level of the normalized config. */
function mirrorSiteToTopLevel(site: SiteConfig, target: NormalizedRefraktConfig): void {
	const targetRecord = target as unknown as Record<string, unknown>;
	for (const field of SITE_FIELDS) {
		const value = site[field];
		if (value !== undefined && targetRecord[field] === undefined) {
			targetRecord[field] = value;
		}
	}
}

/** Resolve a site by name from a normalized config.
 *
 *  - If `requested` is provided, returns that site or throws if it does not exist.
 *  - If `requested` is omitted and there is exactly one site, returns that site.
 *  - If `requested` is omitted and there are multiple sites, throws with the available names.
 *  - If there are no sites (plan-only repo), throws with a hint to add a site section. */
export function resolveSite(
	config: NormalizedRefraktConfig,
	requested?: string,
): { name: string; site: SiteConfig } {
	const entries = Object.entries(config.sites);
	if (entries.length === 0) {
		throw new Error(
			'No site configured in refrakt.config.json. Add a "site" or "sites" section to use site-scoped commands.',
		);
	}

	if (requested !== undefined) {
		const site = config.sites[requested];
		if (site === undefined) {
			const names = Object.keys(config.sites);
			const suggestion = closestMatch(requested, names);
			const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
			throw new Error(
				`Site "${requested}" is not declared in refrakt.config.json. Available: ${names.map((n) => `"${n}"`).join(', ')}.${hint}`,
			);
		}
		return { name: requested, site };
	}

	if (entries.length === 1) {
		const [name, site] = entries[0]!;
		return { name, site };
	}

	const names = Object.keys(config.sites);
	throw new Error(
		`refrakt.config.json declares multiple sites (${names.map((n) => `"${n}"`).join(', ')}). Pass an explicit site name.`,
	);
}

/** Resolve plan configuration with sensible defaults. */
export function resolvePlanConfig(config: NormalizedRefraktConfig): Required<PlanConfig> {
	return {
		dir: config.plan?.dir ?? 'plan',
	};
}

/** Cheap Levenshtein-style closest-match for "did you mean?" suggestions. */
function closestMatch(input: string, candidates: string[]): string | undefined {
	if (candidates.length === 0) return undefined;
	let best: { name: string; distance: number } | undefined;
	for (const candidate of candidates) {
		const distance = levenshtein(input, candidate);
		if (!best || distance < best.distance) {
			best = { name: candidate, distance };
		}
	}
	return best && best.distance <= 2 ? best.name : undefined;
}

function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i]![0] = i;
	for (let j = 0; j <= n; j++) dp[0]![j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i]![j] = Math.min(
				dp[i - 1]![j]! + 1,
				dp[i]![j - 1]! + 1,
				dp[i - 1]![j - 1]! + cost,
			);
		}
	}
	return dp[m]![n]!;
}
