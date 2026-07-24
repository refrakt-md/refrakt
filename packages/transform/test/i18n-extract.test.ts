import { describe, it, expect } from 'vitest';
import { extractI18nKeys, checkI18nBundle } from '../src/i18n-extract.js';
import type { ThemeConfig } from '../src/types.js';

const config: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		Recipe: {
			block: 'recipe',
			scope: 'learning',
			metaFields: {
				prepTime: { metaType: 'temporal', label: 'Prep' },
				servings: { metaType: 'quantity', label: 'Serves' },
				noLabel: { metaType: 'id' },
			},
		},
		Hint: {
			block: 'hint',
			i18nEnums: { note: 'Note', warning: 'Warning' },
		},
		Pinned: {
			block: 'pin',
			metaFields: { id: { metaType: 'id', label: 'ID', i18nKey: 'core.pin.identifier' } },
		},
	},
};

describe('extractI18nKeys', () => {
	const keys = extractI18nKeys(config);

	it('derives meta-field label keys as {scope}.{block}.{ref}', () => {
		expect(keys['learning.recipe.prepTime']).toBe('Prep');
		expect(keys['learning.recipe.servings']).toBe('Serves');
	});

	it('skips fields with no label', () => {
		expect(keys['learning.recipe.noLabel']).toBeUndefined();
	});

	it('includes layout (Zone 3) and computed (Zone 4) catalogs', () => {
		expect(keys['layout.openMenu']).toBe('Open menu');
		expect(keys['core.toc.title']).toBe('On this page');
		expect(keys['core.prevNext.next']).toBe('Next');
	});

	it('includes enum-as-text (Zone 6) values', () => {
		expect(keys['core.hint.note']).toBe('Note');
		expect(keys['core.hint.warning']).toBe('Warning');
	});

	it('honours an explicit i18nKey override', () => {
		expect(keys['core.pin.identifier']).toBe('ID');
		expect(keys['core.pin.id']).toBeUndefined();
	});

	it('emits keys sorted for stable diffs', () => {
		const arr = Object.keys(keys);
		expect(arr).toEqual([...arr].sort((a, b) => a.localeCompare(b)));
	});
});

describe('checkI18nBundle', () => {
	const extracted = extractI18nKeys(config);

	it('reports full coverage for a complete bundle', () => {
		const full = Object.fromEntries(Object.keys(extracted).map(k => [k, 'x']));
		const r = checkI18nBundle(extracted, full);
		expect(r.coverage).toBe(1);
		expect(r.missing).toEqual([]);
		expect(r.orphaned).toEqual([]);
	});

	it('reports missing keys and partial coverage', () => {
		const partial = { 'learning.recipe.prepTime': 'Prep-de' };
		const r = checkI18nBundle(extracted, partial);
		expect(r.missing).toContain('learning.recipe.servings');
		expect(r.coverage).toBeLessThan(1);
		expect(r.coverage).toBeGreaterThan(0);
	});

	it('reports orphaned keys not derivable from config', () => {
		const withStale = { 'stale.key': 'x' };
		const r = checkI18nBundle(extracted, withStale);
		expect(r.orphaned).toContain('stale.key');
	});
});
