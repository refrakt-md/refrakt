/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import {
	baseConfig,
	mergePlugins,
	serializeTree,
	tags as coreTags,
	parse,
} from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { navMenubarBehavior } from '@refrakt-md/behaviors';
import { assembleMarkdocSchemas } from '../src/site.js';

/**
 * BUG-048 — the menubar behaviour must bind to the markup the `nav` schema
 * actually emits. It once looked for each group's list as a direct child,
 * while `nav-group` wraps it in `data-name="panel"`, so every group was
 * skipped. The nav is rendered through the real schema and engine here, so
 * the two cannot drift apart again.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

function renderPage(source: string): Json {
	const merged = mergePlugins([], new Set(Object.keys(coreTags)));
	const { config: theme } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: {},
		pluginBackgrounds: {},
		extensions: {},
		provenance: merged.provenance,
		presetMap: {},
	} as never);
	const schemas = assembleMarkdocSchemas(merged.tags);
	const rendered = Markdoc.transform(parse(source), {
		...schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never);
	return createTransform(theme)(serializeTree(rendered) as never);
}

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

const MENUBAR = `{% nav layout="menubar" %}
## Docs

- [Getting started](/docs/start)
- [Installation](/docs/install)

## Guides

- [Writing](/guides/writing)
- [Theming](/guides/theming)
{% /nav %}`;

function mountNav(): HTMLElement {
	document.body.appendChild(toDom(renderPage(MENUBAR)));
	const nav = document.querySelector<HTMLElement>('[data-rune="nav"]');
	if (!nav) throw new Error('no nav rendered');
	return nav;
}

function key(target: HTMLElement, k: string) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
}

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('menubar nav behaviour on schema output (BUG-048)', () => {
	it('wires every group as a menubar item', () => {
		const nav = mountNav();
		expect(nav.getAttribute('data-layout')).toBe('menubar');
		navMenubarBehavior(nav);

		const groups = Array.from(nav.querySelectorAll<HTMLElement>('[data-rune="nav-group"]'));
		expect(groups).toHaveLength(2);
		for (const group of groups) {
			const trigger = group.querySelector<HTMLElement>('[role="button"]');
			const panel = group.querySelector<HTMLElement>(':scope > [data-name="panel"]');
			expect(trigger).not.toBeNull();
			expect(panel).not.toBeNull();
			expect(trigger!.getAttribute('aria-haspopup')).toBe('true');
			expect(trigger!.getAttribute('aria-expanded')).toBe('false');
			expect(trigger!.getAttribute('aria-controls')).toBe(panel!.id);
			expect(panel!.getAttribute('role')).toBe('menu');
			expect(panel!.getAttribute('aria-labelledby')).toBe(trigger!.id);
			expect(group.getAttribute('data-open')).toBe('false');
		}
	});

	it('opens one group at a time on click', () => {
		const nav = mountNav();
		navMenubarBehavior(nav);
		const [first, second] = Array.from(
			nav.querySelectorAll<HTMLElement>('[data-rune="nav-group"]'),
		);
		const t1 = first.querySelector<HTMLElement>('[role="button"]')!;
		const t2 = second.querySelector<HTMLElement>('[role="button"]')!;

		t1.click();
		expect(first.getAttribute('data-open')).toBe('true');
		expect(t1.getAttribute('aria-expanded')).toBe('true');

		t2.click();
		expect(first.getAttribute('data-open')).toBe('false');
		expect(second.getAttribute('data-open')).toBe('true');

		t2.click();
		expect(second.getAttribute('data-open')).toBe('false');
	});

	it('follows the menubar keyboard model', () => {
		const nav = mountNav();
		navMenubarBehavior(nav);
		const [first, second] = Array.from(
			nav.querySelectorAll<HTMLElement>('[data-rune="nav-group"]'),
		);
		const t1 = first.querySelector<HTMLElement>('[role="button"]')!;
		const t2 = second.querySelector<HTMLElement>('[role="button"]')!;

		// ArrowRight moves to the next trigger.
		t1.focus();
		key(t1, 'ArrowRight');
		expect(document.activeElement).toBe(t2);

		// ArrowDown opens the group and enters its submenu.
		key(t2, 'ArrowDown');
		expect(second.getAttribute('data-open')).toBe('true');
		const links = Array.from(second.querySelectorAll<HTMLElement>('[data-name="panel"] a'));
		expect(links.length).toBeGreaterThan(0);
		expect(document.activeElement).toBe(links[0]);

		// Escape inside the submenu closes it and returns focus to the trigger.
		key(links[0], 'Escape');
		expect(second.getAttribute('data-open')).toBe('false');
		expect(document.activeElement).toBe(t2);
	});

	it('toggles the whole nav from the mobile trigger', () => {
		const nav = mountNav();
		navMenubarBehavior(nav);
		const hamburger = nav.querySelector<HTMLElement>(':scope > [data-name="trigger"]');
		expect(hamburger).not.toBeNull();

		hamburger!.click();
		expect(nav.getAttribute('data-open')).toBe('true');
		expect(hamburger!.getAttribute('aria-expanded')).toBe('true');
		hamburger!.click();
		expect(nav.getAttribute('data-open')).toBe('false');
	});
});
