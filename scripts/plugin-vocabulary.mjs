#!/usr/bin/env node
/**
 * ADR-044 (WORK-673) — the first-party plugins' vocabulary baseline.
 *
 * For each of the nine first-party plugins, and each rune it themes:
 *
 * - `novel`: the elements its contract lists that carry no vocabulary role
 *   (`novelElements`), the tier-3 parts that need structure of their own;
 * - `literals`: the literal colours, sizes and font stacks in the CSS that
 *   styles it (`lintTokenOnly`), counted per stylesheet. A first-party plugin
 *   ships no CSS; its runes are styled by skeleton (structure) and Lumina
 *   (skin) per-rune files, which is what Lumina's per-rune CSS drains from.
 *
 * Both are reports, not gates (ADR-044: tier 3 is legitimate). The file is the
 * baseline, regenerated and reviewed as a diff, like the SEO baseline.
 *
 *   node scripts/plugin-vocabulary.mjs          # write contracts/plugin-vocabulary.json
 *   node scripts/plugin-vocabulary.mjs --check  # exit 1 when it is out of date
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	assembleThemeConfig,
	generateStructureContract,
	lintTokenOnly,
	novelElements,
} from '@refrakt-md/transform';
import { baseConfig, loadPlugin, mergePlugins, tags as coreRunes } from '@refrakt-md/runes';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'contracts', 'plugin-vocabulary.json');

export const PLUGINS = [
	'marketing',
	'docs',
	'storytelling',
	'places',
	'business',
	'design',
	'learning',
	'media',
	'plan',
];

const STYLESHEETS = {
	skeleton: (block) => join(ROOT, 'packages/skeleton/styles/runes', `${block}.css`),
	lumina: (block) => join(ROOT, 'packages/lumina/styles/runes', `${block}.css`),
};

function count(findings) {
	const out = { colour: 0, size: 0, font: 0 };
	for (const f of findings) out[f.kind]++;
	return out;
}

export async function buildBaseline() {
	const loaded = await Promise.all(PLUGINS.map((p) => loadPlugin(`@refrakt-md/${p}`)));
	const merged = mergePlugins(loaded, new Set(Object.keys(coreRunes)));
	const { config } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions,
		provenance: merged.provenance,
		presetMap: {},
	});
	const contract = generateStructureContract(config);

	const plugins = {};
	const totals = { runes: 0, novel: 0, literals: { colour: 0, size: 0, font: 0 } };
	for (const [i, name] of PLUGINS.entries()) {
		const runes = {};
		for (const typeName of Object.keys(loaded[i].pkg.theme?.runes ?? {}).sort()) {
			const runeConfig = config.runes[typeName];
			const runeContract = contract.runes[typeName];
			if (!runeConfig || !runeContract) continue;
			const novel = novelElements(runeContract, runeConfig);
			const literals = {};
			if (runeConfig.block) {
				for (const [sheet, path] of Object.entries(STYLESHEETS)) {
					const file = path(runeConfig.block);
					if (!existsSync(file)) continue;
					literals[sheet] = count(lintTokenOnly(readFileSync(file, 'utf-8')));
					for (const k of ['colour', 'size', 'font']) totals.literals[k] += literals[sheet][k];
				}
			}
			runes[typeName] = {
				...(runeConfig.block ? { block: runeConfig.block } : {}),
				novel,
				literals,
			};
			totals.runes++;
			totals.novel += novel.length;
		}
		plugins[`@refrakt-md/${name}`] = runes;
	}

	return {
		regenerateWith: 'node scripts/plugin-vocabulary.mjs',
		about:
			'ADR-044 / WORK-673. Per first-party plugin rune: the elements with no vocabulary role (novel, tier 3), and the literal colours, sizes and font stacks in the skeleton and Lumina stylesheets that style it. Reports, not gates: the baseline Lumina’s per-rune CSS drains from.',
		totals,
		plugins,
	};
}

async function main() {
	const baseline = `${JSON.stringify(await buildBaseline(), null, 2)}\n`;
	if (process.argv.includes('--check')) {
		const current = existsSync(OUT) ? readFileSync(OUT, 'utf-8') : '';
		if (current !== baseline) {
			console.error(
				'contracts/plugin-vocabulary.json is out of date.\nRun `node scripts/plugin-vocabulary.mjs` and review the diff.',
			);
			process.exit(1);
		}
		console.log('✓ plugin-vocabulary.json is up to date');
		return;
	}
	writeFileSync(OUT, baseline);
	const t = JSON.parse(baseline).totals;
	console.log(
		`Wrote contracts/plugin-vocabulary.json: ${t.runes} runes, ${t.novel} novel elements, literals ${JSON.stringify(t.literals)}`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
