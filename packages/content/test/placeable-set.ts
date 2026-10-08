import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Schema } from '@markdoc/markdoc';
import {
	runes as coreRunes,
	baseConfig,
	loadPlugin,
	mergePlugins,
	tableFor,
	SUBORDINATE_SCHEMA_TYPES,
} from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import { assembleMarkdocSchemas } from '../src/site.js';

/**
 * SPEC-145 D12 — the set of runes a composition may place, derived from the
 * declarations the build reads rather than listed, so a rune added tomorrow is
 * in or out by rule. Shared by the survival test that gates placement
 * (`slot-marker-survival.test.ts`, WORK-621) and the authoring guide's check
 * that the list it states is this set (`composed-runes-guide.test.ts`,
 * WORK-637).
 *
 * The catalog is core plus every plugin this repository's main site loads —
 * the official plugins.
 *
 * Two exclusions:
 *
 * - **`requiresParent`** (SPEC-084): a composition's own rune is the nearest
 *   ancestor of whatever its template places, so a parent-requiring rune placed
 *   directly always fails the engine's check.
 * - **a peer schema type** (D9): a rune emitting a type of its own, by its
 *   schema table or `seoType`. D9's refinement admits a *subordinate* type — an
 *   `ImageObject` becoming the outer entity's `image` — which is the compiler's
 *   own `SUBORDINATE_SCHEMA_TYPES`.
 */

export const ROOT = (() => {
	let dir = dirname(fileURLToPath(import.meta.url));
	while (!existsSync(join(dir, 'refrakt.config.json'))) dir = dirname(dir);
	return dir;
})();

/**
 * Runes resolved by a preprocess hook. They are rewritten into other content
 * before any transform runs, so a marker on them is the preprocess's to carry,
 * not the transform's — this test cannot reach them, and says so by name.
 */
export const PREPROCESS_ONLY = new Set(['snippet', 'data', 'include']);

/**
 * Placements that drop the markers today — D10a step 5's "kept out of D12's set
 * until it is" fixed, per node kind, with the reason. Every entry is a rune that
 * reinterprets that kind of node as its own structure, rebuilding it instead of
 * passing it through, so the placed node does not reach the output as itself.
 *
 * The test fails on a drop missing here **and** on an entry that no longer
 * drops, so this stays the measured list rather than a tolerance.
 */
export const NOT_YET_PLACEABLE: Record<string, Record<string, string>> = {
	nav: { list: 'rebuilds each list item as a `nav-item` rune' },
	tabs: {
		heading: 'rebuilds a heading as a `tab` button label',
		list: 'rebuilds list items as `tab` buttons',
	},
	'budget-category': { list: 'rebuilds each list item as a `budget-line-item` rune' },
	conversation: { blockquote: 'rebuilds each blockquote as a `conversation-message` rune' },
	reveal: { heading: 'rebuilds a heading as a `reveal-step` name' },
	form: {
		paragraph: 'rebuilds a paragraph as its own `text` paragraph',
		list: 'rebuilds a list as a `form-field` of choices',
		heading: 'rebuilds a heading as a fieldset legend',
		blockquote: 'rebuilds a blockquote as a `help` paragraph',
	},
	comparison: {
		heading: 'rebuilds a heading as a header cell of its table',
		list: 'rebuilds a list into its table',
	},
	'symbol-group': { list: 'rebuilds each list item as a `symbol-member` rune' },
	changelog: { heading: 'rebuilds a heading as a `changelog-release` version' },
	preview: { fence: 'rebuilds the fence as its `source` view' },
};

/** Every rune in the catalog, sorted into placeable and excluded-with-reason. */
export async function derivePlacementSet() {
	const config = JSON.parse(readFileSync(join(ROOT, 'refrakt.config.json'), 'utf8'));
	const pluginNames: string[] = config.sites?.main?.plugins ?? config.plugins ?? [];
	const loaded = await Promise.all(pluginNames.map((n) => loadPlugin(n)));
	const merged = mergePlugins(loaded, new Set(Object.keys(coreRunes)));
	const { config: theme } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions,
		provenance: merged.provenance,
		presetMap: {},
	});
	// biome-ignore lint/suspicious/noExplicitAny: a rendered tree is untyped JSON
	const identity = createTransform(theme) as (tree: any) => any;
	const schemas: { tags: Record<string, Schema>; nodes: Record<string, Schema> } =
		assembleMarkdocSchemas(merged.tags);

	// A rune's config is keyed by its `typeName`, which for a plugin rune is only
	// recoverable as the PascalCase of its kebab name — the same match the
	// engine makes against `data-rune`.
	const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	const configs: Record<string, RuneConfig> = {};
	for (const [key, cfg] of Object.entries(theme.runes)) configs[kebab(key)] = cfg as RuneConfig;
	const excluded: Record<string, string> = {};
	const placementSet: string[] = [];
	/** Which package each rune comes from: `core`, or the plugin's npm name. */
	const source: Record<string, string> = {};
	for (const name of Object.keys(coreRunes)) source[name] = 'core';
	for (const l of loaded) for (const name of Object.keys(l.runes)) source[name] ??= l.npmName;
	for (const [name, rune] of Object.entries({ ...coreRunes, ...merged.runes })) {
		const cfg = (rune.typeName && theme.runes[rune.typeName]) || configs[name];
		const parent = cfg?.requiresParent;
		if (parent && parent !== '*') {
			excluded[name] = `requiresParent: ${parent}`;
			continue;
		}
		const table = tableFor(rune);
		const types = [
			rune.seoType,
			table?.type,
			table?.fallback?.type,
			...Object.values(table?.rows ?? {}).map((r) => r.type),
		].filter((t): t is string => Boolean(t));
		const peer = types.find((t) => !SUBORDINATE_SCHEMA_TYPES.has(t));
		if (peer) {
			excluded[name] = `peer schema type: ${peer}`;
			continue;
		}
		placementSet.push(name);
	}
	return { identity, schemas, placementSet, excluded, source };
}
