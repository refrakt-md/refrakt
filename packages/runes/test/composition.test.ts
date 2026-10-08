import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Node, Schema } from '@markdoc/markdoc';
import type { PipelineContext, Plugin, TransformedPage } from '@refrakt-md/types';
import {
	assembleThemeConfig,
	createTransform,
	generateStructureContract,
} from '@refrakt-md/transform';
import type { RuneConfig, SerializedTag } from '@refrakt-md/transform';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import {
	tags as coreTags,
	nodes as coreNodes,
	baseConfig,
	bodyOnly,
	checkComposedCatalog,
	collectCompositions,
	collectRegistrations,
	compileComposition,
	compositionFor,
	createContentModelSchema,
	createRegistersHooks,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	mergePlugins,
	OWNER_ATTR,
	pluginRuneSchema,
	preprocessTree,
	serializeTree,
	SLOT_ATTR,
	validatePlugin,
	type ComposedRune,
	type LoadedPlugin,
} from '../src/index.js';
import { resolveSections } from '../src/lib/resolver.js';
import { schemaPreprocessors } from '../src/lib/preprocess.js';

/**
 * SPEC-145 — composed runes (WORK-622, WORK-623).
 *
 * Every definition here is a string, as a first-party definition reaches the
 * pipeline in this milestone; loading them from a rune directory is SPEC-153's
 * later steps. No shipped rune is composed: the fixtures below are the proof.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const BOND = `---
tag: aside
attributes:
  from:          { type: string, required: true }
  to:            { type: string, required: true }
  status:        { type: string, matches: [active, broken, strained], default: active }
  bidirectional: { type: boolean, default: true }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
---

{% hint type="note" %}
**{% $attrs.from %}** {% if $attrs.bidirectional %}↔{% else /%}→{% /if %} **{% $attrs.to %}**

{% slot name="body" /%}
{% /hint %}
`;

/** `character`'s shape: a preamble of fields, then sections, each one a `details`. */
const PERSONA = `---
tag: article
attributes:
  name: { type: string, required: true }
  role: { type: string, matches: [protagonist, antagonist, supporting], default: supporting }
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { heading: $heading }
  preamble:
    portrait:    { match: image, optional: true }
    description: { match: paragraph, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name, role: jobTitle, portrait: image }
---

{% card %}
{% slot name="portrait" /%}

# {% $attrs.name %}

{% badge %}{% $attrs.role %}{% /badge %}

{% slot name="description" %}No description yet.{% /slot %}

{% slot name="sections" each %}
{% details summary=$each.heading %}
{% slot /%}
{% /details %}
{% /slot %}
{% /card %}
`;

function definition(front: string, template: string): string {
	return `---\n${front.trim()}\n---\n\n${template.trim()}\n`;
}

const page = (
	source: string,
	extra: Record<string, ComposedRune>,
	opts: { assemble?: boolean } = {},
) => {
	const own: Record<string, Schema> = {};
	for (const [name, c] of Object.entries(extra)) own[name] = c.rune.schema;
	const tags = { ...coreTags, ...own } as Record<string, Schema>;
	const nodes = coreNodes as Record<string, Schema>;
	const assemble = opts.assemble ?? true;
	return Markdoc.transform(Markdoc.parse(source), {
		tags: assemble ? declareSlotMarkers(tags) : tags,
		nodes: assemble ? declareSlotMarkersOnNodes(nodes) : nodes,
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	} as never);
};

/** The serialized tree, and the same tree through the identity transform. */
function render(source: string, extra: Record<string, ComposedRune>) {
	const tree = serializeTree(page(source, extra)) as Json;
	const pluginRunes: Record<string, RuneConfig> = {};
	for (const c of Object.values(extra)) pluginRunes[c.typeName] = c.config;
	const { config } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes,
		pluginIcons: {},
		pluginBackgrounds: {},
		extensions: {},
		provenance: {},
		presetMap: {},
	} as never);
	return { tree, html: createTransform(config)(tree as never) as Json };
}

function find(node: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] {
	if (Array.isArray(node)) {
		for (const c of node) find(c, pred, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (pred(node)) out.push(node);
	for (const c of node.children ?? []) find(c, pred, out);
	return out;
}
const byRune = (tree: Json, rune: string) =>
	find(tree, (n) => n.attributes?.['data-rune'] === rune);
const textOf = (n: Json): string =>
	typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : textOf(n?.children ?? []);

/** Schema.org triples as `collectJsonLd` would read them, minimally: the
 *  composed rune's own properties, read off the RDFa. */
function properties(root: Json): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	const visit = (n: Json, top: boolean) => {
		if (!n || typeof n !== 'object') return;
		if (Array.isArray(n)) return n.forEach((c) => visit(c, top));
		const p = n.attributes?.property;
		if (p && !top) {
			const v = n.name === 'img' ? n.attributes.src : (n.attributes.content ?? textOf(n).trim());
			(out[p] ??= []).push(v);
			// A typed node is its own entity: its properties are not ours.
			if (n.attributes?.typeof) return;
		}
		if (!top && n.attributes?.typeof && !p) return;
		for (const c of n.children ?? []) visit(c, false);
	};
	visit(root, true);
	return out;
}

const bond = defineComposedRune('bond', BOND);
const persona = defineComposedRune('persona', PERSONA);

// ---------------------------------------------------------------------------
// WORK-622
// ---------------------------------------------------------------------------

describe('a rune defined by a composition template (SPEC-145)', () => {
	it('places named slots into other runes', () => {
		const { tree } = render(
			'{% bond from="Veshra" to="Kel" %}\nThey met at the Spire.\n{% /bond %}',
			{ bond },
		);
		const [root] = byRune(tree, 'bond');
		expect(root.name).toBe('aside');
		const [hint] = byRune(root, 'hint');
		expect(hint).toBeDefined();
		expect(textOf(hint)).toContain('Veshra ↔ Kel');
		expect(textOf(hint)).toContain('They met at the Spire.');
	});

	it('takes Markdoc’s own `{% if %}` on an attribute', () => {
		const { tree } = render('{% bond from="A" to="B" bidirectional=false %}\nx\n{% /bond %}', {
			bond,
		});
		expect(textOf(tree)).toContain('A → B');
	});

	it('delivers authored content to a slot as nodes, not a string', () => {
		const { tree } = render(
			'{% bond from="A" to="B" %}\nOne **bold** line.\n\n- first\n- second\n{% /bond %}',
			{ bond },
		);
		const placed = find(tree, (n) => n.attributes?.[SLOT_ATTR] === 'body');
		expect(placed.map((n) => n.name)).toEqual(['p', 'ul']);
		expect(find(placed[0], (n) => n.name === 'strong')).toHaveLength(1);
		expect(find(placed[1], (n) => n.name === 'li')).toHaveLength(2);
	});

	it('renders at the rune’s transform, after field resolution — not at preprocess (D4)', () => {
		const source = '{% persona name="Veshra" %}\n## Backstory\nRaised in ash.\n{% /persona %}';
		// No preprocess hook: the tag survives preprocess as itself, unexpanded.
		expect(schemaPreprocessors.get(persona.rune.schema)).toBeUndefined();
		const ast = Markdoc.parse(source);
		preprocessTree(
			ast,
			{ url: '/page', relativePath: 'page.md', filePath: '/project/page.md' } as never,
			{ info() {}, warn() {}, error() {} } as never,
			{ ...coreTags, persona: persona.rune.schema } as never,
		);
		const tagNames: string[] = [];
		const walk = (n: Node) => {
			if (n.type === 'tag' && n.tag) tagNames.push(n.tag);
			n.children.forEach(walk);
		};
		walk(ast);
		expect(tagNames).toEqual(['persona']);
		// At the transform the `sections` field has resolved: `$each.heading`
		// is the heading the content model split on.
		const { tree } = render(source, { persona });
		const [details] = byRune(tree, 'details');
		expect(textOf(find(details, (n) => n.name === 'summary')[0])).toBe('Backstory');
	});

	it('compiles the template once, at construction, and calls it where `transform` would be', () => {
		const info = compositionFor(persona.rune.schema)!;
		expect(info.slots).toEqual(['portrait', 'description', 'sections']);
		expect(info.placements.map((p) => p.rune)).toEqual(['card', 'badge', 'details']);
	});

	it('renders fallback content when the slot is empty', () => {
		const empty = render('{% persona name="Kel" /%}', { persona }).tree;
		expect(textOf(empty)).toContain('No description yet.');
		const filled = render('{% persona name="Kel" %}\nA cartographer.\n{% /persona %}', {
			persona,
		}).tree;
		expect(textOf(filled)).toContain('A cartographer.');
		expect(textOf(filled)).not.toContain('No description yet.');
	});

	it('places `sections` with an ordinary `each` slot, binding `$each` per item (D26)', () => {
		const { tree } = render(
			'{% persona name="Veshra" %}\n## Backstory\nRaised in ash.\n\n## Allies\nKel, once.\n{% /persona %}',
			{ persona },
		);
		const details = byRune(tree, 'details');
		expect(details).toHaveLength(2);
		expect(details.map((d: Json) => textOf(find(d, (n) => n.name === 'summary')[0]))).toEqual([
			'Backstory',
			'Allies',
		]);
		// Each item's content is placed by the bare `{% slot /%}`, under the
		// iterated slot's name.
		const placed = find(tree, (n) => n.attributes?.[SLOT_ATTR] === 'sections');
		expect(placed.map(textOf)).toEqual(['Raised in ash.', 'Kel, once.']);
	});
});

describe('`emitAttributes` forms reach a composition template through `$each` (D4a)', () => {
	const tpl = `{% grid %}
{% slot name="sections" each %}
{% details summary=$each.label %}
{% slot /%}
{% /details %}
{% /slot %}
{% /grid %}`;
	const make = (name: string, emit: string, extract = '') =>
		defineComposedRune(
			name,
			definition(
				`attributes: {}
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { label: "${emit}" }
${extract}`,
				tpl,
			),
		);
	const summaries = (c: ComposedRune, name: string, body: string) =>
		byRune(render(`{% ${name} %}\n${body}\n{% /${name} %}`, { [name]: c }).tree, 'details').map(
			(d: Json) => textOf(find(d, (n) => n.name === 'summary')[0]),
		);

	it('`$heading` — the flattened heading text, exactly as an `emitTag` model gets it', () => {
		const c = make('by-heading', '$heading');
		const body = '## The **Bone** Witch\nx';
		// The resolver's own flattening, through its `emitTag` path.
		const [emitted] = resolveSections(Markdoc.parse(body).children, {
			type: 'sections',
			sectionHeading: 'heading:2',
			sectionModel: bodyOnly(),
			emitTag: 'x',
			emitAttributes: { label: '$heading' },
		}).sections as Node[];
		expect(String(emitted.attributes.label).replace(/\s+/g, ' ')).toBe('The Bone Witch');
		expect(summaries(c, 'by-heading', body)).toEqual([emitted.attributes.label]);
	});

	it('`$field` — a `headingExtract` field', () => {
		const c = make(
			'by-field',
			'$year',
			`  headingExtract:
    fields:
      - { name: year, match: text, pattern: "\\\\((\\\\d{4})\\\\)" }`,
		);
		expect(summaries(c, 'by-field', '## Founding (1204)\nx')).toEqual(['1204']);
	});

	it('`$a|$b` — the first non-empty of an ordered fallback', () => {
		const c = make(
			'by-fallback',
			'$year|$heading',
			`  headingExtract:
    fields:
      - { name: year, match: text, pattern: "\\\\((\\\\d{4})\\\\)", optional: true }`,
		);
		expect(summaries(c, 'by-fallback', '## Founding (1204)\nx\n\n## Exile\ny')).toEqual([
			'1204',
			'Exile',
		]);
	});

	it('cannot flatten a node itself: only `$attrs` and `$each` bind, and `$each` only to `emitAttributes`', () => {
		expect(() =>
			defineComposedRune(
				'flattens',
				definition(
					'content:\n  type: sections\n  sectionHeading: heading:2',
					'{% slot name="sections" each %}{% details summary=$each.heading %}{% slot /%}{% /details %}{% /slot %}',
				),
			),
		).toThrow(/Rune "flattens".*`\$each\.heading` names no field of slot `sections`/);
	});
});

describe('identity and markers (D3, D10, D10c)', () => {
	it('the root carries the composed rune’s `data-rune`; the primitives keep theirs inside it', () => {
		const { tree } = render('{% persona name="Veshra" /%}', { persona });
		const runes = find(tree, (n) => n.attributes?.['data-rune'] !== undefined).map(
			(n) => n.attributes['data-rune'],
		);
		expect(runes[0]).toBe('persona');
		expect(runes).toEqual(expect.arrayContaining(['card', 'badge']));
		// The claim is the composed rune's, not a primitive's.
		const [root] = byRune(tree, 'persona');
		expect(root.attributes.typeof).toBe('Person');
		for (const r of ['card', 'badge']) expect(byRune(tree, r)[0].attributes.typeof).toBeUndefined();
	});

	it('sets the ownership marker on slot-placed and template-placed nodes', () => {
		// The transform's own output, before `releaseOwnedNodes` strips the
		// bookkeeping half — what the composed rune's schema row resolves against.
		const { transform } = compileComposition(
			{ rune: 'bond', tag: 'aside', body: BOND.split('---')[2] },
			{
				contentModel: bodyOnly(),
				attributes: ['from', 'to', 'status', 'bidirectional'],
			},
		);
		const resolved = { body: Markdoc.parse('Placed.').children };
		const out = transform(
			resolved,
			{ from: 'A', to: 'B', bidirectional: true },
			{
				tags: declareSlotMarkers(coreTags as Record<string, Schema>),
				nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
				variables: { generatedIds: new Set() },
			} as never,
			Markdoc.parse('{% bond /%}').children[0],
		) as Json;
		const [hint] = byRune(out, 'hint');
		expect(hint.attributes[OWNER_ATTR]).toBe('bond');
		expect(hint.attributes[SLOT_ATTR]).toBeUndefined();
		const [p] = find(out, (n) => n.name === 'p' && textOf(n) === 'Placed.');
		expect(p.attributes).toMatchObject({ [OWNER_ATTR]: 'bond', [SLOT_ATTR]: 'body' });
	});

	it('keeps the markers even when the page config was not assembled with them', () => {
		const tree = serializeTree(
			page('{% bond from="A" to="B" %}\nPlaced.\n{% /bond %}', { bond }, { assemble: false }),
		) as Json;
		expect(find(tree, (n) => n.attributes?.[SLOT_ATTR] === 'body')).toHaveLength(1);
	});

	it('a slot emits no element: each top-level placed node carries `data-slot`, none carries `data-owner`', () => {
		const { html } = render(
			'{% bond from="A" to="B" %}\nOne.\n\nTwo.\n\n{% hint type="warning" %}\nNested.\n{% /hint %}\n{% /bond %}',
			{ bond },
		);
		const placed = find(html, (n) => n.attributes?.[SLOT_ATTR] === 'body');
		expect(placed.map((n) => n.name)).toEqual(['p', 'p', 'section']);
		// No wrapper: the placed nodes sit straight in the hint's body.
		const [body] = find(html, (n) => n.attributes?.['data-name'] === 'body');
		expect(body.children.filter((c: Json) => c.attributes?.[SLOT_ATTR] === 'body')).toHaveLength(3);
		expect(find(html, (n) => n.attributes?.[OWNER_ATTR] !== undefined)).toEqual([]);
	});

	it('an author’s nested rune inside a slot is never retyped as part of the composed entity', () => {
		const withRow = defineComposedRune(
			'gallery-person',
			definition(
				`attributes:
  name: { type: string }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name }
  children:
    figure: { type: ImageObject, property: image }`,
				'{% card %}\n{% slot name="body" /%}\n{% /card %}',
			),
		);
		const { tree } = render(
			'{% gallery-person name="Veshra" %}\n{% figure %}\n![a map](map.png)\n{% /figure %}\n{% /gallery-person %}',
			{ 'gallery-person': withRow },
		);
		const [fig] = byRune(tree, 'figure');
		expect(fig.attributes.property).toBeUndefined();
		const [root] = byRune(tree, 'gallery-person');
		expect(properties(root).image).toBeUndefined();
	});

	it('a placed node’s slot reaches the composed rune’s schema row, and the primitive keeps its own names', () => {
		const { tree } = render('{% persona name="Veshra" %}\n![Veshra](v.jpg)\n{% /persona %}', {
			persona,
		});
		const [root] = byRune(tree, 'persona');
		expect(properties(root)).toMatchObject({ name: ['Veshra'], image: ['v.jpg'] });
	});

	it('a composed rune nested inside another cannot reach the inner one’s names, and vice versa', () => {
		const INNER = definition(
			`attributes:
  name: { type: string }
content:
  type: sequence
  fields:
    portrait: { match: image, optional: true }
    body: { match: any, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name, portrait: image }`,
			'{% card %}\n{% slot name="portrait" /%}\n\n{% slot name="body" /%}\n{% /card %}',
		);
		const inner = defineComposedRune('inner-person', INNER);
		const outerRune = defineComposedRune('outer-person', INNER);
		const { tree } = render(
			`{% outer-person name="Outer" %}
![outer](outer.jpg)

Outer prose.

{% inner-person name="Inner" %}
![inner](inner.jpg)
{% /inner-person %}
{% /outer-person %}`,
			{ 'outer-person': outerRune, 'inner-person': inner },
		);
		const [outer] = byRune(tree, 'outer-person');
		const [nested] = byRune(tree, 'inner-person');
		expect(properties(outer).image).toEqual(['outer.jpg']);
		expect(properties(nested).image).toEqual(['inner.jpg']);
		expect(properties(nested).name).toEqual(['Inner']);
	});
});

describe('the generated block-less config (D2a)', () => {
	it('is generated from the definition, not hand-written', () => {
		expect(bond.typeName).toBe('Bond');
		expect(bond.config.block).toBeUndefined();
		expect(bond.config.modifiers).toEqual({ status: { source: 'meta', default: 'active' } });
	});

	it('carries `metaFields` and `blocks` as declared', () => {
		const c = defineComposedRune(
			'realmish',
			definition(
				`attributes:
  realmType: { type: string }
metaFields:
  realmType: { metaType: category, label: Type }
blocks:
  metadata: { fields: [realmType], layout: definition-list }`,
				'{% card %}\nA realm.\n{% /card %}',
			),
		);
		expect(c.config.metaFields).toEqual({ realmType: { metaType: 'category', label: 'Type' } });
		expect(c.config.blocks).toEqual({
			metadata: { fields: ['realmType'], layout: 'definition-list' },
		});
	});

	it('renders no `rf-*` class and no field bag on the root; modifiers and universal attributes render', () => {
		const { html } = render(
			'{% bond from="A" to="B" status="broken" width="wide" tint="warm" %}\nx\n{% /bond %}',
			{ bond },
		);
		const [root] = byRune(html, 'bond');
		expect(root.attributes.class ?? '').not.toMatch(/rf-/);
		expect(root.attributes['data-rune-fields']).toBeUndefined();
		expect(root.attributes['data-status']).toBe('broken');
		expect(root.attributes['data-width']).toBe('wide');
		expect(root.attributes['data-tint']).toBe('warm');
	});
});

describe('registration reads a node-sourced value from the field bag (D10b)', () => {
	const ctx = (): PipelineContext => ({ info() {}, warn() {}, error() {} });
	const registered = (c: ComposedRune, name: string, source: string) => {
		const renderable = page(source, { [name]: c });
		const pages: TransformedPage[] = [
			{ url: '/a', title: '', headings: [], frontmatter: {}, renderable },
		];
		const registry = new EntityRegistryImpl();
		const hooks = createRegistersHooks(
			collectRegistrations({ [name]: { transform: c.rune.schema } }),
		);
		hooks.register!(pages, registry, ctx());
		return { registry, renderable };
	};

	const byNode = defineComposedRune(
		'node-sourced',
		definition(
			`attributes:
  role: { type: string }
content:
  type: sequence
  fields:
    title: { match: heading }
    body: { match: any, optional: true, greedy: true }
registers:
  entity: { type: figure-of-note, idFrom: title, data: [role, title] }`,
			'{% card %}\n{% slot name="title" /%}\n\n{% slot name="body" /%}\n{% /card %}',
		),
	);
	const byAttr = defineComposedRune(
		'attr-sourced',
		definition(
			`attributes:
  title: { type: string }
  role: { type: string }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
registers:
  entity: { type: figure-of-note, idFrom: title, data: [role, title] }`,
			'{% card %}\n## {% $attrs.title %}\n\n{% slot name="body" /%}\n{% /card %}',
		),
	);

	it('registers the same id and data as an attribute source', () => {
		const a = registered(
			byNode,
			'node-sourced',
			'{% node-sourced role="seer" %}\n## Veshra\nx\n{% /node-sourced %}',
		);
		const b = registered(
			byAttr,
			'attr-sourced',
			'{% attr-sourced title="Veshra" role="seer" %}\nx\n{% /attr-sourced %}',
		);
		const [fromNode] = a.registry.getAll('figure-of-note');
		const [fromAttr] = b.registry.getAll('figure-of-note');
		expect(fromNode).toEqual({ ...fromAttr });
		expect(fromNode).toMatchObject({ id: 'Veshra', data: { role: 'seer', title: 'Veshra' } });
	});

	it('reads it from the field bag, with the ownership marker already gone', () => {
		const { renderable } = registered(
			byNode,
			'node-sourced',
			'{% node-sourced %}\n## Veshra\n{% /node-sourced %}',
		);
		const [root] = byRune(renderable, 'node-sourced');
		expect(JSON.parse(root.attributes['data-rune-fields'])).toMatchObject({ title: 'Veshra' });
		expect(find(renderable, (n) => n.attributes?.[OWNER_ATTR] !== undefined)).toEqual([]);
		// The heading keeps its published slot name; registration did not need it.
		expect(find(renderable, (n) => n.attributes?.[SLOT_ATTR] === 'title')).toHaveLength(1);
	});
});

describe('a plugin rune carrying a template (SPEC-153 D11)', () => {
	const plugin = (runes: Plugin['runes'], theme?: Plugin['theme']): Plugin => ({
		name: 'composed-fixture',
		version: '0.0.0',
		runes,
		...(theme ? { theme } : {}),
	});

	it('passes `validatePlugin` with a template and no `transform`', () => {
		expect(() => validatePlugin(plugin({ bond: { template: BOND } }), 'fixture')).not.toThrow();
	});

	it('is rejected when it carries both, naming the rune', () => {
		const both = plugin({ bond: { template: BOND, transform: bond.rune.schema as never } });
		expect(() => validatePlugin(both, 'fixture')).toThrow(
			/rune "bond" carries both a `transform` and a composition `template`/,
		);
	});

	it('compiles once per entry, so registration and loading see the same schema', () => {
		const entry = { template: BOND };
		expect(pluginRuneSchema('bond', entry)).toBe(pluginRuneSchema('bond', entry));
	});

	it('gets its generated config from `mergePlugins`', () => {
		const loaded: LoadedPlugin = {
			pkg: plugin({ bond: { template: BOND } }),
			npmName: 'fixture',
			runes: { bond: bond.rune },
			fixtures: {},
			fileRoots: {},
		};
		const merged = mergePlugins([loaded], new Set(Object.keys(coreTags)));
		expect(merged.themeRunes.Bond).toEqual(bond.config);
	});
});

describe('contracts derive a composed rune by expansion (D6, D10c)', () => {
	it('lists its slot names and its placed runes, each with its own root', () => {
		const contract = generateStructureContract(
			{ ...baseConfig, runes: { ...baseConfig.runes, Persona: persona.config } },
			{ compositions: collectCompositions({ persona: persona.rune }) },
		);
		const entry = contract.runes.Persona;
		expect(entry.block).toBeUndefined();
		expect(entry.root).toBe('[data-rune="persona"]');
		expect(entry.modifiers).toHaveProperty('role');
		expect(entry.composition?.slots).toEqual(['portrait', 'description', 'sections']);
		const [card] = entry.composition!.expansion;
		expect(card).toMatchObject({ rune: 'card', root: '.rf-card' });
		const json = JSON.stringify(card);
		expect(json).toContain('"slot":"portrait"');
		expect(json).toContain('"slot":"sections","each":true');
		expect(json).toContain('"rune":"details","root":".rf-details"');
	});

	it('moves with a primitive: renaming `card`’s block diffs the composed contract', () => {
		const make = (block: string) =>
			generateStructureContract(
				{
					...baseConfig,
					runes: {
						...baseConfig.runes,
						Card: { ...baseConfig.runes.Card, block },
						Persona: persona.config,
					},
				},
				{ compositions: collectCompositions({ persona: persona.rune }) },
			).runes.Persona;
		expect(make('card')).not.toEqual(make('panel'));
	});
});

// ---------------------------------------------------------------------------
// WORK-623 — every rejection names the rune and the thing it rejected
// ---------------------------------------------------------------------------

describe('a composition definition is checked at construction (WORK-623)', () => {
	const seq = `content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }`;

	it.each(['data', 'snippet', 'include'])(
		'rejects a template containing `{%% %s %%}` at definition load (D4)',
		(tag) => {
			expect(() =>
				defineComposedRune(
					'pre',
					definition(seq, `{% card %}\n{% slot name="body" /%}\n{% ${tag} /%}\n{% /card %}`),
				),
			).toThrow(new RegExp(`^Rune "pre": .*contains \`\\{% ${tag} %\\}\`.*\\(D4\\)`));
		},
	);

	it('rejects more than one of slot declaration / template / transform at schema construction (D5)', () => {
		const template = { rune: 'two-paths', tag: 'div', body: '{% slot name="body" /%}' };
		expect(() =>
			createContentModelSchema({ contentModel: bodyOnly(), template, transform: () => null }),
		).toThrow(/^Rune "two-paths": declares both `transform` and a composition template.*D5/);
		expect(() =>
			createContentModelSchema({
				contentModel: bodyOnly(),
				template,
				emits: { rune: 'two-paths', tag: 'div', slots: { body: 'region' } },
			}),
		).toThrow(
			/^Rune "two-paths": declares both a slot declaration \(`emits`\) and a composition template/,
		);
		expect(() =>
			defineComposedRune(
				'two-paths',
				definition(`transform: x\n${seq}`, '{% slot name="body" /%}'),
			),
		).toThrow(/^Rune "two-paths": .*frontmatter key `transform` declares a second emit path.*D5/);
	});

	it('rejects a content-model field no slot places, naming the field (D11)', () => {
		expect(() =>
			defineComposedRune(
				'drops',
				definition(
					`content:
  type: sequence
  fields:
    lede: { match: paragraph, optional: true }
    body: { match: any, optional: true, greedy: true }`,
					'{% card %}{% slot name="body" /%}{% /card %}',
				),
			),
		).toThrow(/^Rune "drops": .*content-model field `lede` is placed by no slot.*\(D11\)/);
	});

	it('rejects a slot the content model does not produce, naming the slot (D26)', () => {
		expect(() =>
			defineComposedRune(
				'typo',
				definition(seq, '{% slot name="body" /%}\n\n{% slot name="bdy" /%}'),
			),
		).toThrow(/^Rune "typo": .*slot `bdy` names no field of the content model.*\(D26\)/);
	});

	it('rejects a slot placed twice, naming the slot (D26)', () => {
		expect(() =>
			defineComposedRune(
				'twice',
				definition(
					seq,
					'{% card %}\n{% slot name="body" /%}\n{% /card %}\n\n{% slot name="body" /%}',
				),
			),
		).toThrow(/^Rune "twice": .*slot `body` is placed twice.*\(D26\)/);
	});

	it('rejects `each` on a single-valued field, naming the slot (D26)', () => {
		expect(() =>
			defineComposedRune(
				'single',
				definition(
					`content:
  type: sequence
  fields:
    lede: { match: paragraph }`,
					'{% slot name="lede" each %}{% slot /%}{% /slot %}',
				),
			),
		).toThrow(
			/^Rune "single": .*slot `lede` iterates with `each`, but field `lede` holds a single value.*\(D26\)/,
		);
	});

	it('rejects a `$each` field the content model does not emit, naming the field (D26)', () => {
		expect(() =>
			defineComposedRune(
				'each-typo',
				definition(
					`content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { heading: $heading }`,
					'{% slot name="sections" each %}\n{% details summary=$each.title %}{% slot /%}{% /details %}\n{% /slot %}',
				),
			),
		).toThrow(
			/^Rune "each-typo": .*`\$each\.title` names no field of slot `sections`\. `\$each` exposes exactly the content model's `emitAttributes` \(heading\).*\(D26\)/,
		);
	});

	it('rejects `$each` outside an `each` slot, and an undeclared `$attrs`', () => {
		expect(() =>
			defineComposedRune(
				'stray',
				definition(seq, '{% hint title=$each.x %}{% slot name="body" /%}{% /hint %}'),
			),
		).toThrow(/^Rune "stray": .*`\$each\.x` is used outside an `each` slot/);
		expect(() =>
			defineComposedRune(
				'undeclared',
				definition(seq, '# {% $attrs.nme %}\n\n{% slot name="body" /%}'),
			),
		).toThrow(/^Rune "undeclared": .*`\$attrs\.nme` names no declared attribute/);
	});

	it('detects a composition cycle by rune name, at construction rather than at render', () => {
		// Directly: a template placing its own rune.
		expect(() =>
			defineComposedRune(
				'ouroboros',
				definition(seq, '{% ouroboros %}{% slot name="body" /%}{% /ouroboros %}'),
			),
		).toThrow(
			/^Rune "ouroboros": .*places `\{% ouroboros %\}`, which is the rune itself — a composition cycle/,
		);
		// Through another: caught when the catalog is assembled, before any page.
		const a = defineComposedRune(
			'cycle-a',
			definition(seq, '{% cycle-b %}{% slot name="body" /%}{% /cycle-b %}'),
		);
		const b = defineComposedRune(
			'cycle-b',
			definition(seq, '{% cycle-a %}{% slot name="body" /%}{% /cycle-a %}'),
		);
		expect(() => checkComposedCatalog({ 'cycle-a': a.rune, 'cycle-b': b.rune }, {})).toThrow(
			/^Composition cycle: "cycle-a" places "cycle-b" places "cycle-a"/,
		);
	});

	it('rejects placing a rune that declares a peer schema type, naming both runes; a subordinate emitter is allowed (D9)', () => {
		const typed = (name: string, placed: string) =>
			defineComposedRune(
				name,
				definition(
					`${seq}\nschema:\n  type: Person`,
					`{% ${placed} %}\n{% slot name="body" /%}\n{% /${placed} %}`,
				),
			);
		const peer = typed('over-accordion', 'accordion');
		expect(() => checkComposedCatalog({ 'over-accordion': peer.rune }, {})).toThrow(
			/^Rune "over-accordion": it declares schema type `Person` and its template places `\{% accordion %\}`, which declares the peer type `FAQPage`.*\(D9\)/,
		);
		const subordinate = typed('over-figure', 'figure');
		expect(() => checkComposedCatalog({ 'over-figure': subordinate.rune }, {})).not.toThrow();
	});

	it('lets a composition declaring no type place an entity rune: D9 is relational', () => {
		const wrapper = defineComposedRune(
			'faq-post',
			definition(seq, '{% accordion %}\n{% slot name="body" /%}\n{% /accordion %}'),
		);
		expect(() => checkComposedCatalog({ 'faq-post': wrapper.rune }, {})).not.toThrow();
	});

	it('rejects placing a rune that requires a parent, naming both runes and the parent (D12)', () => {
		const orphan = defineComposedRune(
			'orphan-item',
			definition(seq, '{% accordion-item %}\n{% slot name="body" /%}\n{% /accordion-item %}'),
		);
		expect(() => checkComposedCatalog({ 'orphan-item': orphan.rune }, {})).toThrow(
			/^Rune "orphan-item": its template places `\{% accordion-item %\}`, which requires `\{% accordion %\}` as its parent.*\(D12\)/,
		);
		// Placed inside its parent it is fine — and the parent is matched by its
		// `data-rune`, not its tag (`tabs` renders as `tab-group`).
		const parented = defineComposedRune(
			'tabbed',
			definition(
				seq,
				'{% tabs %}\n{% tab name="One" %}\n{% slot name="body" /%}\n{% /tab %}\n{% /tabs %}',
			),
		);
		expect(() => checkComposedCatalog({ tabbed: parented.rune }, {})).not.toThrow();
	});

	it('runs the catalog checks when plugins are merged', () => {
		const orphan: LoadedPlugin = {
			pkg: { name: 'p', version: '0', runes: { 'orphan-item': { template: 'x' } } },
			npmName: 'p',
			runes: {
				'orphan-item': defineComposedRune(
					'orphan-item',
					definition(seq, '{% accordion-item %}{% slot name="body" /%}{% /accordion-item %}'),
				).rune,
			},
			fixtures: {},
			fileRoots: {},
		};
		expect(() => mergePlugins([orphan], new Set(Object.keys(coreTags)))).toThrow(/D12/);
	});

	it('rejects a definition that tries to ship CSS, naming the rune (D2)', () => {
		for (const key of ['css', 'styles', 'block']) {
			expect(() =>
				defineComposedRune('styled', definition(`${key}: x\n${seq}`, '{% slot name="body" /%}')),
			).toThrow(
				new RegExp(`^Rune "styled": .*frontmatter key \`${key}\` would ship styles.*\\(D2\\)`),
			);
		}
		// …and a plugin that hand-writes a theme config for its composed rune.
		const themed: Plugin = {
			name: 'p',
			version: '0',
			runes: { bond: { template: BOND } },
			theme: { runes: { Bond: { block: 'bond' } } },
		};
		expect(() => validatePlugin(themed, 'p')).toThrow(
			/rune "bond" is composed but also has a hand-written theme config.*D2/,
		);
	});

	it('rejects a frontmatter key restating the rune’s name (SPEC-153 D9)', () => {
		expect(() =>
			defineComposedRune('named', definition(`rune: named\n${seq}`, '{% slot name="body" /%}')),
		).toThrow(/^Rune "named": .*restates the rune's name/);
	});

	it('rejects `layout`, which cannot reach into the primitives (D7)', () => {
		expect(() =>
			defineComposedRune('laid-out', definition(`layout: {}\n${seq}`, '{% slot name="body" /%}')),
		).toThrow(/^Rune "laid-out": .*`layout` cannot apply.*\(D7\)/);
	});

	it('names the rune when its schema table or registration is malformed', () => {
		expect(() =>
			defineComposedRune(
				'bad-row',
				definition(`${seq}\nschema:\n  type: Person\n  by: missing`, '{% slot name="body" /%}'),
			),
		).toThrow(/^Rune "bad-row": Invalid schema table/);
	});
});
