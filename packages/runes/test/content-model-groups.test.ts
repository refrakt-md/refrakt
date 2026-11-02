import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { ContentFieldDefinition } from '@refrakt-md/types';
import { resolveSequence } from '../src/lib/resolver.js';
import { defineComposedRune, parse } from '../src/index.js';
import { CompositionError } from '../src/lib/composition-errors.js';

const { Ast } = Markdoc;

/**
 * SPEC-186 D1, D3, D6 (WORK-692) — a group matches all of its required members
 * or nothing; a `position: last` field claims the container's last node.
 */

// biome-ignore lint/suspicious/noExplicitAny: synthetic AST nodes
type Any = any;
const node = (type: string, attrs: Record<string, Any> = {}, children: Any[] = []): Any =>
	new Ast.Node(type, attrs, children);
const para = (text: string) => node('paragraph', {}, [node('text', { content: text })]);
const heading = (text: string) => node('heading', { level: 2 }, [node('text', { content: text })]);

/** SPEC-186 D5's header grammar, as a group. */
const HEADER: ContentFieldDefinition[] = [
	{
		name: 'header',
		match: '',
		optional: true,
		group: [
			{ name: 'eyebrow', match: 'paragraph', optional: true },
			{ name: 'headline', match: 'heading' },
			{ name: 'blurb', match: 'paragraph', optional: true },
		],
	},
	{ name: 'body', match: 'any', optional: true, greedy: true },
];

describe('a group matches all of its required members, or nothing (D1)', () => {
	it('matches eyebrow, headline and blurb in order, resolving each by its own name', () => {
		const kids = [para('New'), heading('Title'), para('Blurb'), para('Body')];
		const r = resolveSequence(kids, HEADER);
		expect(r.header).toBe(true);
		expect(r.eyebrow).toBe(kids[0]);
		expect(r.headline).toBe(kids[1]);
		expect(r.blurb).toBe(kids[2]);
		expect(r.body).toEqual([kids[3]]);
	});

	it('a paragraph with no heading after it fails the group and falls to the next field (ADR-046)', () => {
		const kids = [para('Just prose'), para('More prose')];
		const r = resolveSequence(kids, HEADER);
		expect(r.header).toBeUndefined();
		expect(r.eyebrow).toBeUndefined();
		expect(r.body).toEqual(kids);
	});

	it('skips an optional member inside the group without failing it', () => {
		const kids = [heading('Title'), para('Blurb')];
		const r = resolveSequence(kids, HEADER);
		expect(r.header).toBe(true);
		expect(r.eyebrow).toBeUndefined();
		expect(r.headline).toBe(kids[0]);
		expect(r.blurb).toBe(kids[1]);
	});

	it('a group may contain a group, and does not backtrack', () => {
		const fields: ContentFieldDefinition[] = [
			{
				name: 'outer',
				match: '',
				group: [
					{ name: 'headline', match: 'heading' },
					{
						name: 'epigraph',
						match: '',
						optional: true,
						group: [
							{ name: 'quote', match: 'blockquote' },
							{ name: 'attribution', match: 'paragraph' },
						],
					},
				],
			},
			{ name: 'rest', match: 'any', optional: true, greedy: true },
		];
		const quote = node('blockquote', {}, [para('Q')]);
		const full = resolveSequence([heading('T'), quote, para('A')], fields);
		expect(full.epigraph).toBe(true);
		expect(full.attribution).toBeDefined();
		// The nested group's required attribution is missing: it takes nothing,
		// and the quote is left for the field after the outer group.
		const partial = resolveSequence([heading('T'), quote], fields);
		expect(partial.outer).toBe(true);
		expect(partial.epigraph).toBeUndefined();
		expect(partial.rest).toEqual([quote]);
	});
});

describe('`position: last` claims the container’s last node (D3)', () => {
	const fields: ContentFieldDefinition[] = [
		{ name: 'body', match: 'paragraph', greedy: true },
		{
			name: 'attribution',
			match: 'paragraph',
			optional: true,
			position: 'last',
			itemModel: {
				fields: [
					{ name: 'dash', match: 'text', pattern: /^\s*[—–-]\s*$/ },
					{ name: 'name', match: 'strong' },
				],
			},
		},
	];
	const attributionLine = () =>
		node('paragraph', {}, [
			node('inline', {}, [
				node('text', { content: '— ' }),
				node('strong', {}, [node('text', { content: 'Ada' })]),
			]),
		]);

	it('reserves the last node when the field matches it; the greedy body reads the rest', () => {
		const line = attributionLine();
		const kids = [para('One.'), para('Two.'), line];
		const r = resolveSequence(kids, fields);
		expect(r.body).toEqual([kids[0], kids[1]]);
		expect(r.attribution).toBe(line);
	});

	it('reserves nothing when the last node is not one, and the body keeps everything', () => {
		const kids = [para('One.'), para('Two.')];
		const r = resolveSequence(kids, fields);
		expect(r.body).toEqual(kids);
		expect(r.attribution).toBeUndefined();
	});
});

function definition(fields: string, template = '{% slot name="body" /%}'): string {
	return `---\ntag: div\ncontent:\n  type: sequence\n  fields:\n${fields}\n---\n\n${template}\n`;
}
const failure = (src: string): CompositionError => {
	try {
		defineComposedRune('probe', src);
	} catch (e) {
		return e as CompositionError;
	}
	throw new Error('expected the definition to be rejected');
};

describe('composition definitions accept groups and `position: last` (D6)', () => {
	it('places a group’s members by their own names', () => {
		const rune = defineComposedRune(
			'probe',
			definition(
				`    header:
      optional: true
      group:
        eyebrow:  { match: paragraph, optional: true }
        headline: { match: heading }
    body: { match: any, optional: true, greedy: true }`,
				'{% slot name="headline" /%}\n\n{% slot name="eyebrow" /%}\n\n{% slot name="body" /%}',
			),
		);
		const tree = Markdoc.transform(parse('{% probe %}\nNew\n\n## Title\n\nRest.\n{% /probe %}'), {
			tags: { probe: rune.rune.schema },
		} as never);
		const text = JSON.stringify(tree);
		// The headline is placed before the eyebrow: the template's order, by name.
		expect(text.indexOf('Title')).toBeLessThan(text.indexOf('New'));
	});

	it('rejects a duplicate name across a group and its siblings', () => {
		const err = failure(
			definition(`    header:
      group:
        body: { match: heading }
    body: { match: any, optional: true }`),
		);
		expect(err.code).toBe('content-field-duplicate');
	});

	it('rejects a group with no required member, or with a match of its own', () => {
		expect(
			failure(
				definition(`    header:
      group:
        eyebrow: { match: paragraph, optional: true }
    body: { match: any, optional: true }`),
			).code,
		).toBe('content-group-invalid');
		expect(
			failure(
				definition(`    header:
      match: heading
      group:
        headline: { match: heading }
    body: { match: any, optional: true }`),
			).code,
		).toBe('content-group-invalid');
	});

	it('rejects `position: last` twice, off the last field, or inside a group', () => {
		const twice = failure(
			definition(`    body: { match: paragraph, position: last }
    tail: { match: paragraph, position: last }`),
		);
		expect(twice.code).toBe('content-position-invalid');
		const notLast = failure(
			definition(`    body: { match: paragraph, position: last }
    tail: { match: paragraph, optional: true }`),
		);
		expect(notLast.message).toMatch(/is not the model's last field/);
		const inGroup = failure(
			definition(`    header:
      group:
        headline: { match: heading, position: last }
    body: { match: any, optional: true }`),
		);
		expect(inGroup.message).toMatch(/in group `header`/);
	});
});
