import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import {
	tags as coreTags,
	nodes as coreNodes,
	baseConfig,
	compositionFor,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	describeRune,
	hydrateRuneInfo,
	parse,
	serializeTree,
	type ComposedRune,
} from '../src/index.js';
import { CompositionError } from '../src/lib/composition-errors.js';

/**
 * ADR-047 (WORK-674) — a composition's narrative field: a field whose match
 * names only the editorial runes `textblock` and `mediatext`. A rune has at
 * most one, and it is never published as structured data. Both are checked
 * when the definition loads.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const FRONT = (
	story = 'story: { match: "tag:textblock|tag:mediatext", optional: true, greedy: true }',
	schema = 'properties: { headline: name, blurb: description }',
) => `---
tag: article
content:
  type: sequence
  fields:
    headline:    { match: heading }
    blurb:       { match: paragraph, optional: true }
    ${story}
    ingredients: { match: "list:unordered", optional: true }
schema:
  type: Recipe
  ${schema}
---
`;

/** The food-blog shape: name and blurb, then the story, then a card. */
const TEMPLATE = `
{% section chrome %}
{% slot name="headline" /%}

{% slot name="blurb" /%}
{% /section %}

{% slot name="story" /%}

{% card %}
{% slot name="ingredients" /%}
{% /card %}
`;

const dish = (front = FRONT()) => defineComposedRune('dish', `${front}${TEMPLATE}`);

const PAGE = `{% dish %}
# Pancakes

Fluffy and quick.

{% textblock %}
My grandmother made these every Sunday, and the kitchen smelled of butter.
{% /textblock %}

- flour
- eggs
{% /dish %}`;

function schemasFor(composed: Record<string, ComposedRune>) {
	const own: Record<string, Schema> = {};
	for (const [name, c] of Object.entries(composed)) own[name] = c.rune.schema;
	return {
		tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	};
}

function render(source: string, composed: Record<string, ComposedRune>): Json {
	const tree = Markdoc.transform(Markdoc.parse(source), schemasFor(composed) as never);
	const pluginRunes: Record<string, RuneConfig> = {};
	for (const c of Object.values(composed)) pluginRunes[c.typeName] = c.config;
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
const textOf = (n: Json): string =>
	typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : textOf(n?.children ?? []);

function failure(make: () => unknown): CompositionError {
	try {
		make();
	} catch (e) {
		return e as CompositionError;
	}
	throw new Error('expected the definition to be rejected');
}

describe('the narrative field (ADR-047, WORK-674)', () => {
	it('is the field whose match names only editorial runes', () => {
		expect(compositionFor(dish().rune.schema)?.narrativeField).toBe('story');
	});

	it('renders the story between two template parts, publishes none of it, and raises no slot-role warning', () => {
		const composed = { dish: dish() };
		const out = render(PAGE, composed);
		const [root] = all(out, (n) => n.attributes?.['data-rune'] === 'dish');
		const order = (root.children as Json[])
			.filter((c) => c && typeof c === 'object')
			.map((c) => c.attributes?.['data-rune']);
		expect(order).toEqual(['section', 'text-block', 'card']);

		const [story] = all(root, (n) => n.attributes?.['data-rune'] === 'text-block');
		expect(textOf(story)).toContain('grandmother');
		// Nothing in the story carries a property; the rune's own do.
		expect(all(story, (n) => n.attributes?.property !== undefined)).toEqual([]);
		const published = all(root, (n) => n.attributes?.property !== undefined).map(
			(n) => n.attributes.property,
		);
		expect(published.sort()).toEqual(['description', 'name']);

		// ADR-046 — the section reads the slots named for its roles, and the
		// story is not among them.
		const findings = Markdoc.validate(parse(PAGE), schemasFor(composed) as never).filter(
			(f) => f.error.id === 'slot-header-role',
		);
		expect(findings).toEqual([]);
	});

	it('a definition with two narrative fields is rejected, naming both', () => {
		const err = failure(() =>
			dish(
				FRONT(
					'story: { match: "tag:textblock|tag:mediatext", optional: true, greedy: true }\n    aside: { match: "tag:mediatext", optional: true }',
				),
			),
		);
		expect(err.code).toBe('narrative-field-twice');
		expect(err.message).toMatch(/`story`, `aside`/);
	});

	it('a schema table that maps the narrative field is rejected, naming the field and the property', () => {
		const err = failure(() =>
			dish(FRONT(undefined, 'properties: { headline: name, story: articleBody }')),
		);
		expect(err.code).toBe('narrative-field-mapped');
		expect(err.message).toMatch(/narrative field `story` to `articleBody`/);
	});

	it('a field mixing editorial runes with other matches is not a narrative field', () => {
		const mixed = dish(
			FRONT(
				'story: { match: "tag:textblock|paragraph", optional: true, greedy: true }',
				'properties: { headline: name, story: articleBody }',
			),
		);
		expect(compositionFor(mixed.rune.schema)?.narrativeField).toBeUndefined();
	});

	it('`reference` names it', () => {
		expect(describeRune(hydrateRuneInfo(dish().rune as never))).toMatch(/Narrative field: story/);
	});
});
