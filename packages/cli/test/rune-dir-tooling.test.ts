import { describe, it, expect, vi, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import * as runesModule from '@refrakt-md/runes';
import {
	assembleThemeConfig,
	createTransform,
	extractSelectors,
	generateStructureContract,
	renderToHtml,
} from '@refrakt-md/transform';
import { inspectCommand } from '../src/commands/inspect.js';
import { referenceNameCommand } from '../src/commands/reference.js';

/**
 * WORK-633 — `inspect`, `reference` and `contracts` show a rune loaded from a
 * plugin's `runeDir` exactly as they show the same definition written as a
 * code `template` entry (SPEC-153 D1). Both plugins are real packages under the
 * same name, loaded by `loadPlugin` and merged as the CLI merges them.
 */

const runesDir = resolve(__dirname, '../../content/test/fixtures/composed-storytelling/runes');
const definition = (rune: string) => readFileSync(join(runesDir, `${rune}.md`), 'utf-8');
const NAME = 'fixture-story-plugin';

const dirs: string[] = [];
afterAll(() => {
	for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/** A project with one installed plugin package; returns what `loadPlugin` resolves from. */
function install(index: string, files: Record<string, string> = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'refrakt-rune-dir-cli-'));
	dirs.push(root);
	const pkg = join(root, 'node_modules', NAME);
	mkdirSync(pkg, { recursive: true });
	writeFileSync(join(root, 'package.json'), '{"name":"p","private":true,"type":"module"}');
	writeFileSync(
		join(pkg, 'package.json'),
		JSON.stringify({ name: NAME, version: '1.0.0', type: 'module', main: 'index.js' }),
	);
	writeFileSync(join(pkg, 'index.js'), index);
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(join(pkg, path, '..'), { recursive: true });
		writeFileSync(join(pkg, path), text);
	}
	return join(root, 'package.json');
}

/** Load and merge the plugin as `loadMergedConfig` / `buildReferenceContext` do. */
async function world(from: string) {
	const loaded = await runesModule.loadPlugin(NAME, { from });
	const merged = runesModule.mergePlugins([loaded], new Set(Object.keys(runesModule.runes)));
	const { config } = assembleThemeConfig({
		coreConfig: runesModule.baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		provenance: merged.provenance,
	} as never);
	const runes = { ...runesModule.runes, ...merged.runes };
	const source: Record<string, string> = {};
	for (const name of Object.keys(runesModule.runes)) source[name] = 'core';
	for (const name of Object.keys(merged.runes)) source[name] = NAME;
	return {
		config,
		runes,
		tags: { ...runesModule.tags, ...merged.tags },
		fixtures: merged.fixtures,
		source,
	};
}

const fromDir = () =>
	world(
		install("export default { name: 'story', version: '1.0.0', runeDir: 'runes', runes: {} };\n", {
			'runes/bond.md': definition('bond'),
			'runes/character.md': definition('character'),
		}),
	);

const fromCode = () =>
	world(
		install(
			`export default { name: 'story', version: '1.0.0', runes: { bond: { template: ${JSON.stringify(definition('bond'))} }, character: { template: ${JSON.stringify(definition('character'))} } } };\n`,
		),
	);

async function inspectJson(w: Awaited<ReturnType<typeof world>>, runeName: string) {
	const out: string[] = [];
	const log = vi.spyOn(console, 'log').mockImplementation((...a) => {
		out.push(a.join(' '));
	});
	try {
		await inspectCommand(
			{
				runeName,
				list: false,
				json: true,
				audit: false,
				auditMeta: false,
				auditDimensions: false,
				showInterface: false,
				all: false,
				theme: 'base',
				items: 3,
				flags: { from: 'A', to: 'B', name: 'Veshra' },
			},
			{
				Markdoc,
				runes: w.runes,
				tags: w.tags,
				nodes: runesModule.nodes,
				serializeTree: runesModule.serializeTree,
				extractHeadings: runesModule.extractHeadings,
				createTransform,
				renderToHtml,
				extractSelectors,
				baseConfig: w.config,
				packageFixtures: w.fixtures,
			} as never,
		);
	} finally {
		log.mockRestore();
	}
	return out.join('\n');
}

describe('tooling sees a runeDir rune as it sees a code-defined composed one', () => {
	it('`refrakt inspect`', async () => {
		const [a, b] = [await fromDir(), await fromCode()];
		for (const rune of ['bond', 'character']) {
			const dirOut = await inspectJson(a, rune);
			expect(dirOut).toContain(`data-rune`);
			expect(dirOut).toEqual(await inspectJson(b, rune));
		}
	});

	it('`refrakt reference`', async () => {
		const [a, b] = [await fromDir(), await fromCode()];
		for (const rune of ['bond', 'character', 'npc']) {
			for (const format of ['json', 'markdown'] as const) {
				const opts = { name: rune, format, noExample: false };
				const dirOut = referenceNameCommand(a, opts);
				expect(dirOut.exitCode).toBe(0);
				expect(dirOut).toEqual(referenceNameCommand(b, opts));
			}
		}
	});

	it('`refrakt contracts`', async () => {
		const [a, b] = [await fromDir(), await fromCode()];
		const contract = (w: typeof a) =>
			generateStructureContract(w.config, {
				schemaRows: runesModule.collectSchemaRows(w.runes),
				compositions: runesModule.collectCompositions(w.runes),
			});
		const dirContract = contract(a);
		expect(dirContract.runes.Bond.composition?.slots).toEqual(['body']);
		expect(dirContract.runes.Character.schemaOrg).toBeDefined();
		expect(dirContract).toEqual(contract(b));
	});
});
