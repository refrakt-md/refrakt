/**
 * Normalization for refrakt.config.json.
 *
 * Three valid input shapes — all collapse to the same canonical form:
 * - **Flat** (legacy): top-level `contentDir`, `theme`, `target`, …
 * - **Singular**: `{ "site": { contentDir, theme, target, … } }`
 * - **Plural**: `{ "sites": { "main": { … }, "blog": { … } } }`
 *
 * Flat and singular shapes both produce `sites.default`. Plural shapes pass
 * through unchanged. The `site` and `sites` keys are mutually exclusive.
 */

import type { PlanConfig, RefraktConfig, SiteConfig } from '@refrakt-md/types';

/** A normalized refrakt config — `sites` is always populated, and the legacy
 *  flat fields mirror `sites.default` when there is exactly one site so existing
 *  adapter code continues to work without changes. */
export interface NormalizedRefraktConfig extends RefraktConfig {
	/** Always populated, keyed by site name. Single-site projects use the key
	 *  `default`. Multi-site projects use whatever names appear under `sites`. */
	sites: Record<string, SiteConfig>;
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
	'packages',
	'tints',
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
export function normalizeRefraktConfig(raw: unknown): NormalizedRefraktConfig {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error('refrakt.config.json must be a JSON object');
	}

	const input = raw as RefraktConfig;

	const hasSingular = input.site !== undefined;
	const hasPlural = input.sites !== undefined;

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
			sites[name] = site as SiteConfig;
		}
	} else if (hasSingular) {
		sites = { default: input.site as SiteConfig };
	} else if (hasFlatSiteFields(input)) {
		sites = { default: extractFlatSite(input) };
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
	// `sites.default` is the canonical home.
	delete (normalized as { site?: unknown }).site;

	return normalized;
}

/** True if any flat-shape site field is present at the top level. */
function hasFlatSiteFields(input: RefraktConfig): boolean {
	return SITE_FIELDS.some((field) => input[field] !== undefined);
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
