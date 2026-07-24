import { describe, it, expect } from 'vitest';
import {
	DEFAULT_LOCALE,
	normalizeLocale,
	createLocaleContext,
	localeFallbackChain,
	resolveLocaleString,
	resolvePluralString,
	selectLocaleBundle,
	mergeLocaleStrings,
	EN_LOCALE_CONTEXT,
} from '../src/i18n.js';
import type { LocaleContext, LocalizedValue } from '../src/i18n.js';

describe('normalizeLocale', () => {
	it('passes through a valid tag', () => {
		expect(normalizeLocale('de-AT')).toBe('de-AT');
	});
	it('trims surrounding whitespace', () => {
		expect(normalizeLocale('  fr  ')).toBe('fr');
	});
	it('falls back to English for empty / non-string input', () => {
		expect(normalizeLocale('')).toBe('en');
		expect(normalizeLocale('   ')).toBe('en');
		expect(normalizeLocale(undefined)).toBe('en');
		expect(normalizeLocale(null)).toBe('en');
		expect(normalizeLocale(42)).toBe('en');
	});
});

describe('localeFallbackChain', () => {
	it('strips subtags most-specific first', () => {
		expect(localeFallbackChain('de-AT-1996')).toEqual(['de-AT-1996', 'de-AT', 'de']);
	});
	it('returns a single-element chain for a bare language', () => {
		expect(localeFallbackChain('de')).toEqual(['de']);
	});
	it('never includes the empty drop', () => {
		expect(localeFallbackChain('en')).toEqual(['en']);
	});
});

describe('resolveLocaleString', () => {
	const ctx: LocaleContext = {
		locale: 'de',
		strings: { 'core.budget.total': 'Gesamt', 'plan.progress.criteria': { one: 'x', other: 'y' } },
	};

	it('returns a matching scalar translation', () => {
		expect(resolveLocaleString(ctx, 'core.budget.total', 'Total')).toBe('Gesamt');
	});
	it('falls back to English for a missing key', () => {
		expect(resolveLocaleString(ctx, 'core.budget.perDay', 'Per day')).toBe('Per day');
	});
	it('treats a plural-map value as no scalar translation (uses fallback)', () => {
		expect(resolveLocaleString(ctx, 'plan.progress.criteria', 'criteria')).toBe('criteria');
	});
	it('zero-config context returns the English fallback', () => {
		expect(resolveLocaleString(EN_LOCALE_CONTEXT, 'core.budget.total', 'Total')).toBe('Total');
	});
});

describe('resolvePluralString', () => {
	const en: LocaleContext = {
		locale: 'en',
		strings: { 'plan.progress.criteria': { one: '{n} criterion', other: '{n} criteria' } },
	};
	const pl: LocaleContext = {
		locale: 'pl',
		strings: {
			'plan.progress.criteria': {
				one: '{n} kryterium',
				few: '{n} kryteria',
				many: '{n} kryteriów',
				other: '{n} kryterium',
			},
		},
	};

	it('selects the English one/other categories', () => {
		expect(resolvePluralString(en, 'plan.progress.criteria', 1, '{n} criteria')).toBe('1 criterion');
		expect(resolvePluralString(en, 'plan.progress.criteria', 5, '{n} criteria')).toBe('5 criteria');
	});
	it('selects Polish few/many categories via Intl.PluralRules', () => {
		expect(resolvePluralString(pl, 'plan.progress.criteria', 2, '{n}')).toBe('2 kryteria');
		expect(resolvePluralString(pl, 'plan.progress.criteria', 5, '{n}')).toBe('5 kryteriów');
	});
	it('falls back to `other` when the exact category is missing', () => {
		const ctx: LocaleContext = { locale: 'en', strings: { k: { other: '{n} items' } } };
		expect(resolvePluralString(ctx, 'k', 1, '{n} item')).toBe('1 items');
	});
	it('uses a plain-string value directly', () => {
		const ctx: LocaleContext = { locale: 'en', strings: { k: '{n} things' } };
		expect(resolvePluralString(ctx, 'k', 3, 'fallback')).toBe('3 things');
	});
	it('interpolates {n} into the English fallback when the key is missing', () => {
		expect(resolvePluralString(EN_LOCALE_CONTEXT, 'k', 7, '{n} criteria')).toBe('7 criteria');
	});
});

describe('selectLocaleBundle', () => {
	const bundles: Record<string, Record<string, LocalizedValue>> = {
		de: { 'learning.recipe.prep': 'Vorbereitung' },
		fr: { 'learning.recipe.prep': 'Préparation' },
	};
	it('selects the exact locale', () => {
		expect(selectLocaleBundle(bundles, 'fr')['learning.recipe.prep']).toBe('Préparation');
	});
	it('applies region-strip fallback (de-AT → de)', () => {
		expect(selectLocaleBundle(bundles, 'de-AT')['learning.recipe.prep']).toBe('Vorbereitung');
	});
	it('returns an empty object for an unknown locale', () => {
		expect(selectLocaleBundle(bundles, 'ja')).toEqual({});
	});
	it('returns an empty object for undefined bundles', () => {
		expect(selectLocaleBundle(undefined, 'de')).toEqual({});
	});
});

describe('mergeLocaleStrings', () => {
	it('merges with later dictionaries winning per key', () => {
		const pluginBundle = { a: 'plugin-a', b: 'plugin-b' };
		const siteOverride = { a: 'site-a' };
		expect(mergeLocaleStrings(pluginBundle, siteOverride)).toEqual({ a: 'site-a', b: 'plugin-b' });
	});
	it('skips undefined dictionaries', () => {
		expect(mergeLocaleStrings(undefined, { a: '1' }, undefined)).toEqual({ a: '1' });
	});
});

describe('createLocaleContext', () => {
	it('normalises the locale and defaults strings to empty', () => {
		const ctx = createLocaleContext('  de  ');
		expect(ctx.locale).toBe('de');
		expect(ctx.strings).toEqual({});
	});
	it('defaults an unusable locale to en', () => {
		expect(createLocaleContext(undefined).locale).toBe(DEFAULT_LOCALE);
	});
});
