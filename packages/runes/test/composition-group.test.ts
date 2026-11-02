import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import {
	tags as coreTags,
	nodes as coreNodes,
	baseConfig,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	serializeTree,
	type ComposedRune,
} from '../src/index.js';

/**
 * SPEC-156 D2, D3, D9 — `{% group %}`, the template tag that arranges what it
 * holds as a row (`bar`) or a list of peer items (`ladder`) (WORK-676).
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

function definition(front: string, template: string): string {
	return `---\n${front.trim()}\n---\n\n${template.trim()}\n`;
}

const FRONT = `
tag: article
attributes:
  name: { type: string }
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { heading: $heading }
  preamble:
    portrait:    { match: image, optional: true }
    description: { match: paragraph, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name, portrait: image }
`;

const make = (template: string, front = FRONT) =>
	defineComposedRune('roster', definition(front, template));

function render(source: string, composed: Record<string, ComposedRune>): Json {
	const own: Record<string, Schema> = {};
	const pluginRunes: Record<string, RuneConfig> = {};
	for (const [name, c] of Object.entries(composed)) {
		own[name] = c.rune.schema;
		pluginRunes[c.typeName] = c.config;
	}
	const tree = Markdoc.transform(Markdoc.parse(source), {
		tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	} as never);
	const { config } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes,
		pluginIcons: {},
		pluginBackgrounds: {},
		extensions: {},
		provenance: {},
		presetMap: {},
	} as never);
	return createTransform(config)(serializeTree(tree) as never);
}

function all(node: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] {
	if (Array.isArray(node)) {
		for (const c of node) all(c, pred, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (pred(node)) out.push(node);
	all(node.children ?? [], pred, out);
	return out;
}
const byName = (tree: Json, name: string) => all(tree, (n) => n.attributes?.['data-name'] === name);
const byRune = (tree: Json, rune: string) => all(tree, (n) => n.attributes?.['data-rune'] === rune);
const tags = (n: Json) => (n.children ?? []).filter((c: Json) => c && typeof c === 'object');
const textOf = (n: Json): string =>
	typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : textOf(n?.children ?? []);

const PAGE = `{% roster name="Veshra" %}
![Veshra](v.jpg)

A cartographer.

## Early life

Born in the Spire.

## Later years

Mapped the Reach.
{% /roster %}`;

describe('{% group layout="bar" %} (D2)', () => {
	const roster = make(`{% group name="byline" layout="bar" %}
**{% $attrs.name %}**

{% group name="links" align="end" %}
{% slot name="portrait" /%}
{% /group %}
{% /group %}

{% slot name="description" /%}

{% slot name="sections" each %}
{% slot /%}
{% /slot %}`);

	it('renders an engine wrapper: `data-name`, the arrangement, no `data-rune` or class', () => {
		const out = render(PAGE, { roster });
		const [bar] = byName(out, 'byline');
		expect(bar.name).toBe('div');
		expect(bar.attributes['data-zone-layout']).toBe('bar');
		expect(bar.attributes['data-rune']).toBeUndefined();
		expect(bar.attributes.class).toBeUndefined();
		expect(textOf(bar)).toContain('Veshra');
	});

	it('a child group with `align="end"` renders `data-align="end"`', () => {
		const out = render(PAGE, { roster });
		const [bar] = byName(out, 'byline');
		const [links] = byName(bar, 'links');
		expect(links.attributes['data-align']).toBe('end');
		expect(links.attributes['data-zone-layout']).toBeUndefined();
		expect(all(links, (n) => n.name === 'img')).toHaveLength(1);
	});
});

describe('{% group layout="ladder" %} (D3)', () => {
	it('wraps each iteration of an `each` slot placed directly in it in an `<li>`', () => {
		const roster = make(`{% slot name="portrait" /%}

{% slot name="description" /%}

{% group name="chapters" layout="ladder" %}
{% slot name="sections" each %}
**{% $each.heading %}**

{% slot /%}
{% /slot %}
{% /group %}`);
		const out = render(PAGE, { roster });
		const [ladder] = byName(out, 'chapters');
		expect(ladder.name).toBe('ul');
		expect(ladder.attributes['data-zone-layout']).toBe('ladder');
		expect(ladder.attributes['data-rune']).toBeUndefined();
		const items = tags(ladder);
		expect(items.map((n: Json) => n.name)).toEqual(['li', 'li']);
		expect(textOf(items[0])).toContain('Early life');
		expect(textOf(items[0])).toContain('Born in the Spire.');
		expect(textOf(items[1])).toContain('Mapped the Reach.');
	});

	it('else wraps each top-level node it holds', () => {
		const roster = make(`{% group name="facts" layout="ladder" %}
**{% $attrs.name %}**

{% slot name="description" /%}
{% /group %}

{% slot name="portrait" /%}

{% slot name="sections" each %}
{% slot /%}
{% /slot %}`);
		const out = render(PAGE, { roster });
		const [ladder] = byName(out, 'facts');
		const items = tags(ladder);
		expect(items.map((n: Json) => n.name)).toEqual(['li', 'li']);
		expect(textOf(items[0])).toContain('Veshra');
		expect(textOf(items[1])).toContain('A cartographer.');
	});
});

describe('a group is safe where schema is involved (D9)', () => {
	/* A slot-placed node carries its owner and slot name, so it reaches the
	 * schema row across any boundary (SPEC-145 D10a). What a placed rune still
	 * hides is a rune the template itself places, matched by a `children` row:
	 * past another rune's `data-rune`, an unmarked node is that rune's. */
	const FIGURED = `
tag: article
attributes:
  name: { type: string }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name }
  children:
    figure: { type: ImageObject, property: image }
`;
	const figured = (open: string, close: string) =>
		defineComposedRune(
			'roster',
			definition(
				FIGURED,
				`${open}\n{% figure %}\n![A map](map.png)\n{% /figure %}\n${close}\n\n{% slot name="body" /%}`,
			),
		);
	const imageOf = (roster: ComposedRune) => {
		const out = render('{% roster name="Veshra" %}\nA cartographer.\n{% /roster %}', { roster });
		return byRune(out, 'figure')[0].attributes.property;
	};

	it('a schema row reaches a rune placed inside a group', () => {
		expect(imageOf(figured('{% group name="plate" layout="bar" %}', '{% /group %}'))).toBe('image');
	});

	it('the same rune inside a placed `{% bar %}` is not reached: the bar is a boundary', () => {
		expect(imageOf(figured('{% bar %}', '{% /bar %}'))).toBeUndefined();
	});
});

describe('{% group %} is checked when the definition loads (D2)', () => {
	const body = (inner: string) => `${inner}\n\n{% slot name="description" /%}`;

	it('rejects an unknown layout, naming it', () => {
		expect(() => make(body('{% group name="g" layout="grid" %}\n**x**\n{% /group %}'))).toThrow(
			/`layout="grid"`\. A group arranges as `bar` or `ladder`/,
		);
	});

	it('requires a name', () => {
		expect(() => make(body('{% group layout="bar" %}\n**x**\n{% /group %}'))).toThrow(
			/needs a `name`/,
		);
	});

	it('requires a layout, except for an aligned child of a bar', () => {
		expect(() => make(body('{% group name="g" %}\n**x**\n{% /group %}'))).toThrow(
			/has no `layout`/,
		);
		expect(() => make(body('{% group name="g" align="end" %}\n**x**\n{% /group %}'))).toThrow(
			/is not directly inside a `bar` group/,
		);
	});

	it('rejects an unknown attribute and an empty group', () => {
		expect(() =>
			make(body('{% group name="g" layout="bar" gap="lg" %}\n**x**\n{% /group %}')),
		).toThrow(/not `gap`/);
		expect(() => make(body('{% group name="g" layout="bar" %}\n{% /group %}'))).toThrow(
			/holds nothing/,
		);
	});

	it('is a template tag only: on a page it is not a tag', () => {
		expect(coreTags).not.toHaveProperty('group');
	});
});

describe('a definition declares `sequence`, stamped on its ladder alone (WORK-677)', () => {
	const STEPS = (sequence: string) => `
tag: article
sequence: ${sequence}
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { heading: $heading }
  preamble:
    intro: { match: any, optional: true, greedy: true }
`;
	const LADDER = `{% slot name="intro" /%}

{% group name="steps" layout="ladder" %}
{% slot name="sections" each %}
**{% $each.heading %}**

{% slot /%}
{% /slot %}
{% /group %}`;
	const SOURCE = `{% recipe-ish %}
1. An author's list
2. in the intro

## Mix

1. flour
2. water

## Bake

Hot oven.
{% /recipe-ish %}`;
	const define = (sequence: string, template = LADDER) =>
		defineComposedRune('recipe-ish', definition(STEPS(sequence), template));

	it('the generated config carries it, and the ladder renders an `<ol>`', () => {
		const rune = define('numbered');
		expect(rune.config.sequence).toBe('numbered');
		const out = render(SOURCE, { 'recipe-ish': rune });
		const [ladder] = byName(out, 'steps');
		expect(ladder.name).toBe('ol');
		expect(ladder.attributes['data-sequence']).toBe('numbered');
		const ordinals = tags(ladder).map((li: Json) => textOf(byName(li, 'ordinal')[0]));
		expect(ordinals).toEqual(['1', '2']);
	});

	it('an ordered list an author wrote, in the intro or inside a step, is not stamped (D14)', () => {
		const out = render(SOURCE, { 'recipe-ish': define('numbered') });
		const lists = all(out, (n) => n.name === 'ol' && n.attributes?.['data-name'] !== 'steps');
		expect(lists).toHaveLength(2);
		for (const ol of lists) {
			expect(ol.attributes['data-sequence']).toBeUndefined();
			expect(byName(ol, 'ordinal')).toEqual([]);
		}
	});

	it('`connected` and `plain` stamp the ladder with no ordinals', () => {
		for (const style of ['connected', 'plain']) {
			const out = render(SOURCE, { 'recipe-ish': define(style) });
			const [ladder] = byName(out, 'steps');
			expect(ladder.attributes['data-sequence']).toBe(style);
			expect(byName(ladder, 'ordinal')).toEqual([]);
		}
	});

	it('with no `sequence`, the ladder is an unstamped `<ul>`', () => {
		const rune = defineComposedRune(
			'recipe-ish',
			definition(STEPS('plain').replace('sequence: plain\n', ''), LADDER),
		);
		expect(rune.config.sequence).toBeUndefined();
		const [ladder] = byName(render(SOURCE, { 'recipe-ish': rune }), 'steps');
		expect(ladder.name).toBe('ul');
		expect(ladder.attributes['data-sequence']).toBeUndefined();
	});

	it('a sequence with no ladder to stamp is rejected, naming the rune (D12)', () => {
		expect(() =>
			define(
				'numbered',
				`{% slot name="intro" /%}\n\n{% slot name="sections" each %}\n{% slot /%}\n{% /slot %}`,
			),
		).toThrow(/Rune "recipe-ish".*declares `sequence: numbered`, but the template places no/);
	});

	it('an unknown style is rejected', () => {
		expect(() => define('lettered')).toThrow(/`sequence: lettered` is not a sequence style/);
	});
});
