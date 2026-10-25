import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import {
	tags as coreTags,
	nodes as coreNodes,
	compositionFor,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	hydrateRuneInfo,
	describeRune,
	serializeTree,
	SLOT_ATTR,
	type ComposedRune,
} from '../src/index.js';
import { CompositionError } from '../src/lib/composition-errors.js';
import { compileComposition } from '../src/lib/composition.js';

/**
 * SPEC-169 — what the composition parser accepts beyond `sequence` and
 * `sections`: a delimited model with fixed zones (D1, WORK-646), an implicit
 * section (D3, WORK-647) and `each` over a list's items (D4, WORK-648). And
 * BUG-038: a YAML `itemModel`'s patterns are compiled, so `$each` binds.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

/** A definition the composed-runes guide includes, read from its file. */
const fixture = (name: string) =>
	readFileSync(join(__dirname, 'fixtures', 'composed', `${name}.md`), 'utf-8');

function definition(front: string, template: string): string {
	return `---\n${front.trim()}\n---\n\n${template.trim()}\n`;
}

function render(source: string, extra: Record<string, ComposedRune>): Json {
	const own: Record<string, Schema> = {};
	for (const [name, c] of Object.entries(extra)) own[name] = c.rune.schema;
	const tree = Markdoc.transform(Markdoc.parse(source), {
		tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/test', headings: [] },
	} as never);
	return serializeTree(tree);
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
const byName = (tree: Json, name: string) =>
	find(tree, (n) => n.attributes?.['data-name'] === name);
const textOf = (n: Json): string =>
	typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : textOf(n?.children ?? []);

/** The construction error a definition throws, for asserting its code. */
function failure(name: string, source: string): CompositionError {
	try {
		defineComposedRune(name, source);
	} catch (e) {
		return e as CompositionError;
	}
	throw new Error(`"${name}" built without error`);
}

// ---------------------------------------------------------------------------
// BUG-038
// ---------------------------------------------------------------------------

describe('a YAML `itemModel` extracts its fields (BUG-038)', () => {
	const swatches = defineComposedRune(
		'swatches',
		definition(
			String.raw`
content:
  type: sequence
  fields:
    rows:
      match: list
      itemModel:
        fields:
          - { name: name, match: text, pattern: "^\\s*([^:]+?)\\s*:" }
          - { name: value, match: text, pattern: remainder }
      emitTag: span
      emitAttributes: { name: $name, value: $value }`,
			`{% grid %}
{% slot name="rows" each %}
{% badge %}{% $each.name %} = {% $each.value %}{% /badge %}

{% slot /%}
{% /slot %}
{% /grid %}`,
		),
	);

	it('compiles a string `pattern` into a regular expression, so `$each` binds', () => {
		const tree = render('{% swatches %}\n- Primary: #2563EB\n- Accent: #F59E0B\n{% /swatches %}', {
			swatches,
		});
		expect(byRune(tree, 'badge').map(textOf)).toEqual(['Primary = #2563EB', 'Accent = #F59E0B']);
	});

	it('compiles patterns at every nesting level', () => {
		const model = swatches.definition.contentModel as Json;
		expect(model.fields[0].itemModel.fields[0].pattern).toBeInstanceOf(RegExp);
		expect(model.fields[0].itemModel.fields[1].pattern).toBe('remainder');

		const nested = defineComposedRune(
			'nested-items',
			definition(
				String.raw`
content:
  type: sequence
  fields:
    rows:
      match: list
      itemModel:
        fields:
          - name: cues
            match: list
            itemModel:
              fields:
                - { name: time, match: text, pattern: "^(\\d+:\\d+)" }`,
				'{% slot name="rows" /%}',
			),
		);
		const cues = (nested.definition.contentModel as Json).fields[0].itemModel.fields[0];
		expect(cues.itemModel.fields[0].pattern).toEqual(/^(\d+:\d+)/);
	});

	it('reports an invalid regular expression as `content-model-invalid`, naming the field', () => {
		const err = failure(
			'bad-pattern',
			definition(
				`
content:
  type: sequence
  fields:
    rows:
      match: list
      itemModel:
        fields:
          - { name: name, match: text, pattern: "([unclosed" }`,
				'{% slot name="rows" /%}',
			),
		);
		expect(err.code).toBe('content-model-invalid');
		expect(err.message).toMatch(/field `name`: `pattern` is not a regular expression/);
	});
});

// ---------------------------------------------------------------------------
// WORK-646 — SPEC-169 D1
// ---------------------------------------------------------------------------

/** The composition consumes the `---`; the template re-emits one where `card`
 *  should split (D1 rule 4). The file is the guide's example. */
const TEASER = fixture('teaser');

describe('a delimited content model with fixed zones (SPEC-169 D1)', () => {
	const teaser = defineComposedRune('teaser', TEASER);

	it('places each zone field as a slot: the slots are the union of the zones’ fields', () => {
		expect(compositionFor(teaser.rune.schema)!.slots).toEqual(['media', 'headline', 'blurb']);
	});

	it('splits a placed `card` into media and body where the template re-emits `---`', () => {
		const tree = render(
			'{% teaser %}\n![Harbour](/harbour.jpg)\n\n---\n\n# The harbour\n\nSalt and rope.\n{% /teaser %}',
			{ teaser },
		);
		const [card] = byRune(tree, 'card');
		const [media] = byName(card, 'media');
		const [body] = byName(card, 'body');
		expect(find(media, (n) => n.name === 'img')[0].attributes.src).toBe('/harbour.jpg');
		expect(find(body, (n) => n.name === 'h1').map(textOf)).toEqual(['The harbour']);
		expect(textOf(body)).toContain('Salt and rope.');
		// The author's delimiter is consumed, not rendered.
		expect(find(tree, (n) => n.name === 'hr')).toHaveLength(0);
		// Each placed node keeps its slot name.
		expect(find(card, (n) => n.attributes?.[SLOT_ATTR] === 'headline')).toHaveLength(1);
	});

	it('honours `primary`: content written with no `---` is the content zone', () => {
		const tree = render('{% teaser %}\n# The harbour\n\nSalt and rope.\n{% /teaser %}', {
			teaser,
		});
		const [card] = byRune(tree, 'card');
		expect(byName(card, 'media')).toHaveLength(0);
		expect(find(byName(card, 'body'), (n) => n.name === 'h1').map(textOf)).toEqual(['The harbour']);
	});

	it('rejects a field name in two zones', () => {
		const err = failure(
			'twice',
			definition(
				`
content:
  type: delimited
  zones:
    - name: a
      fields:
        body: { match: any, optional: true, greedy: true }
    - name: b
      fields:
        body: { match: any, optional: true, greedy: true }`,
				'{% slot name="body" /%}',
			),
		);
		expect(err.code).toBe('zone-field-twice');
		expect(err.message).toMatch(/field `body` is declared in zone `a` and in zone `b`/);
	});

	it('rejects a delimiter other than `hr`', () => {
		const err = failure(
			'by-heading',
			definition(
				`
content:
  type: delimited
  delimiter: heading
  zones:
    - name: a
      fields:
        body: { match: any, optional: true, greedy: true }`,
				'{% slot name="body" /%}',
			),
		);
		expect(err.code).toBe('delimiter-unsupported');
		expect(err.message).toMatch(/not `heading`/);
	});

	it('rejects `dynamicZones`', () => {
		const err = failure(
			'dynamic',
			definition(
				`
content:
  type: delimited
  dynamicZones: true
  zoneModel:
    fields:
      body: { match: any }`,
				'',
			),
		);
		expect(err.code).toBe('dynamic-zones');
	});

	it('rejects the same three when the model is handed to the compiler in code', () => {
		// The compiler checks a model it is given directly, not only one parsed
		// from frontmatter.
		const zone = (name: string) => ({
			name,
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', greedy: true, optional: true }],
		});
		const models = {
			'zone-field-twice': { type: 'delimited', delimiter: 'hr', zones: [zone('a'), zone('b')] },
			'delimiter-unsupported': { type: 'delimited', delimiter: 'heading', zones: [zone('a')] },
			'dynamic-zones': { type: 'delimited', delimiter: 'hr', dynamicZones: true },
		};
		for (const [code, model] of Object.entries(models)) {
			let caught: CompositionError | undefined;
			try {
				compileFor(model);
			} catch (e) {
				caught = e as CompositionError;
			}
			expect(caught?.code, code).toBe(code);
		}
	});

	it('shows its zones and slots in the reference', () => {
		const ref = describeRune(hydrateRuneInfo(teaser.rune));
		expect(ref).toContain('Content is split by `---` into zones.');
		expect(ref).toContain('Zone "media":');
		expect(ref).toContain('Zone "content" (primary — content written with no `---`):');
		expect(ref).toContain('Template slots: media, headline, blurb');
	});
});

function compileFor(model: unknown) {
	return compileComposition(
		{ rune: 'in-code', tag: 'div', body: '{% slot name="body" /%}' },
		{ contentModel: model as never, attributes: [] },
	);
}

// ---------------------------------------------------------------------------
// WORK-647 — SPEC-169 D3
// ---------------------------------------------------------------------------

describe('`implicitSection` on a sections model (SPEC-169 D3)', () => {
	const DAYS = definition(
		`
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { label: $heading }
  implicitSection: { attributes: { label: "The day" } }`,
		`{% grid %}
{% slot name="sections" each %}
{% details summary=$each.label %}
{% slot /%}
{% /details %}
{% /slot %}
{% /grid %}`,
	);
	const days = defineComposedRune('days', DAYS);
	const summaries = (tree: Json) =>
		byRune(tree, 'details').map((d: Json) => textOf(find(d, (n) => n.name === 'summary')[0]));

	it('with no section heading, all content is one item of `sections`, `$each` bound from its attributes', () => {
		const tree = render('{% days %}\nBreakfast at the inn.\n\nA walk to the cliffs.\n{% /days %}', {
			days,
		});
		expect(summaries(tree)).toEqual(['The day']);
		const placed = find(tree, (n) => n.attributes?.[SLOT_ATTR] === 'sections');
		expect(placed.map(textOf)).toEqual(['Breakfast at the inn.', 'A walk to the cliffs.']);
	});

	it('with section headings, each section is an item as before', () => {
		const tree = render('{% days %}\n## Monday\nInn.\n\n## Tuesday\nCliffs.\n{% /days %}', {
			days,
		});
		expect(summaries(tree)).toEqual(['Monday', 'Tuesday']);
	});

	it('requires its attribute keys to equal `emitAttributes`’ keys', () => {
		const err = failure(
			'mismatch',
			definition(
				`
content:
  type: sections
  emitAttributes: { label: $heading, day: $heading }
  implicitSection: { attributes: { label: "", time: "" } }`,
				'{% slot name="sections" each %}{% slot /%}{% /slot %}',
			),
		);
		expect(err.code).toBe('implicit-section-mismatch');
		expect(err.message).toMatch(/missing `day`; not emitted `time`/);
	});

	it('names SPEC-169’s alternatives when a model is conditional', () => {
		let caught: CompositionError | undefined;
		try {
			compileFor({ when: [], default: { type: 'sequence', fields: [] } });
		} catch (e) {
			caught = e as CompositionError;
		}
		expect(caught?.code).toBe('content-model-type');
		expect(caught?.message).toMatch(/`implicitSection`/);
		expect(caught?.message).toMatch(/`each` over a list field/);
		expect(caught?.message).toMatch(/template that places every alternative/);
	});
});

// ---------------------------------------------------------------------------
// WORK-648 — SPEC-169 D4
// ---------------------------------------------------------------------------

/** SPEC-169 D4's `steps`, in a plain `grid` until SPEC-156's ladder exists.
 *  The file is the guide's example. */
const STEPS = fixture('steps');

describe('`each` over the items of a list field (SPEC-169 D4)', () => {
	const steps = defineComposedRune('steps-composed', STEPS);
	const stepTexts = (tree: Json) =>
		byRune(tree, 'text-block').map((t: Json) => textOf(t).replace(/\s+/g, ' ').trim());

	it('renders the same steps from an ordered list and from headings, with one model', () => {
		const fromList = render(
			'{% steps-composed %}\nThree steps.\n\n1. Install\n2. Configure\n3. Build\n{% /steps-composed %}',
			{ 'steps-composed': steps },
		);
		const fromHeadings = render(
			'{% steps-composed %}\nThree steps.\n\n## Install\n\n## Configure\n\n## Build\n{% /steps-composed %}',
			{ 'steps-composed': steps },
		);
		expect(stepTexts(fromList)).toEqual(['Install', 'Configure', 'Build']);
		expect(stepTexts(fromHeadings)).toEqual(stepTexts(fromList));
	});

	it('places each item’s content with the bare slot, under the field’s name', () => {
		const tree = render(
			'{% steps-composed %}\n1. Install **it**\n2. Run it\n{% /steps-composed %}',
			{ 'steps-composed': steps },
		);
		const placed = find(tree, (n) => n.attributes?.[SLOT_ATTR] === 'items');
		expect(placed.map((n: Json) => n.name)).toEqual(['p', 'p']);
		expect(find(placed[0], (n) => n.name === 'strong')).toHaveLength(1);
	});

	it('binds no `$each` on a list item', () => {
		const err = failure(
			'list-each-binding',
			definition(
				`
content:
  type: sequence
  fields:
    items: { match: list }`,
				'{% slot name="items" each %}{% badge %}{% $each.text %}{% /badge %}{% slot /%}{% /slot %}',
			),
		);
		expect(err.code).toBe('each-field-not-emitted');
	});

	it('rejects `each` over a greedy list field, naming it', () => {
		const err = failure(
			'greedy-lists',
			definition(
				`
content:
  type: sequence
  fields:
    items: { match: list, greedy: true }`,
				'{% slot name="items" each %}{% slot /%}{% /slot %}',
			),
		);
		expect(err.code).toBe('each-on-list-ambiguous');
		expect(err.message).toMatch(/field `items` is greedy/);
	});

	it('still rejects `each` over a field that may match something other than a list', () => {
		const err = failure(
			'mixed-field',
			definition(
				`
content:
  type: sequence
  fields:
    items: { match: "list|paragraph" }`,
				'{% slot name="items" each %}{% slot /%}{% /slot %}',
			),
		);
		expect(err.code).toBe('each-on-single-field');
	});
});
