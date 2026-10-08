import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import {
	tags as coreTags,
	nodes as coreNodes,
	baseConfig,
	bodyOnly,
	collectCompositions,
	createComponentRenderable,
	createContentModelSchema,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	serializeTree,
	type ComposedRune,
} from '../src/index.js';

/**
 * SPEC-145 D7 — a composed rune places a declared meta block with
 * `{% metablock name="…" /%}` (WORK-630).
 *
 * A composed rune has no `layout`, and `layout` is the only other way a block
 * renders, so without the tag a composition could declare `metaFields` and
 * `blocks` in full and get nothing. The tag is a placeholder, not a renderer:
 * its values resolve two stages later, in the engine, through the same
 * `renderBlock` closure `layout` projection calls.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const META = `
metaFields:
  realmType: { metaType: category, label: Type }
  scale:     { metaType: category, label: Scale, condition: scale }
blocks:
  metadata: { fields: [realmType, scale], layout: definition-list }
  strip:    { fields: [realmType, scale], layout: bar }
  sized:    { fields: [scale], layout: definition-list }
`;

/** `realm`'s worked example in D7, over `card` — the block sits inside a placed
 *  primitive, not among the composed rune's direct children. */
const REGION = `---
tag: article
attributes:
  name:      { type: string, required: true }
  realmType: { type: string }
  scale:     { type: string }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
${META.trim()}
---

{% card %}
# {% $attrs.name %}

{% metablock name="metadata" /%}

{% slot name="body" /%}
{% /card %}
`;

function definition(front: string, template: string): string {
	return `---\n${front.trim()}\n---\n\n${template.trim()}\n`;
}

/** A tree-owning rune with the same `metaFields` and `blocks`, placed by `layout`. */
const ledgerSchema = createContentModelSchema({
	attributes: {
		realmType: { type: String, required: false },
		scale: { type: String, required: false },
	},
	contentModel: bodyOnly(),
	transform(_resolved, attrs) {
		const properties: Record<string, InstanceType<typeof Markdoc.Tag>> = {};
		for (const name of ['realmType', 'scale']) {
			if (attrs[name] !== undefined)
				properties[name] = new Markdoc.Tag('meta', { content: attrs[name] });
		}
		return createComponentRenderable({ rune: 'ledger', tag: 'article', properties, children: [] });
	},
});

const ledgerConfig: RuneConfig = {
	block: 'ledger',
	modifiers: { realmType: { source: 'meta' }, scale: { source: 'meta' } },
	metaFields: {
		realmType: { metaType: 'category', label: 'Type' },
		scale: { metaType: 'category', label: 'Scale', condition: 'scale' },
	},
	blocks: {
		metadata: { fields: ['realmType', 'scale'], layout: 'definition-list' },
		strip: { fields: ['realmType', 'scale'], layout: 'bar' },
		sized: { fields: ['scale'], layout: 'definition-list' },
	},
	layout: { root: ['metadata'] },
} as RuneConfig;

function render(
	source: string,
	composed: Record<string, ComposedRune>,
	opts: { theme?: Record<string, Partial<RuneConfig>> } = {},
): Json {
	const own: Record<string, Schema> = { ledger: ledgerSchema };
	const pluginRunes: Record<string, RuneConfig> = { Ledger: ledgerConfig };
	for (const [name, c] of Object.entries(composed)) {
		own[name] = c.rune.schema;
		pluginRunes[c.typeName] = { ...c.config, ...opts.theme?.[c.typeName] } as RuneConfig;
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

/** A block as `renderBlock` emits it: BEM element classes are the host's,
 *  applied afterwards to every `data-name` descendant, so they are set aside. */
function unclassed(node: Json): Json {
	if (Array.isArray(node)) return node.map(unclassed);
	if (!node || typeof node !== 'object') return node;
	const { class: _class, ...attributes } = node.attributes ?? {};
	return { ...node, attributes, children: unclassed(node.children ?? []) };
}

const html = (node: Json) => Markdoc.renderers.html(node);

describe('{% metablock %} — placing a declared block from a template (D7)', () => {
	const region = defineComposedRune('territory', REGION);

	it('renders the block where the template places it, inside the placed primitive', () => {
		const out = render(
			'{% territory name="Aldermere" realmType="kingdom" scale="vast" %}\nText.\n{% /territory %}',
			{ territory: region },
		);
		const card = all(out, (n) => n.attributes?.['data-rune'] === 'card')[0];
		const [dl] = byName(card, 'metadata');
		expect(dl.name).toBe('dl');
		expect(dl.attributes['data-zone-layout']).toBe('definition-list');
		expect(all(dl, (n) => n.name === 'dt').map((n) => n.children.join(''))).toEqual([
			'Type',
			'Scale',
		]);
		// Between the heading and the body, where the template wrote it.
		const body = byName(card, 'body')[0];
		const order = body.children
			.filter((c: Json) => c && typeof c === 'object')
			.map((c: Json) => c.attributes['data-name'] ?? c.name);
		expect(order).toEqual(['title', 'metadata', 'p']);
		// The marker never reaches the output.
		expect(html(out)).not.toMatch(/data-metablock/);
	});

	it('is identical to what `layout` projection renders for a tree-owning rune', () => {
		for (const block of ['metadata', 'strip']) {
			const placed = defineComposedRune(
				'territory',
				REGION.replace('name="metadata"', `name="${block}"`),
			);
			const composed = render(
				'{% territory name="A" realmType="kingdom" scale="vast" %}\n{% /territory %}',
				{
					territory: placed,
				},
			);
			const projected = renderWithLedger({
				...ledgerConfig,
				layout: { root: [block] },
			} as RuneConfig);
			const [mine] = byName(composed, block);
			const [theirs] = byName(projected, block);
			expect(mine).toBeDefined();
			expect(unclassed(mine)).toEqual(unclassed(theirs));
		}
	});

	it('resolves in the declaring rune, from its config and modifier values', () => {
		const out = render('{% territory name="A" realmType="kingdom" %}\n{% /territory %}', {
			territory: region,
		});
		// `scale` is conditioned on itself and unset, so its row is omitted —
		// the declaring rune's values decide, not the card's.
		const [dl] = byName(out, 'metadata');
		expect(
			all(dl, (n) => n.attributes?.['data-name'] === 'row').map((r) => r.attributes['data-field']),
		).toEqual(['realmType']);
		// Attributes a metaField reads are modifiers of the generated config, as
		// they must be on a tree-owning rune for its own blocks to fill.
		expect(region.config.modifiers).toEqual({
			realmType: { source: 'meta' },
			scale: { source: 'meta' },
		});
	});

	it('removes the marker and emits nothing when every field resolves empty', () => {
		// `sized` holds only `scale`, which is conditioned on itself.
		const sized = defineComposedRune(
			'territory',
			REGION.replace('name="metadata"', 'name="sized"'),
		);
		const out = render('{% territory name="A" realmType="kingdom" %}\n{% /territory %}', {
			territory: sized,
		});
		expect(byName(out, 'sized')).toEqual([]);
		expect(html(out)).not.toMatch(/data-metablock/);
		// The same block, projected by `layout`, is just as absent.
		const projected = renderWithLedger(
			{
				...ledgerConfig,
				layout: { root: ['sized'] },
			} as RuneConfig,
			'{% ledger realmType="kingdom" /%}',
		);
		expect(byName(projected, 'sized')).toEqual([]);
	});

	it('follows a theme override of the block, as a projected block does', () => {
		const theme = {
			Territory: {
				blocks: { metadata: { fields: ['scale'], layout: 'bar' } },
			} as Partial<RuneConfig>,
		};
		const out = render(
			'{% territory name="A" realmType="kingdom" scale="vast" %}\n{% /territory %}',
			{ territory: region },
			{
				theme,
			},
		);
		const [block] = byName(out, 'metadata');
		expect(block.name).toBe('div');
		expect(block.attributes['data-zone-layout']).toBe('bar');
		expect(html(block)).toMatch(/vast/);
		expect(html(block)).not.toMatch(/kingdom/);

		// A theme that drops the block takes the placement with it, silently.
		const dropped = render(
			'{% territory name="A" realmType="kingdom" %}\n{% /territory %}',
			{ territory: region },
			{
				theme: { Territory: { blocks: {} } as Partial<RuneConfig> },
			},
		);
		expect(byName(dropped, 'metadata')).toEqual([]);
		expect(html(dropped)).not.toMatch(/data-metablock/);
	});

	it('fills each instance from its own values when the rune nests inside itself', () => {
		const nested = `{% territory name="Outer" realmType="kingdom" %}
{% territory name="Inner" realmType="village" %}
{% /territory %}
{% /territory %}`;
		const out = render(nested, { territory: region });
		const blocks = byName(out, 'metadata').map((dl) => html(dl));
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatch(/kingdom/);
		expect(blocks[1]).toMatch(/village/);
	});

	it('records the placement in the contract outline', () => {
		const outline = collectCompositions({ territory: region.rune }).territory.outline;
		expect(JSON.stringify(outline)).toContain('{"metablock":"metadata"}');
	});
});

/** Render `{% ledger %}` with a different config (the bar block's projection). */
function renderWithLedger(
	config: RuneConfig,
	source = '{% ledger realmType="kingdom" scale="vast" /%}',
): Json {
	const tree = Markdoc.transform(Markdoc.parse(source), {
		tags: declareSlotMarkers({ ...coreTags, ledger: ledgerSchema } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	} as never);
	const { config: theme } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: { Ledger: config },
		pluginIcons: {},
		pluginBackgrounds: {},
		extensions: {},
		provenance: {},
		presetMap: {},
	} as never);
	return createTransform(theme)(serializeTree(tree) as never);
}

describe('{% metablock %} — rejected at construction, by name (D7)', () => {
	const make = (template: string, front = '') =>
		defineComposedRune(
			'territory',
			definition(
				`attributes:\n  realmType: { type: string }\n  scale: { type: string }\n${front}\n${META.trim()}`,
				template,
			),
		);

	it('rejects a name that matches no declared block, naming it', () => {
		expect(() => make('{% card %}\n{% metablock name="stats" /%}\n{% /card %}')).toThrow(
			'Rune "territory": invalid composition template — `{% metablock name="stats" /%}` names no declared block (declared: metadata, strip, sized). Declare it under `blocks` (D7).',
		);
	});

	it('rejects a block placed twice, rather than letting mapDataNames collapse it', () => {
		expect(() =>
			make(
				'{% metablock name="metadata" /%}\n\n{% card %}\n{% metablock name="metadata" /%}\n{% /card %}',
			),
		).toThrow(/meta block `metadata` is placed twice/);
	});

	it('rejects a placement inside an `each` slot, which would place it per item', () => {
		const front = `content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }`;
		expect(() =>
			make(
				'{% slot name="sections" each %}\n{% details summary=$each.heading %}\n{% metablock name="metadata" /%}\n\n{% slot /%}\n{% /details %}\n{% /slot %}',
				front,
			),
		).toThrow(/is placed inside the `each` slot `sections`, which would place it once per item/);
	});

	it('rejects other attributes, content, and an inline placement', () => {
		expect(() => make('{% metablock name="metadata" layout="bar" /%}')).toThrow(
			/takes `name` only, not `layout`/,
		);
		expect(() => make('{% metablock name="metadata" %}x{% /metablock %}')).toThrow(
			/takes no content; write it self-closing/,
		);
		expect(() => make('Meta: {% metablock name="metadata" /%}')).toThrow(
			/sits inside a line of text/,
		);
	});

	it('rejects a template placing a block when the rune declares none', () => {
		expect(() =>
			defineComposedRune('plain', definition('tag: div', '{% metablock name="metadata" /%}')),
		).toThrow(/names no declared block \(declared: none\)/);
	});
});

describe('{% metablock %} — template vocabulary only', () => {
	const region = defineComposedRune('territory', REGION);
	const config = () => ({
		tags: declareSlotMarkers({ ...coreTags, territory: region.rune.schema } as Record<
			string,
			Schema
		>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: {},
	});

	it('is an undefined tag on a page, named by the validator', () => {
		const errors = Markdoc.validate(
			Markdoc.parse('{% metablock name="metadata" /%}'),
			config() as never,
		);
		expect(errors.map((e) => [e.error.id, e.error.message])).toEqual([
			['tag-undefined', "Undefined tag: 'metablock'"],
		]);
	});

	it("placed by an author inside a slot, it is not resolved as the template's", () => {
		const source =
			'{% territory name="A" realmType="kingdom" %}\n{% metablock name="metadata" /%}\n{% /territory %}';
		const errors = Markdoc.validate(Markdoc.parse(source), config() as never);
		expect(errors.map((e) => e.error.id)).toContain('tag-undefined');
		// Only the template's own placement renders a block.
		const out = render(source, { territory: region });
		expect(byName(out, 'metadata')).toHaveLength(1);
		expect(html(out)).not.toMatch(/data-metablock/);
	});

	it('is not a page tag and no rune declares it', () => {
		expect(Object.keys(coreTags)).not.toContain('metablock');
	});
});

describe('the generated block-less config renders in full (D2a, WORK-622)', () => {
	it('root: no rf-* class and no field bag; modifiers, universal attributes and meta blocks render', () => {
		const region = defineComposedRune('territory', REGION);
		const out = render(
			'{% territory name="A" realmType="kingdom" scale="vast" tint="warm" width="wide" %}\nT\n{% /territory %}',
			{ territory: region },
		);
		const [root] = all(out, (n) => n.attributes?.['data-rune'] === 'territory');
		expect(root.attributes.class).toBeUndefined();
		expect(root.attributes).not.toHaveProperty('data-rune-fields');
		expect(html(out)).not.toMatch(/rf-territory/);
		// Modifiers.
		expect(root.attributes['data-realm-type']).toBe('kingdom');
		expect(root.attributes['data-scale']).toBe('vast');
		// Universal attributes.
		expect(root.attributes['data-tint']).toBe('warm');
		expect(root.attributes['data-width']).toBe('wide');
		// Meta blocks.
		const [dl] = byName(root, 'metadata');
		expect(all(dl, (n) => n.name === 'dd').map((n) => html(n))).toEqual([
			expect.stringContaining('kingdom'),
			expect.stringContaining('vast'),
		]);
	});
});
