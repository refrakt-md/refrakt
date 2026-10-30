import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	loadProjectRunes,
	mergePlugins,
	pluginRune,
	PROJECT_RUNES,
	runes as coreRunes,
} from '@refrakt-md/runes';
import type { LoadedPlugin } from '@refrakt-md/runes';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { assembleThemeConfig } from '@refrakt-md/transform';
import { marketing } from '../../../plugins/marketing/src/index.js';

/**
 * SPEC-181 — the `staging` site renders `main`'s content with the runes in
 * `site/staged-runes/` preferred over the plugin runes they replace (WORK-680).
 */

const ROOT = join(__dirname, '..', '..', '..');
const config = JSON.parse(readFileSync(join(ROOT, 'refrakt.config.json'), 'utf-8')) as {
	sites: Record<string, Record<string, unknown>>;
};

describe('the staging site (SPEC-181 D1, D3)', () => {
	it('is `main` apart from `runes`', () => {
		const { runes, ...staging } = config.sites.staging;
		const { runes: mainRunes, ...main } = config.sites.main;
		// No site inheritance in `refrakt.config.json`: this test is what keeps
		// the copy a copy. Change both sites, or neither.
		expect(staging).toEqual(main);
		expect(mainRunes).toBeUndefined();
		expect(runes).toMatchObject({ dir: 'site/staged-runes' });
	});
});

describe('a staged rune shadows the plugin rune it replaces (SPEC-181 D1)', () => {
	const hero = readFileSync(
		join(ROOT, 'packages', 'runes', 'test', 'fixtures', 'composed', 'hero.md'),
		'utf-8',
	);
	const staged = loadProjectRunes(
		memoryProjectFiles(new Map([['site/staged-runes/hero.md', hero]])),
		'site/staged-runes',
	);
	const plugin = (): LoadedPlugin => ({
		pkg: marketing,
		npmName: '@refrakt-md/marketing',
		runes: Object.fromEntries(
			Object.entries(marketing.runes).map(([name, entry]) => [
				name,
				pluginRune(name, entry, marketing),
			]),
		),
		fixtures: {},
		fileRoots: {},
	});
	const merged = mergePlugins(
		[plugin()],
		new Set(Object.keys(coreRunes)),
		{ hero: PROJECT_RUNES },
		staged,
	);

	it('replaces the plugin’s schema, and its aliases with the staged ones', () => {
		expect(merged.tags.hero).toBe(staged.runes.hero.schema);
		expect(merged.provenance.hero.source).toBe('project');
	});

	it('replaces the plugin’s hand-written config with the generated one', () => {
		const { config: theme } = assembleThemeConfig({
			coreConfig: { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: {} },
			pluginRunes: merged.themeRunes,
			provenance: merged.provenance,
		});
		const hero = theme.runes.Hero;
		expect(hero.composed).toBe(true);
		// Nothing of the plugin's entry survives: no block, no BEM, no guestFit.
		expect(hero.block).toBeUndefined();
		expect(hero.guestFit).toBeUndefined();
		expect(hero.defaultWidth).toBe('full');
	});

	it('leaves every other plugin rune as it was', () => {
		expect(merged.provenance.cta.source).toBe('plugin');
		expect(merged.themeRunes.CallToAction.block).toBe('cta');
	});
});

describe('a staged rune’s aliases replace the plugin rune’s', () => {
	it('drops `call-to-action` when the staged `cta` declares no such alias', () => {
		const cta = readFileSync(
			join(ROOT, 'packages', 'runes', 'test', 'fixtures', 'composed', 'cta.md'),
			'utf-8',
		);
		const staged = loadProjectRunes(
			memoryProjectFiles(new Map([['site/staged-runes/cta.md', cta]])),
			'site/staged-runes',
		);
		const loaded: LoadedPlugin = {
			pkg: marketing,
			npmName: '@refrakt-md/marketing',
			runes: Object.fromEntries(
				Object.entries(marketing.runes).map(([name, entry]) => [
					name,
					pluginRune(name, entry, marketing),
				]),
			),
			fixtures: {},
			fileRoots: {},
		};
		const merged = mergePlugins(
			[loaded],
			new Set(Object.keys(coreRunes)),
			{ cta: PROJECT_RUNES },
			staged,
		);
		expect(merged.tags.cta).toBe(staged.runes.cta.schema);
		expect(merged.tags['call-to-action']).toBeUndefined();
	});
});
