import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { ContentFieldDefinition } from '@refrakt-md/types';
import { resolveSequence } from '../src/lib/resolver.js';
import { defineComposedRune, parse, tags as coreTags } from '../src/index.js';
import { CompositionError } from '../src/lib/composition-errors.js';

/**
 * SPEC-186 D2 (WORK-693) — a block field reads its node's children with a
 * nested model, into dotted members.
 */

// biome-ignore lint/suspicious/noExplicitAny: AST nodes
type Any = any;

const QUOTE: ContentFieldDefinition[] = [
	{
		name: 'quote',
		match: 'blockquote',
		model: {
			type: 'sequence',
			fields: [
				{ name: 'body', match: 'paragraph', greedy: true },
				{
					name: 'attribution',
					match: 'paragraph',
					optional: true,
					position: 'last',
					itemModel: { fields: [{ name: 'name', match: 'strong' }] },
				},
			],
		},
	},
];

const quoteNode = (src: string): Any => Markdoc.parse(src).children[0];

describe('a nested model reads a block node’s children (D2)', () => {
	it('the field still takes the whole node, and its members resolve to dotted names', () => {
		const q = quoteNode('> One.\n>\n> Two.\n>\n> — **Ada Lovelace**, Analyst');
		const r = resolveSequence([q], QUOTE);
		expect(r.quote).toBe(q);
		expect((r['quote.body'] as Any[]).length).toBe(2);
		expect(r['quote.attribution']).toBe(q.children[2]);
	});

	it('nests to any depth: `a.b.c`', () => {
		const fields: ContentFieldDefinition[] = [
			{
				name: 'outer',
				match: 'blockquote',
				model: {
					type: 'sequence',
					fields: [
						{
							name: 'inner',
							match: 'blockquote',
							model: { type: 'sequence', fields: [{ name: 'text', match: 'paragraph' }] },
						},
					],
				},
			},
		];
		const r = resolveSequence([quoteNode('> > Deep.')], fields);
		expect(r['outer.inner.text']).toBeDefined();
	});
});

const DEF = (
	template: string,
	model = 'quote:\n      match: blockquote\n      model:\n        type: sequence\n        fields:\n          body:        { match: paragraph, greedy: true }\n          attribution: { match: paragraph, optional: true, position: last }',
) => `---\ntag: figure\ncontent:\n  type: sequence\n  fields:\n    ${model}\n---\n\n${template}\n`;

const failure = (src: string): CompositionError => {
	try {
		defineComposedRune('saying', src);
	} catch (e) {
		return e as CompositionError;
	}
	throw new Error('expected the definition to be rejected');
};

describe('a composition places a member by its dotted name, or the node whole (D2.2)', () => {
	it('places members apart', () => {
		const rune = defineComposedRune(
			'saying',
			DEF('{% slot name="quote.attribution" /%}\n\n{% slot name="quote.body" /%}'),
		);
		const out = JSON.stringify(
			Markdoc.transform(parse('{% saying %}\n> Wise words.\n>\n> Ada\n{% /saying %}'), {
				tags: { ...coreTags, saying: rune.rune.schema },
			} as never),
		);
		// The attribution, the quote's last line, is placed first.
		expect(out.indexOf('Ada')).toBeLessThan(out.indexOf('Wise words.'));
	});

	it('placing the node whole needs no member placed', () => {
		expect(() => defineComposedRune('saying', DEF('{% slot name="quote" /%}'))).not.toThrow();
	});

	it('rejects placing the node and a member', () => {
		expect(failure(DEF('{% slot name="quote" /%}\n\n{% slot name="quote.body" /%}')).code).toBe(
			'nested-placed-twice',
		);
	});

	it('rejects placing some members but not all: the rest would be dropped', () => {
		const err = failure(DEF('{% slot name="quote.body" /%}'));
		expect(err.code).toBe('field-unplaced');
		expect(err.message).toMatch(/`quote\.attribution`/);
	});

	it('rejects a nested model on a field that is not one block node', () => {
		const err = failure(
			DEF(
				'{% slot name="quote" /%}',
				'quote:\n      match: paragraph\n      model:\n        type: sequence\n        fields:\n          name: { match: any }',
			),
		);
		expect(err.code).toBe('content-nested-invalid');
	});
});

describe('an unmatched child inside the node is reported, naming the field (D2.4)', () => {
	it('names the nested model in the finding', () => {
		const rune = defineComposedRune(
			'saying',
			DEF(
				'{% slot name="quote" /%}',
				'quote:\n      match: blockquote\n      model:\n        type: sequence\n        fields:\n          body: { match: paragraph }',
			),
		);
		const findings = Markdoc.validate(
			parse('{% saying %}\n> One.\n>\n> - a list nothing reads\n{% /saying %}'),
			{ tags: { ...coreTags, saying: rune.rune.schema } } as never,
		).filter((f) => f.error.id === 'content-unmatched');
		expect(findings).toHaveLength(1);
		expect(findings[0].error.message).toMatch(/nested model of `quote`/);
	});
});
