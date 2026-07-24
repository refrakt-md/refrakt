import { describe, it, expect } from 'vitest';
import { buildToc, buildPrevNext, buildVersionSwitcher } from '../src/computed.js';
import { layoutTransform } from '../src/layout.js';
import { makeTag } from '../src/helpers.js';
import type { LocaleContext } from '../src/i18n.js';
import type { LayoutConfig, LayoutPageData } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const de: LocaleContext = {
	locale: 'de',
	strings: {
		'core.toc.title': 'Auf dieser Seite',
		'core.prevNext.previous': 'Zurück',
		'core.prevNext.next': 'Weiter',
		'core.versionSwitcher.label': 'Version',
		'layout.search': 'Suche',
		'layout.menu': 'Menü',
		'layout.navigationMenu': 'Navigationsmenü',
	},
};

const isT = (c: unknown): c is SerializedTag =>
	typeof c === 'object' && c !== null && '$$mdtype' in (c as object);

function allText(node: unknown, out: string[] = []): string[] {
	if (typeof node === 'string') out.push(node);
	else if (isT(node)) node.children.forEach(c => allText(c, out));
	else if (Array.isArray(node)) node.forEach(c => allText(c, out));
	return out;
}

function allAttrValues(node: unknown, out: string[] = []): string[] {
	if (isT(node)) {
		for (const v of Object.values(node.attributes)) if (typeof v === 'string') out.push(v);
		node.children.forEach(c => allAttrValues(c, out));
	} else if (Array.isArray(node)) node.forEach(c => allAttrValues(c, out));
	return out;
}

describe('SPEC-035 Zone 4 — computed transforms', () => {
	const headings = [{ level: 2, text: 'Intro', id: 'intro' }];

	it('localizes the ToC title, English by default', () => {
		expect(allText(buildToc(headings, 'rf'))).toContain('On this page');
		expect(allText(buildToc(headings, 'rf', undefined, de))).toContain('Auf dieser Seite');
	});

	it('localizes prev/next labels', () => {
		const nav = [
			makeTag('section', { 'data-rune': 'nav-group' }, [
				makeTag('div', { 'data-rune': 'nav-item' }, [makeTag('span', { 'data-field': 'slug' }, ['a'])]),
				makeTag('div', { 'data-rune': 'nav-item' }, [makeTag('span', { 'data-field': 'slug' }, ['b'])]),
				makeTag('div', { 'data-rune': 'nav-item' }, [makeTag('span', { 'data-field': 'slug' }, ['c'])]),
			]),
		];
		const pages = [
			{ url: '/a', title: 'A', draft: false },
			{ url: '/b', title: 'B', draft: false },
			{ url: '/c', title: 'C', draft: false },
		];
		const en = allText(buildPrevNext(nav, '/b', pages, 'rf'));
		expect(en).toContain('Previous');
		expect(en).toContain('Next');
		const deText = allText(buildPrevNext(nav, '/b', pages, 'rf', de));
		expect(deText).toContain('Zurück');
		expect(deText).toContain('Weiter');
	});

	it('localizes the version switcher label', () => {
		const pages = [
			{ url: '/v1', title: 'Doc', draft: false, version: '1.0', versionGroup: 'g' },
			{ url: '/v2', title: 'Doc', draft: false, version: '2.0', versionGroup: 'g' },
		];
		const fm = { version: '1.0', versionGroup: 'g' };
		expect(allText(buildVersionSwitcher('/v1', pages, fm, 'rf'))).toContain('Version');
		// German 'Version' happens to equal English; assert it still resolves via key.
		expect(allText(buildVersionSwitcher('/v1', pages, fm, 'rf', de))).toContain('Version');
	});
});

describe('SPEC-035 Zone 3 — layout chrome', () => {
	const layout: LayoutConfig = {
		block: 'test',
		slots: {
			header: {
				tag: 'header',
				children: ['chrome:searchBtn'],
			},
			panel: {
				tag: 'div',
				attrs: { role: 'dialog', 'aria-label': 'Navigation menu' },
			},
		},
		chrome: {
			searchBtn: {
				tag: 'button',
				attrs: { 'aria-label': 'Search' },
				children: [{ tag: 'span', children: ['Menu'] } as any],
			},
		},
	};

	const page: LayoutPageData = {
		renderable: null,
		regions: {},
		title: 'T',
		url: '/',
		pages: [],
		frontmatter: {},
	};

	it('English by default (byte-identical chrome)', () => {
		const tree = layoutTransform(layout, page, 'rf');
		const attrs = allAttrValues(tree);
		expect(attrs).toContain('Search');
		expect(attrs).toContain('Navigation menu');
		expect(allText(tree)).toContain('Menu');
	});

	it('localizes aria-labels and visible chrome text under a locale', () => {
		const tree = layoutTransform(layout, page, 'rf', de);
		const attrs = allAttrValues(tree);
		expect(attrs).toContain('Suche'); // aria-label Search → layout.search
		expect(attrs).toContain('Navigationsmenü'); // dialog aria-label
		expect(attrs).not.toContain('Search');
		expect(allText(tree)).toContain('Menü'); // visible 'Menu' → layout.menu
	});

	it('falls back to English for an unconfigured chrome key', () => {
		const partial: LocaleContext = { locale: 'de', strings: { 'layout.search': 'Suche' } };
		const tree = layoutTransform(layout, page, 'rf', partial);
		const attrs = allAttrValues(tree);
		expect(attrs).toContain('Suche');
		expect(attrs).toContain('Navigation menu'); // untranslated → English
	});
});
