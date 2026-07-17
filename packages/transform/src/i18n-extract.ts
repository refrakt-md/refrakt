/**
 * SPEC-035 — auto-derived i18n key extraction.
 *
 * Walks a resolved {@link ThemeConfig} and emits every derivable framework
 * string as a flat `key → English default` dictionary — the same shape used by
 * translation files (Decision D3), so `extract → translate → commit <locale>.json`
 * round-trips. This is the discoverability mitigation that makes auto-derived
 * keys (Decision D1) usable, and the single source shared by the CLI
 * (`refrakt i18n extract`) and the MCP wrapper.
 *
 * Keys covered:
 *   - Zone 1 — meta-field / structure labels: `{scope}.{block}.{ref}`
 *   - Zone 3 — layout chrome: `layout.*` (from `LAYOUT_STRINGS`)
 *   - Zone 4 — computed navigation: `core.*` (from `COMPUTED_STRINGS`)
 *   - Zone 6 — enum-as-text display values: `{scope}.{block}.{value}`
 *     (from each rune's `i18nEnums` declaration)
 */

import type { ThemeConfig, RuneConfig, StructureEntry } from './types.js';
import { LAYOUT_STRINGS } from './layout.js';
import { COMPUTED_STRINGS } from './computed.js';

/** The auto-derived label key for a field/entry `ref` on a rune. */
function labelKey(config: RuneConfig, ref: string, override?: string): string {
	return override ?? `${config.scope ?? 'core'}.${config.block}.${ref}`;
}

/** Collect labels from a structure-entry tree (legacy `StructureEntry.label`). */
function collectStructureLabels(
	config: RuneConfig,
	entries: Record<string, StructureEntry> | undefined,
	out: Record<string, string>,
): void {
	if (!entries) return;
	const walk = (name: string, entry: StructureEntry) => {
		if (entry.label) out[labelKey(config, entry.ref ?? name, entry.i18nKey)] = entry.label;
		for (const child of entry.children ?? []) {
			if (typeof child !== 'string') walk(child.ref ?? '', child);
		}
	};
	for (const [name, entry] of Object.entries(entries)) walk(name, entry);
}

/**
 * Extract the complete `key → English default` dictionary from a theme config.
 * The result is sorted by key for stable diffs.
 */
export function extractI18nKeys(config: ThemeConfig): Record<string, string> {
	const out: Record<string, string> = {};

	// Zone 3 + Zone 4 — framework-owned chrome catalogs.
	Object.assign(out, LAYOUT_STRINGS, COMPUTED_STRINGS);

	// Zone 1 + Zone 6 — per-rune derived keys.
	for (const runeConfig of Object.values(config.runes)) {
		// Meta-field labels.
		for (const [fieldName, field] of Object.entries(runeConfig.metaFields ?? {})) {
			if (field.label) out[labelKey(runeConfig, fieldName, field.i18nKey)] = field.label;
		}
		// Legacy structure labels.
		collectStructureLabels(runeConfig, runeConfig.structure, out);
		// Enum-as-text display values (Zone 6): `{scope}.{block}.{value}`.
		for (const [value, text] of Object.entries(runeConfig.i18nEnums ?? {})) {
			out[`${runeConfig.scope ?? 'core'}.${runeConfig.block}.${value}`] = text;
		}
	}

	// Stable, sorted output.
	return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/** One key's coverage status for a target locale bundle. */
export interface I18nCoverageEntry {
	key: string;
	/** The English default from the config. */
	default: string;
	/** Whether the target bundle provides this key. */
	translated: boolean;
}

/** Result of comparing an extracted key set against a locale bundle. */
export interface I18nCheckResult {
	/** Keys present in the config but missing from the bundle. */
	missing: string[];
	/** Keys present in the bundle but no longer derivable from the config. */
	orphaned: string[];
	/** Coverage fraction in `[0, 1]` — translated / total. */
	coverage: number;
	/** Total derivable keys. */
	total: number;
	/** Per-key detail. */
	entries: I18nCoverageEntry[];
}

/**
 * Compare an extracted key set against a translation bundle: report missing
 * keys (a new labelled field with no entry), orphaned keys (a stale entry after
 * a rename), and coverage. Powers `refrakt i18n extract --check`.
 */
export function checkI18nBundle(
	extracted: Record<string, string>,
	bundle: Record<string, unknown>,
): I18nCheckResult {
	const keys = Object.keys(extracted);
	const missing: string[] = [];
	const entries: I18nCoverageEntry[] = keys.map(key => {
		const translated = Object.prototype.hasOwnProperty.call(bundle, key);
		if (!translated) missing.push(key);
		return { key, default: extracted[key], translated };
	});
	const orphaned = Object.keys(bundle).filter(k => !Object.prototype.hasOwnProperty.call(extracted, k));
	const total = keys.length;
	const translatedCount = total - missing.length;
	return {
		missing,
		orphaned,
		coverage: total === 0 ? 1 : translatedCount / total,
		total,
		entries,
	};
}
