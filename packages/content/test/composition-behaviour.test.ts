/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import {
	baseConfig,
	defineComposedRune,
	mergePlugins,
	serializeTree,
	tags as coreTags,
	SLOT_ATTR,
} from '@refrakt-md/runes';
import type { LoadedPlugin } from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { initRuneBehaviors } from '@refrakt-md/behaviors';
import { assembleMarkdocSchemas } from '../src/site.js';

/**
 * SPEC-145 D4 — runes a template places are transformed normally. Proved on a
 * behaviour-driven primitive: `tabs`, whose markup the `tabs` behaviour binds
 * to (`[data-rune="tab-group"]`, its `tabs` bar and `panels`). The composed
 * rune's tabs must be the tabs an author writes by hand — same markup, same
 * binding — with the slot names as the only addition.
 */

const TABBED = `---
tag: section
content:
  type: sequence
  fields:
    summary: { match: paragraph }
    detail:  { match: any, optional: true, greedy: true }
---

{% tabs %}
## Summary

{% slot name="summary" /%}

## Detail

{% slot name="detail" /%}
{% /tabs %}
`;

const composed = defineComposedRune('tabbed-note', TABBED);

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

/** The whole assembly a site does: plugin merge, schemas, theme, engine. */
function renderPage(source: string): Json {
	const loaded: LoadedPlugin = {
		pkg: { name: 'fixture', version: '0.0.0', runes: { 'tabbed-note': { template: TABBED } } },
		npmName: 'fixture',
		runes: { 'tabbed-note': composed.rune },
		fixtures: {},
		fileRoots: {},
	};
	const merged = mergePlugins([loaded], new Set(Object.keys(coreTags)));
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
	const rendered = Markdoc.transform(Markdoc.parse(source), {
		...schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never);
	return createTransform(theme)(serializeTree(rendered) as never);
}

/** Build DOM from a rendered tree — enough of a renderer for a behaviour. */
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

function findRune(node: Json, rune: string): Json {
	if (Array.isArray(node)) {
		for (const c of node) {
			const hit = findRune(c, rune);
			if (hit) return hit;
		}
		return undefined;
	}
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.['data-rune'] === rune) return node;
	return findRune(node.children ?? [], rune);
}

/** A tree with the slot names removed — the only thing composition adds. */
function withoutSlots(node: Json): Json {
	if (Array.isArray(node)) return node.map(withoutSlots);
	if (!node || typeof node !== 'object') return node;
	const { [SLOT_ATTR]: _slot, ...attributes } = node.attributes ?? {};
	return { ...node, attributes, children: (node.children ?? []).map(withoutSlots) };
}

const COMPOSED = '{% tabbed-note %}\nThe gist.\n\nThe long form.\n{% /tabbed-note %}';
/** The same tabs written by hand, at the same depth (inside a rune), so the
 *  nesting context — density — is the same. */
const AUTHORED =
	'{% hint %}\n{% tabs %}\n## Summary\n\nThe gist.\n\n## Detail\n\nThe long form.\n{% /tabs %}\n{% /hint %}';

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('a behaviour-driven primitive placed by a template (SPEC-145 D4)', () => {
	it('renders the markup an author gets writing the primitive by hand', () => {
		const composedTabs = findRune(renderPage(COMPOSED), 'tab-group');
		expect(composedTabs).toBeDefined();
		const authoredTabs = findRune(renderPage(AUTHORED), 'tab-group');
		expect(withoutSlots(composedTabs)).toEqual(authoredTabs);
		// …and the slot names are on the placed content, and nowhere else.
		const slotted: string[] = [];
		const walk = (n: Json) => {
			if (Array.isArray(n)) return n.forEach(walk);
			if (!n || typeof n !== 'object') return;
			if (n.attributes?.[SLOT_ATTR]) slotted.push(`${n.name}:${n.attributes[SLOT_ATTR]}`);
			(n.children ?? []).forEach(walk);
		};
		walk(composedTabs);
		expect(slotted).toEqual(['p:summary', 'p:detail']);
	});

	it('binds the same behaviour, with the same result', () => {
		const bind = (tree: Json) => {
			document.body.innerHTML = '';
			const host = document.createElement('div');
			host.appendChild(toDom(findRune(tree, 'tab-group')));
			document.body.appendChild(host);
			const cleanup = initRuneBehaviors(host);
			// Generated ids differ by counter only; the wiring between them is what matters.
			const bound = () =>
				host.innerHTML
					.replace(/ data-slot="[^"]*"/g, '')
					.replace(/(rf-tab(?:panel)?)-\d+/g, (_m, p: string) => `${p}-N`);
			const buttons = [...host.querySelectorAll('[data-name="tabs"] > button')];
			const panels = [...host.querySelectorAll('[data-name="panels"] > *')];
			// Click the second tab: the binding is live, not just decorated.
			(buttons[1] as HTMLElement | undefined)?.click();
			const selected = buttons.map((b) => b.getAttribute('aria-selected'));
			const hidden = panels.map((p) => (p as HTMLElement).hidden);
			const html = bound();
			cleanup();
			return { html, buttons: buttons.length, panels: panels.length, selected, hidden };
		};
		const composedResult = bind(renderPage(COMPOSED));
		const authoredResult = bind(renderPage(AUTHORED));
		expect(composedResult.buttons).toBe(2);
		expect(composedResult.panels).toBe(2);
		expect(composedResult.selected).toEqual(['false', 'true']);
		expect(composedResult).toEqual(authoredResult);
	});
});
