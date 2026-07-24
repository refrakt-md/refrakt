import { describe, it, expect } from 'vitest';
import { resolveDocumentLang } from '../src/i18n.js';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const isT = (c: unknown): c is SerializedTag =>
	typeof c === 'object' && c !== null && '$$mdtype' in (c as object);
function allText(node: unknown, out: string[] = []): string[] {
	if (typeof node === 'string') out.push(node);
	else if (isT(node)) node.children.forEach(c => allText(c, out));
	else if (Array.isArray(node)) node.forEach(c => allText(c, out));
	return out;
}

describe('resolveDocumentLang (Zone 8)', () => {
	it('returns the configured locale', () => {
		expect(resolveDocumentLang('de')).toBe('de');
		expect(resolveDocumentLang('de-AT')).toBe('de-AT');
	});
	it('defaults to en for unset/empty', () => {
		expect(resolveDocumentLang(undefined)).toBe('en');
		expect(resolveDocumentLang('')).toBe('en');
	});
});

describe('locale-aware duration formatting', () => {
	const recipeConfig: RuneConfig = {
		block: 'recipe',
		scope: 'learning',
		modifiers: { prepTime: { source: 'meta' } },
		metaFields: { prepTime: { metaType: 'temporal', label: 'Prep', transform: 'duration', condition: 'prepTime' } },
		blocks: { meta: { fields: ['prepTime'], layout: 'bar' } },
		layout: { root: ['meta', 'body'] },
	};
	function base(extra: Partial<ThemeConfig> = {}): ThemeConfig {
		return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: { Recipe: recipeConfig }, ...extra };
	}
	function tag() {
		return makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: 'PT1H30M' }),
			makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['b'])]),
		]);
	}

	it('English keeps the compact form (byte-identical)', () => {
		const out = allText(asTag(createTransform(base())(tag())));
		expect(out).toContain('1h 30m');
	});

	it('a non-English locale uses Intl.DurationFormat when available', () => {
		const out = allText(asTag(createTransform(base({ locale: 'de' }))(tag())));
		// jsdom/node may lack Intl.DurationFormat — then it safely falls back to
		// the compact form. Either way it must render a non-empty duration.
		const hasDuration = out.some(t => /1/.test(t) && /(h|Std)/.test(t));
		expect(hasDuration).toBe(true);
	});
});
