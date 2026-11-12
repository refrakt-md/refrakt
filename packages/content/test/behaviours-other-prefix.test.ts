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
import { initRuneBehaviors } from '@refrakt-md/behaviors';
import { assembleMarkdocSchemas } from '../src/site.js';

/**
 * SPEC-196 D6 — behaviours find rune markup by attribute, so they keep working
 * for a theme whose class prefix is not `rf`. Each rune is rendered through
 * the real schema and engine with prefix `zz`, mounted, and enhanced; the
 * assertion is the behaviour's visible effect, not its implementation.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

function renderPage(source: string, prefix: string): Json {
	const merged = mergePlugins([], new Set(Object.keys(coreTags)));
	const { config: assembled } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: {},
		pluginBackgrounds: {},
		extensions: {},
		provenance: merged.provenance,
		presetMap: {},
	} as never);
	const theme = { ...assembled, prefix };
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

function mount(source: string): HTMLElement {
	const root = document.createElement('div');
	root.appendChild(toDom(renderPage(source, 'zz')));
	document.body.appendChild(root);
	return root;
}

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('behaviours under a theme with another class prefix (SPEC-196 D6)', () => {
	it('renders with the other prefix', () => {
		const root = mount('{% hint %}\nA note.\n{% /hint %}');
		expect(root.querySelector('.zz-hint')).not.toBeNull();
		expect(root.querySelector('.rf-hint')).toBeNull();
	});

	it('tabs: marks the first tab active', () => {
		const root = mount('{% tabs %}\n## One\n\nFirst.\n\n## Two\n\nSecond.\n{% /tabs %}');
		initRuneBehaviors(root);
		const tabs = root.querySelectorAll('[data-rune="tab"]');
		expect(tabs).toHaveLength(2);
		expect(tabs[0].getAttribute('data-state')).toBe('active');
		expect(tabs[1].getAttribute('data-state')).toBe('inactive');
	});

	it('reveal: shows the first step and hides the rest', () => {
		const root = mount(
			'{% reveal %}\n{% reveal-step %}\nFirst.\n{% /reveal-step %}\n{% reveal-step %}\nSecond.\n{% /reveal-step %}\n{% /reveal %}',
		);
		initRuneBehaviors(root);
		const reveal = root.querySelector('[data-rune="reveal"]')!;
		expect(reveal.hasAttribute('data-enhanced')).toBe(true);
		const steps = root.querySelectorAll('[data-rune="reveal-step"]');
		expect([...steps].map((s) => s.getAttribute('data-state'))).toEqual(['open', 'closed']);
	});

	it('datatable: finds its scroll container and sorts', () => {
		const root = mount(
			'{% datatable sortable="Name" %}\n| Name |\n|------|\n| Bea |\n| Al |\n{% /datatable %}',
		);
		initRuneBehaviors(root);
		const th = root.querySelector('th')!;
		th.click();
		expect(th.querySelector('[data-name="sort-indicator"]')).not.toBeNull();
		const cells = [...root.querySelectorAll('tbody td')].map((td) => td.textContent?.trim());
		expect(cells).toEqual(['Al', 'Bea']);
	});

	it('copy: adds one button inside the fence wrapper', () => {
		const root = mount('```js\nconst x = 1;\n```');
		initRuneBehaviors(root);
		const wrapper = root.querySelector('[data-wrapper="code"]')!;
		expect(wrapper).not.toBeNull();
		expect(wrapper.querySelectorAll(':scope > [data-copy-button]')).toHaveLength(1);
		expect(root.querySelectorAll('[data-wrapper="code"]')).toHaveLength(1);
	});

	it('drawer: reveals its close button', () => {
		const root = mount('{% drawer id="d" title="Details" %}\nBody.\n{% /drawer %}');
		const close = root.querySelector<HTMLButtonElement>(
			'[data-rune="drawer"] [data-name="close"]',
		)!;
		expect(close).not.toBeNull();
		expect(close.hidden).toBe(true);
		initRuneBehaviors(root);
		expect(close.hidden).toBe(false);
	});
});
