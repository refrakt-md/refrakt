import { describe, it, expect } from 'vitest';
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
function hasAttr(node: unknown, attr: string): boolean {
	if (!isT(node)) return false;
	if (attr in node.attributes) return true;
	return node.children.some(c => hasAttr(c, attr));
}

// Hint-shaped rune: an icon-decorated enum value that doubles as the title.
const hintConfig: RuneConfig = {
	block: 'hint',
	scope: 'core',
	modifiers: { hintType: { source: 'meta', default: 'note' } },
	i18nEnums: { note: 'Note', warning: 'Warning' },
	metaFields: { hintType: { icon: { group: 'hint' } } },
	blocks: { header: { fields: ['hintType'], layout: 'bar' } },
	layout: { root: ['header'] },
};

function baseConfig(extra: Partial<ThemeConfig> = {}): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: { Hint: hintConfig }, ...extra };
}
function makeHint(type: string) {
	return makeTag('div', { 'data-rune': 'hint' }, [
		makeTag('meta', { 'data-field': 'hint-type', content: type }),
		makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['Body'])]),
	]);
}

describe('SPEC-035 Zone 6 — enum-as-text', () => {
	it('keeps the raw value with zero config (unchanged)', () => {
		const t = createTransform(baseConfig());
		expect(allText(asTag(t(makeHint('warning'))))).toContain('warning');
	});

	it('localizes a declared enum value under a locale', () => {
		const t = createTransform(baseConfig({ locale: 'de', strings: { 'core.hint.warning': 'Warnung' } }));
		const text = allText(asTag(t(makeHint('warning'))));
		expect(text).toContain('Warnung');
		expect(text).not.toContain('warning');
	});

	it('falls back to the raw value for an unconfigured enum key', () => {
		const t = createTransform(baseConfig({ locale: 'de', strings: { 'core.hint.warning': 'Warnung' } }));
		expect(allText(asTag(t(makeHint('note'))))).toContain('note');
	});
});

describe('SPEC-035 Zone 2 — data-i18n programmatic text', () => {
	const config: ThemeConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: {} };
	// A leaf label carrying a data-i18n marker (as budget totals emit).
	const label = () => makeTag('div', {}, [
		makeTag('span', { class: 'x', 'data-i18n': 'core.budget.total' }, ['Total']),
	]);

	it('resolves the marker and strips the attribute under a locale', () => {
		const t = createTransform({ ...config, locale: 'de', strings: { 'core.budget.total': 'Gesamt' } });
		const out = asTag(t(label()));
		expect(allText(out)).toContain('Gesamt');
		expect(hasAttr(out, 'data-i18n')).toBe(false);
	});

	it('keeps English text and strips the marker with zero config', () => {
		const t = createTransform(config);
		const out = asTag(t(label()));
		expect(allText(out)).toContain('Total');
		expect(hasAttr(out, 'data-i18n')).toBe(false);
	});
});
