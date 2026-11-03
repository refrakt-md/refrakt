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
import { fsProjectFiles, memoryProjectFiles } from '@refrakt-md/types/project-files';
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
	// `hero`, `cta` and `testimonial` went live (WORK-702 to WORK-704); `steps`
	// is still staged, under the same config key as the plugin's. The alias rule
	// a preferred rune follows is `project-runes.test.ts`'s.
	const steps = readFileSync(join(ROOT, 'site', 'staged-runes', 'steps.md'), 'utf-8');
	const staged = loadProjectRunes(
		memoryProjectFiles(new Map([['site/staged-runes/steps.md', steps]])),
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
		{ steps: PROJECT_RUNES },
		staged,
	);

	it('replaces the plugin’s schema', () => {
		expect(merged.tags.steps).toBe(staged.runes.steps.schema);
		expect(merged.provenance.steps.source).toBe('project');
	});

	it('replaces the plugin’s hand-written config with the generated one', () => {
		const { config: theme } = assembleThemeConfig({
			coreConfig: { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: {} },
			pluginRunes: merged.themeRunes,
			provenance: merged.provenance,
		});
		const steps = theme.runes.Steps;
		expect(steps.composed).toBe(true);
		// Nothing of the plugin's entry survives: no block, no BEM.
		expect(steps.block).toBeUndefined();
		expect(marketing.theme?.runes?.Steps?.block).toBe('steps');
	});

	it('leaves every other plugin rune as it was', () => {
		expect(merged.provenance.feature.source).toBe('plugin');
		expect(merged.themeRunes.Feature.block).toBe('feature');
	});
});

describe('the staged runes, as the staging site loads them (WORK-681)', () => {
	const site = config.sites.staging as {
		runes: { dir: string; schema?: 'allow' | 'deny'; prefer: Record<string, string> };
	};
	const staged = loadProjectRunes(fsProjectFiles(ROOT), site.runes.dir, {
		schema: site.runes.schema,
	});
	const merged = mergePlugins(
		[
			{
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
			},
		],
		new Set(Object.keys(coreRunes)),
		site.runes.prefer,
		staged,
	);

	it('stages steps, and prefers it over the plugin', () => {
		// `hero`, `cta` and `testimonial` went live in the marketing plugin
		// (WORK-702 to WORK-704), and their `prefer` entries went with them.
		expect(Object.keys(staged.runes).sort()).toEqual(['steps']);
		expect(site.runes.prefer).toEqual({ steps: PROJECT_RUNES });
		expect(merged.tags.steps).toBe(staged.runes.steps.schema);
	});

	it('still allows a staged definition its schema row (SPEC-145 D25)', () => {
		// No staged rune declares one today; a conversion that does (storytelling)
		// is staged under the same rule the testimonial was.
		expect(site.runes.schema).toBe('allow');
	});
});
