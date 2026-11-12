/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
	layoutTransform,
	docsLayout,
	defaultLayout,
	planLayout,
	blogArticleLayout,
	makeTag,
} from '@refrakt-md/transform';
import type { LayoutConfig, LayoutPageData } from '@refrakt-md/transform';
import { mobileMenuBehavior, searchBehavior } from '@refrakt-md/behaviors';

/**
 * SPEC-196 D6 — layout behaviours find the layout's chrome by attribute. The
 * built-in layouts are rendered with prefix `zz`, so a class selector would
 * find nothing, and the behaviours must still wire every panel and trigger.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

function toDom(node: Json): globalThis.Node {
	if (typeof node === 'string' || typeof node === 'number') {
		return document.createTextNode(String(node));
	}
	if (Array.isArray(node)) {
		const frag = document.createDocumentFragment();
		for (const c of node) frag.appendChild(toDom(c));
		return frag;
	}
	if (!node || typeof node !== 'object') return document.createTextNode('');
	const el = document.createElement(node.name);
	for (const [k, v] of Object.entries(node.attributes ?? {})) {
		if (v === undefined || v === null || v === false) continue;
		el.setAttribute(k, v === true ? '' : String(v));
	}
	for (const c of node.children ?? []) el.appendChild(toDom(c));
	return el;
}

function page(): LayoutPageData {
	return {
		renderable: makeTag('div', {}, ['Page content']),
		regions: {
			header: { name: 'header', mode: 'replace', content: [makeTag('a', { href: '/' }, ['Home'])] },
			nav: { name: 'nav', mode: 'replace', content: [makeTag('ul', {}, ['Nav'])] },
			sidebar: { name: 'sidebar', mode: 'replace', content: [makeTag('p', {}, ['Side'])] },
		},
		title: 'Page',
		url: '/docs/page',
		pages: [],
		frontmatter: {},
		headings: [],
	} as LayoutPageData;
}

function mount(config: LayoutConfig): HTMLElement {
	const root = document.createElement('div');
	root.appendChild(toDom(layoutTransform(config, page(), 'zz')));
	document.body.appendChild(root);
	return root;
}

beforeEach(() => {
	document.body.innerHTML = '';
	document.body.style.overflow = '';
});

describe('layout chrome carries its attributes (SPEC-196 D6)', () => {
	it.each([
		['default', defaultLayout, ['menu']],
		['docs', docsLayout, ['menu', 'nav']],
		['plan', planLayout, ['nav']],
		['blog', blogArticleLayout, ['menu']],
	] as const)('%s layout: mobile panels and sidebar', (_name, config, panels) => {
		const root = mount(config);
		const found = [...root.querySelectorAll('[data-mobile-panel]')].map((p) =>
			p.getAttribute('data-mobile-panel'),
		);
		expect(found.sort()).toEqual([...panels].sort());
	});

	it('docs, plan and blog sidebars are marked', () => {
		expect(mount(docsLayout).querySelector('[data-sidebar="docs"]')).not.toBeNull();
		document.body.innerHTML = '';
		expect(mount(planLayout).querySelector('[data-sidebar="plan"]')).not.toBeNull();
		document.body.innerHTML = '';
		expect(mount(blogArticleLayout).querySelector('[data-sidebar="blog"]')).not.toBeNull();
	});
});

describe('layout behaviours on the docs layout with prefix zz', () => {
	it('mobile menu: the menu toggle opens the menu panel, the nav toggle the nav panel', () => {
		const root = mount(docsLayout);
		const cleanup = mobileMenuBehavior(root);
		const menu = root.querySelector('[data-mobile-panel="menu"]')!;
		const nav = root.querySelector('[data-mobile-panel="nav"]')!;

		(root.querySelector('[data-mobile-menu-toggle]') as HTMLElement).click();
		expect(menu.hasAttribute('data-open')).toBe(true);
		expect(nav.hasAttribute('data-open')).toBe(false);

		(root.querySelector('[data-mobile-nav-toggle]') as HTMLElement).click();
		expect(nav.hasAttribute('data-open')).toBe(true);
		expect(menu.hasAttribute('data-open')).toBe(false);

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(nav.hasAttribute('data-open')).toBe(false);
		cleanup();
	});

	it('search: fills the key hint, found by the data-name its chrome ref gives it', () => {
		// The built-in layouts do not render the hint today: a chrome entry with
		// an \`svg\` returns before its children are built (BUG-055). This is the
		// markup the chrome system emits for the entry once it does.
		const root = document.createElement('div');
		root.innerHTML =
			'<button data-search-trigger data-name="search-trigger"><kbd data-name="search-kbd"></kbd></button>';
		document.body.appendChild(root);
		const cleanup = searchBehavior(root);
		expect(root.querySelector('[data-name="search-kbd"]')!.textContent).toMatch(/K$/);
		cleanup();
	});
});
