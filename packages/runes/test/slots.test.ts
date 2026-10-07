import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema, Tag as MdTag } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	bodyOnly,
	renderNodes,
	schemaEmits,
	schemaRuneStructures,
} from '../src/lib/index.js';
import { slotSections, validateEmits } from '../src/lib/slots.js';
import type { EmitsDeclaration } from '../src/lib/slots.js';
import type { ContentModel } from '@refrakt-md/types';

/** Transform `source` with the given tags and return the first rune element. */
function render(tags: Record<string, Schema>, source: string): MdTag {
	const out = Markdoc.transform(Markdoc.parse(source), { tags });
	const find = (n: unknown): MdTag | undefined => {
		if (!Tag.isTag(n as never)) return undefined;
		const t = n as MdTag;
		if (t.attributes['data-rune']) return t;
		for (const c of t.children) {
			const hit = find(c);
			if (hit) return hit;
		}
		return undefined;
	};
	return find(out)!;
}

const childTags = (t: MdTag) => t.children.filter((c): c is MdTag => Tag.isTag(c as never));
const byName = (t: MdTag, name: string) =>
	childTags(t).find((c) => c.attributes['data-name'] === name);

const entityModel: ContentModel = {
	type: 'sections',
	sectionHeading: 'heading:2',
	fields: [
		{ name: 'title', match: 'heading', optional: false },
		{ name: 'description', match: 'paragraph', optional: true, greedy: true },
	],
	sectionModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	knownSections: { 'Acceptance Criteria': { alias: ['Criteria'] } },
};

const entityEmits = {
	rune: 'thing',
	tag: 'article',
	properties: { id: '', status: 'draft' },
	slots: {
		title: { as: 'region', el: 'header' },
		blurb: { from: 'description', as: 'region', omitWhenEmpty: true },
		body: { from: 'sections', as: 'region' },
	},
} satisfies EmitsDeclaration;

describe('emits: the generated transform', () => {
	const thing = createContentModelSchema({
		attributes: { id: { type: String }, status: { type: String } },
		contentModel: entityModel,
		emits: entityEmits,
	});

	it('carries the renderable identity — rune, tag and property', () => {
		const hint = createContentModelSchema({
			attributes: { type: { type: String } },
			contentModel: bodyOnly(),
			emits: {
				rune: 'note',
				tag: 'section',
				property: 'contentSection',
				properties: { hintType: { from: ['attrs.type'], default: 'note' } },
				slots: { body: 'region' },
			},
		});
		const out = render({ note: hint }, '{% note %}\nHello\n{% /note %}');
		expect(out.name).toBe('section');
		expect(out.attributes['data-rune']).toBe('note');
		expect(out.attributes['data-field']).toBe('content-section');
		expect(JSON.parse(out.attributes['data-rune-fields'])).toEqual({ hintType: 'note' });
	});

	it('is byte-identical to the transform it replaces', () => {
		const declared = createContentModelSchema({
			attributes: { type: { type: String } },
			contentModel: bodyOnly(),
			emits: {
				rune: 'note',
				tag: 'section',
				property: 'contentSection',
				properties: { hintType: { from: ['attrs.type'], default: 'note' } },
				slots: { body: 'region' },
			},
		});
		const handWritten = createContentModelSchema({
			attributes: { type: { type: String } },
			contentModel: bodyOnly(),
			transform(resolved, attrs, config) {
				const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
				const body = renderNodes(resolved.body, config).wrap('div');
				return createComponentRenderable({
					rune: 'note',
					tag: 'section',
					property: 'contentSection',
					properties: { hintType },
					refs: { body: body.tag('div') },
					children: [hintType, body.next()],
				});
			},
		});
		const src = '{% note type="warning" %}\nOne *two*\n\n- three\n{% /note %}';
		expect(JSON.stringify(render({ note: declared }, src))).toBe(
			JSON.stringify(render({ note: handWritten }, src)),
		);
	});

	it('names a slot after its field when `from` is omitted, and accepts the kind alone', () => {
		const s = createContentModelSchema({
			contentModel: bodyOnly(),
			emits: { rune: 'plain', tag: 'div', slots: { body: 'region' } },
		});
		const out = render({ plain: s }, '{% plain %}\nText\n{% /plain %}');
		expect(byName(out, 'body')?.name).toBe('div');
	});

	it('wraps a region in `div` by default and in the stated element otherwise', () => {
		const out = render({ thing }, '{% thing %}\n# T\n\nLead.\n{% /thing %}');
		expect(byName(out, 'title')?.name).toBe('header');
		expect(byName(out, 'blurb')?.name).toBe('div');
		expect(byName(out, 'body')?.name).toBe('div');
	});

	it("names only the region's boundary — the nodes inside carry no data-name", () => {
		const out = render({ thing }, '{% thing %}\n# T\n\nOne.\n\nTwo.\n\nThree.\n{% /thing %}');
		const blurb = byName(out, 'blurb')!;
		expect(childTags(blurb)).toHaveLength(3);
		for (const p of childTags(blurb)) expect(p.attributes['data-name']).toBeUndefined();
		expect(childTags(out).filter((c) => c.attributes['data-name'] === 'blurb')).toHaveLength(1);
	});

	it('omits a slot declared omitWhenEmpty, and emits an empty boundary otherwise', () => {
		const out = render({ thing }, '{% thing %}\n# T\n{% /thing %}');
		expect(byName(out, 'blurb')).toBeUndefined();
		expect(byName(out, 'body')?.children).toEqual([]);
	});

	it('emits slots in declaration order and nothing else as children', () => {
		const out = render({ thing }, '{% thing %}\n# T\n\nLead.\n\n## A\n\nx\n{% /thing %}');
		expect(childTags(out).map((c) => c.attributes['data-name'])).toEqual([
			'title',
			'blurb',
			'body',
		]);
	});

	it('renders an attribute value in a span by default', () => {
		const s = createContentModelSchema({
			attributes: { name: { type: String } },
			contentModel: bodyOnly(),
			emits: {
				rune: 'person',
				tag: 'div',
				slots: { name: { from: 'attrs.name', as: 'value' }, body: 'region' },
			},
		});
		const out = render({ person: s }, '{% person name="Ada" %}\nBio\n{% /person %}');
		const name = byName(out, 'name')!;
		expect(name.name).toBe('span');
		expect(name.children).toEqual(['Ada']);
	});

	it('names a value read from a field directly, with no wrapper', () => {
		const s = createContentModelSchema({
			contentModel: {
				type: 'sequence',
				fields: [
					{ name: 'headline', match: 'heading', optional: true },
					{ name: 'body', match: 'any', optional: true, greedy: true },
				],
			},
			emits: { rune: 'card-ish', tag: 'div', slots: { headline: 'value', body: 'region' } },
		});
		const out = render({ 'card-ish': s }, '{% card-ish %}\n## Hi\n\nText\n{% /card-ish %}');
		expect(byName(out, 'headline')?.name).toBe('h2');
		const empty = render({ 'card-ish': s }, '{% card-ish %}\nText\n{% /card-ish %}');
		expect(byName(empty, 'headline')).toBeUndefined();
	});

	describe('section arrival is read from the content model (D5)', () => {
		it('without emitTag: resolved entries render as named sections', () => {
			const out = render(
				{ thing },
				`{% thing %}
# T

## Criteria

- [ ] one

---

## Other notes

Body.
{% /thing %}`,
			);
			const sections = childTags(byName(out, 'body')!);
			expect(sections.map((s) => [s.name, s.attributes['data-name']])).toEqual([
				['section', 'acceptance-criteria'],
				['section', 'other-notes'],
			]);
			const [criteria, other] = sections;
			expect(childTags(criteria)[0].attributes['data-known-section']).toBe('Acceptance Criteria');
			expect(childTags(criteria).some((c) => c.name === 'hr')).toBe(false);
			expect(childTags(other)[0].attributes['data-known-section']).toBeUndefined();
		});

		it('with emitTag: the emitted child runes render as themselves', () => {
			const part = createContentModelSchema({
				attributes: { name: { type: String } },
				contentModel: bodyOnly(),
				emits: {
					rune: 'part',
					tag: 'div',
					slots: { name: { from: 'attrs.name', as: 'value' }, body: 'region' },
				},
			});
			const whole = createContentModelSchema({
				contentModel: {
					type: 'sections',
					sectionHeading: 'heading',
					emitTag: 'part',
					emitAttributes: { name: '$heading' },
					fields: [{ name: 'description', match: 'paragraph', optional: true, greedy: true }],
					sectionModel: bodyOnly(),
				},
				emits: {
					rune: 'whole',
					tag: 'article',
					slots: {
						body: { from: 'description', as: 'region' },
						sections: { as: 'region', omitWhenEmpty: true },
					},
				},
			});
			const out = render(
				{ whole, part },
				'{% whole %}\nLead.\n\n## One\n\nA\n\n## Two\n\nB\n{% /whole %}',
			);
			const parts = childTags(byName(out, 'sections')!);
			expect(parts.map((p) => p.attributes['data-rune'])).toEqual(['part', 'part']);
			expect(parts.map((p) => byName(p, 'name')?.children)).toEqual([['One'], ['Two']]);
			expect(parts.every((p) => p.attributes['data-name'] === undefined)).toBe(true);
		});

		it('follows the branch a conditional model actually took', () => {
			const s = createContentModelSchema({
				attributes: { mode: { type: String } },
				contentModel: {
					when: [
						{
							condition: { attribute: 'mode', in: ['entries'] },
							model: { ...entityModel, fields: [] },
						},
					],
					default: {
						type: 'sections',
						sectionHeading: 'heading:2',
						emitTag: 'hint',
						sectionModel: bodyOnly(),
					},
				},
				emits: { rune: 'switch', tag: 'div', slots: { sections: 'region' } },
			});
			const hint = createContentModelSchema({
				contentModel: bodyOnly(),
				emits: { rune: 'hint', tag: 'aside', slots: { body: 'region' } },
			});
			const src = (mode: string) => `{% switch mode="${mode}" %}\n## A\n\nx\n{% /switch %}`;
			expect(
				childTags(byName(render({ switch: s, hint }, src('entries')), 'sections')!)[0].name,
			).toBe('section');
			expect(childTags(byName(render({ switch: s, hint }, src('tags')), 'sections')!)[0].name).toBe(
				'aside',
			);
		});
	});
});

describe('emits: rejected at schema construction', () => {
	const make =
		(emits: unknown, extra: Record<string, unknown> = {}) =>
		() =>
			createContentModelSchema({
				attributes: { id: { type: String } },
				contentModel: entityModel,
				emits: emits as EmitsDeclaration,
				...extra,
			});

	it('both transform and emits, naming the rune (D8)', () => {
		expect(make(entityEmits, { transform: () => null })).toThrow(/Rune "thing".*both/);
	});

	it('neither transform nor emits (D8)', () => {
		expect(() =>
			createContentModelSchema({ attributes: { id: { type: String } }, contentModel: bodyOnly() }),
		).toThrow(/attributes: id\) declares neither `transform` nor `emits`.*D8/);
	});

	it('any function value, naming where it is (D9)', () => {
		expect(make({ ...entityEmits, slots: { title: { as: 'region', el: () => 'h1' } } })).toThrow(
			/emits\.slots\.title\.el is a function.*D9/,
		);
		expect(make({ ...entityEmits, properties: { id: () => 'x' } })).toThrow(/is a function/);
	});

	it('values that would not survive a JSON round-trip', () => {
		expect(make({ ...entityEmits, property: undefined })).toThrow(/undefined/);
		expect(make({ ...entityEmits, slots: { title: { as: 'region', from: /title/ } } })).toThrow(
			/RegExp instance/,
		);
	});

	it('nesting, ordering and containers (D2)', () => {
		expect(
			make({ ...entityEmits, slots: { title: { as: 'region', slots: { inner: 'value' } } } }),
		).toThrow(/slot `title`: `slots` would nest.*D2/);
		expect(make({ ...entityEmits, slots: { title: { as: 'region', order: 1 } } })).toThrow(/D2/);
		expect(make({ ...entityEmits, slots: { title: { as: 'region', into: 'header' } } })).toThrow(
			/D2/,
		);
		expect(make({ ...entityEmits, layout: { header: ['title'] } })).toThrow(
			/`layout` would declare structure.*D2/,
		);
		expect(make({ ...entityEmits, slots: { title: { as: 'region', el: 'header > h1' } } })).toThrow(
			/single element name/,
		);
	});

	it('a declaration that would put one data-name on two nodes, naming the slot', () => {
		expect(
			make({ ...entityEmits, slots: { blurb: { from: 'description', as: 'value' } } }),
		).toThrow(/slot `blurb`.*two nodes carrying data-name="blurb"/);
		expect(make({ ...entityEmits, slots: { sections: 'value' } })).toThrow(/slot `sections`/);
		expect(make({ ...entityEmits, slots: { id: { from: 'title', as: 'region' } } })).toThrow(
			/slot `id` is also a property/,
		);
	});

	it('a field the content model does not have', () => {
		expect(make({ ...entityEmits, slots: { title: { from: 'heading', as: 'region' } } })).toThrow(
			/names no field of the content model \(fields: title, description, sections\)/,
		);
	});

	it('a model the declaration cannot read', () => {
		expect(() =>
			createContentModelSchema({
				contentModel: { type: 'custom', processChildren: (n) => n, description: 'x' },
				emits: { rune: 'odd', tag: 'div', slots: { children: 'region' } },
			}),
		).toThrow(/custom.*Keep a `transform`/);
	});

	it('a `sections` table restating a slot role', () => {
		expect(make(entityEmits, { sections: { title: 'title' } })).toThrow(/restates the role/);
	});
});

describe('emits: what the declaration supplies besides the transform', () => {
	it('derives the sections join table, and records it on the schema', () => {
		expect(slotSections(entityEmits)).toEqual({
			title: 'title',
			blurb: 'description',
			body: 'body',
		});
		const s = createContentModelSchema({
			contentModel: entityModel,
			emits: entityEmits,
			sections: { preamble: 'preamble' },
		});
		expect(schemaRuneStructures.get(s)?.sections).toEqual({
			title: 'title',
			blurb: 'description',
			body: 'body',
			preamble: 'preamble',
		});
		expect(schemaEmits.get(s)).toBe(entityEmits);
	});

	it('an explicit role wins over the derived one', () => {
		expect(
			slotSections({
				rune: 'x',
				tag: 'div',
				slots: { name: { from: 'attrs.name', as: 'value', role: 'title' }, body: 'region' },
			}),
		).toEqual({ name: 'title', body: 'body' });
	});

	it('round-trips through JSON unchanged', () => {
		expect(JSON.parse(JSON.stringify(entityEmits))).toEqual(entityEmits);
		expect(validateEmits(JSON.parse(JSON.stringify(entityEmits)), entityModel)).toEqual(
			validateEmits(entityEmits, entityModel),
		);
	});
});
