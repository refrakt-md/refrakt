import { describe, it, expect } from 'vitest';
import { mergePlugins, selectPluginStrings, type LoadedPlugin } from '../src/plugins.js';
import { defineRune, Rune } from '../src/rune.js';
import { assembleThemeConfig } from '@refrakt-md/transform';
import type { Plugin } from '@refrakt-md/types';

function makeLoaded(pkg: Plugin, npmName: string): LoadedPlugin {
	const runes: Record<string, Rune> = {};
	for (const [name, entry] of Object.entries(pkg.runes)) {
		runes[name] = defineRune({ name, schema: entry.transform as any, description: 'x' });
	}
	return { pkg, npmName, runes, fixtures: {}, fileRoots: {} };
}

const learningPkg: Plugin = {
	name: 'learning',
	version: '1.0.0',
	runes: { recipe: { transform: { attributes: {} }, schema: {}, description: 'r' } },
	translations: {
		de: { 'learning.recipe.prepTime': 'Vorbereitung', 'learning.recipe.servings': 'Portionen' },
		fr: { 'learning.recipe.prepTime': 'Préparation' },
	},
};

const docsPkg: Plugin = {
	name: 'docs',
	version: '1.0.0',
	runes: { symbol: { transform: { attributes: {} }, schema: {}, description: 's' } },
	translations: { de: { 'docs.symbol.since': 'Seit' } },
};

describe('mergePlugins — translation aggregation', () => {
	const merged = mergePlugins([makeLoaded(learningPkg, '@x/learning'), makeLoaded(docsPkg, '@x/docs')], new Set());

	it('aggregates per-locale bundles across plugins', () => {
		expect(merged.translations.de['learning.recipe.prepTime']).toBe('Vorbereitung');
		expect(merged.translations.de['docs.symbol.since']).toBe('Seit');
		expect(merged.translations.fr['learning.recipe.prepTime']).toBe('Préparation');
	});

	it('selectPluginStrings picks a locale with region-strip fallback', () => {
		expect(selectPluginStrings(merged, 'de')['learning.recipe.servings']).toBe('Portionen');
		expect(selectPluginStrings(merged, 'de-AT')['docs.symbol.since']).toBe('Seit');
		expect(selectPluginStrings(merged, 'ja')).toEqual({});
	});
});

describe('assembleThemeConfig — D5 precedence', () => {
	const merged = mergePlugins([makeLoaded(learningPkg, '@x/learning')], new Set());
	const coreConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: {} } as any;

	it('merges the plugin bundle for the active locale into config.strings', () => {
		const { config } = assembleThemeConfig({
			coreConfig,
			locale: 'de',
			pluginTranslations: merged.translations,
		});
		expect(config.locale).toBe('de');
		expect(config.strings?.['learning.recipe.prepTime']).toBe('Vorbereitung');
	});

	it('site strings beat the plugin bundle (site wins)', () => {
		const { config } = assembleThemeConfig({
			coreConfig: { ...coreConfig, strings: { 'learning.recipe.prepTime': 'SITE' } },
			locale: 'de',
			pluginTranslations: merged.translations,
		});
		expect(config.strings?.['learning.recipe.prepTime']).toBe('SITE');
		// A key only the plugin provides still comes through.
		expect(config.strings?.['learning.recipe.servings']).toBe('Portionen');
	});

	it('core bundle is lowest precedence (below plugins)', () => {
		const { config } = assembleThemeConfig({
			coreConfig,
			locale: 'de',
			coreTranslations: { de: { 'learning.recipe.prepTime': 'CORE', 'core.toc.title': 'Auf dieser Seite' } },
			pluginTranslations: merged.translations,
		});
		// Plugin overrides core for the shared key…
		expect(config.strings?.['learning.recipe.prepTime']).toBe('Vorbereitung');
		// …core-only key survives.
		expect(config.strings?.['core.toc.title']).toBe('Auf dieser Seite');
	});

	it('unknown locale falls to English (no strings substituted)', () => {
		const { config } = assembleThemeConfig({ coreConfig, locale: 'ja', pluginTranslations: merged.translations });
		expect(config.strings).toEqual({});
	});
});
