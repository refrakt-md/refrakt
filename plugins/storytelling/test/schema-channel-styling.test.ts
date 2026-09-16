import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as storytellingConfig } from '../src/config.js';

// WORK-564 / BUG-015 — Lumina and the skeleton styled `lore`'s title, `plot`'s
// title and `bond`'s endpoints by selecting on RDFa `property=` attributes.
// Four of those rules had gone dead, so a `lore` title and a `bond`'s endpoints
// rendered unstyled. They now select the BEM element classes the refs emit.
//
// The CSS coverage test cannot catch a rule that stops *matching*, and it does
// not derive these selectors at all: refs are declared in each rune's
// `transform()`, not in its `RuneConfig`, so the config-derived expected set
// never contained them. That blind spot is exactly how four dead rules survived
// years of review — hence an assertion against rendered output rather than
// against config.

const themeConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: storytellingConfig,
};

/** Transform a rune through the identity engine and return the rendered root. */
function render(content: string, rune: string): SerializedTag {
	const node = findTag(parse(content) as any, (t) => t.attributes['data-rune'] === rune);
	expect(node, `no ${rune} in schema-transformed output`).toBeDefined();
	const serialized = JSON.parse(JSON.stringify(node)) as SerializedTag;
	return createTransform(themeConfig)(serialized) as SerializedTag;
}

function findByClass(node: any, className: string): any {
	if (!node || typeof node !== 'object') return undefined;
	const cls = node.attributes?.class;
	if (typeof cls === 'string' && cls.split(/\s+/).includes(className)) return node;
	for (const child of node.children ?? []) {
		const hit = findByClass(child, className);
		if (hit) return hit;
	}
	return undefined;
}

function textOf(node: any): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(textOf).join('');
	if (!node || typeof node !== 'object') return '';
	return (node.children ?? []).map(textOf).join('');
}

describe('styling selects BEM classes, not the schema.org channel (WORK-564)', () => {
	it('lore renders its title as .rf-lore__title', () => {
		// The dead rule was `.rf-lore > span[property="title"]`; the span carries
		// `property="headline"`, so the title had no typography and no `display:
		// block` at all. This is the node both stylesheets now select.
		const out = render(
			`{% lore title="The Prophecy" category="prophecy" %}\nAn ancient text.\n{% /lore %}`,
			'lore',
		);
		const title = findByClass(out, 'rf-lore__title');
		expect(title, 'lore title has no .rf-lore__title class').toBeDefined();
		expect(textOf(title)).toBe('The Prophecy');
	});

	it('plot renders its title as .rf-plot__title', () => {
		// This rule was live (`.rf-plot > span[property="name"]` matched), so the
		// move must land on the same node or plot's title silently loses its
		// typography.
		const out = render(
			`{% plot title="The Quest for the Crown" type="quest" %}\nThe heroes must recover the crown.\n{% /plot %}`,
			'plot',
		);
		const title = findByClass(out, 'rf-plot__title');
		expect(title, 'plot title has no .rf-plot__title class').toBeDefined();
		expect(textOf(title)).toBe('The Quest for the Crown');
	});

	it('bond renders its endpoints as .rf-bond__from and .rf-bond__to', () => {
		// `bond` has no `schema:` map at all, so `[property="from"]` and
		// `[property="to"]` never matched anything and both endpoints rendered
		// unstyled.
		const out = render(
			`{% bond from="Aragorn" to="Legolas" type="fellowship" %}\nForged at the Council of Elrond.\n{% /bond %}`,
			'bond',
		);
		const from = findByClass(out, 'rf-bond__from');
		const to = findByClass(out, 'rf-bond__to');
		expect(from, 'bond has no .rf-bond__from').toBeDefined();
		expect(to, 'bond has no .rf-bond__to').toBeDefined();
		expect(textOf(from)).toBe('Aragorn');
		expect(textOf(to)).toBe('Legolas');
	});

	it('carries no `property` attribute on the styled nodes that needs one', () => {
		// The point of the move: these nodes' appearance no longer depends on the
		// schema.org channel, so a SPEC-130 rename or `schema="none"` cannot
		// unstyle them.
		const out = render(
			`{% bond from="Aragorn" to="Legolas" type="fellowship" %}\nForged at the Council.\n{% /bond %}`,
			'bond',
		);
		for (const cls of ['rf-bond__from', 'rf-bond__to']) {
			const node = findByClass(out, cls);
			expect(
				node.attributes?.property,
				`${cls} still carries a property attribute`,
			).toBeUndefined();
		}
	});
});
