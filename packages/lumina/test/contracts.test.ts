import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { assembleThemeConfig, generateStructureContract, toKebabCase } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import {
	baseConfig,
	runes as coreRunes,
	collectCompositions,
	collectSchemaRows,
	coreTranslations,
	loadPlugin,
	mergePlugins,
} from '@refrakt-md/runes';

// ─── Assemble the config the way `refrakt contracts --site main` does ───
// Every official rune-bearing plugin, loaded through `loadPlugin` rather than
// imported, so a plugin's `runeDir` (SPEC-153 D2) is read too: `hero` lives
// only there since it went live (WORK-702), and a guard that missed it would
// let the committed file drift. Omitting a plugin silently drops its runes
// (this list once missed plan).
const PLUGINS = [
	'@refrakt-md/marketing',
	'@refrakt-md/docs',
	'@refrakt-md/storytelling',
	'@refrakt-md/places',
	'@refrakt-md/business',
	'@refrakt-md/design',
	'@refrakt-md/learning',
	'@refrakt-md/media',
	'@refrakt-md/plan',
];

let fullConfig: ThemeConfig;
let generated: ReturnType<typeof generateStructureContract>;

beforeAll(async () => {
	const loaded = await Promise.all(PLUGINS.map((name) => loadPlugin(name)));
	const merged = mergePlugins(loaded, new Set(Object.keys(coreRunes)));
	fullConfig = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		provenance: merged.provenance,
		pluginTranslations: merged.translations,
		coreTranslations,
	}).config;
	// SPEC-130 / WORK-566 — the schema.org rows, and the compositions, come
	// from the runes rather than from theme config; passed through the same
	// `generateStructureContract` call the CLI makes, so the committed artifact
	// and this guard are produced by one implementation with one input.
	const runes = { ...coreRunes, ...merged.runes };
	generated = generateStructureContract(fullConfig, {
		schemaRows: collectSchemaRows(runes),
		compositions: collectCompositions(runes),
	});
});

// The contract is committed in two places that must stay in lock-step: the
// repo-level dev copy (CLAUDE.md's `refrakt contracts -o contracts/...`) and the
// copy Lumina ships via its `./contracts` export. Guard both so neither drifts.
const CONTRACTS_PATH = join(__dirname, '..', 'contracts', 'structures.json');
const ROOT_CONTRACTS_PATH = join(__dirname, '..', '..', '..', 'contracts', 'structures.json');

describe('Structure contracts', () => {
	it('committed structures.json matches generated output', () => {
		const generatedJson = JSON.stringify(generated, null, '\t') + '\n';

		const committed = readFileSync(CONTRACTS_PATH, 'utf-8');

		expect(committed).toBe(generatedJson);
	});

	it("the repo-level contracts/structures.json stays in sync with Lumina's copy", () => {
		const generatedJson = JSON.stringify(generated, null, '\t') + '\n';

		expect(readFileSync(ROOT_CONTRACTS_PATH, 'utf-8')).toBe(generatedJson);
	});

	it('generates contracts for all runes in fullConfig', () => {
		const configRunes = Object.keys(fullConfig.runes).sort();
		const contractRunes = Object.keys(generated.runes).sort();

		expect(contractRunes).toEqual(configRunes);
	});

	it('every rune has required fields', () => {
		for (const [name, contract] of Object.entries(generated.runes)) {
			// A composed rune is block-less (SPEC-145 D2); its structure is its
			// `composition` entry.
			if (fullConfig.runes[name]?.composed) {
				expect(contract.root, `${name}: missing root`).toBe(`[data-rune="${toKebabCase(name)}"]`);
				expect(contract.composition, `${name}: missing composition`).toBeDefined();
				continue;
			}
			expect(contract.block, `${name}: missing block`).toBeTruthy();
			expect(contract.root, `${name}: missing root`).toMatch(/^\.rf-/);
			expect(contract.dataRune, `${name}: missing dataRune`).toBe(toKebabCase(name));
			expect(contract.childOrder, `${name}: missing childOrder`).toBeInstanceOf(Array);
			expect(contract.childOrder.length, `${name}: empty childOrder`).toBeGreaterThan(0);
		}
	});
});
