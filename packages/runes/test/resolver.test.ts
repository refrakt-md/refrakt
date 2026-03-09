import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Ast } = Markdoc;
import { matchesType, resolveSequence, resolveDelimited, resolve, resolveContentModel } from '../src/lib/resolver.js';
import type { ContentFieldDefinition, DelimitedModel, SequenceModel } from '@refrakt-md/types';

// ---------------------------------------------------------------------------
// Helpers — create synthetic AST nodes
// ---------------------------------------------------------------------------

function node(type: string, attrs: Record<string, any> = {}, children: any[] = []): any {
	return new Ast.Node(type, attrs, children);
}

function paragraph(text = 'text') {
	return node('paragraph', {}, [node('text', { content: text })]);
}

function heading(level: number, text = 'heading') {
	return node('heading', { level }, [node('text', { content: text })]);
}

function list(ordered = false, items: any[] = []) {
	return node('list', { ordered }, items);
}

function fence(lang = '', content = '') {
	return node('fence', { language: lang, content });
}

function hr() {
	return node('hr');
}

function image(src = '/img.png') {
	return node('image', { src });
}

function blockquote(text = 'quote') {
	return node('blockquote', {}, [paragraph(text)]);
}

function tagNode(tagName: string, attrs: Record<string, any> = {}) {
	const n = node('tag', attrs);
	n.tag = tagName;
	return n;
}

// ---------------------------------------------------------------------------
// matchesType
// ---------------------------------------------------------------------------

describe('matchesType', () => {
	it('matches simple type names', () => {
		expect(matchesType(paragraph(), 'paragraph')).toBe(true);
		expect(matchesType(paragraph(), 'heading')).toBe(false);
		expect(matchesType(heading(1), 'heading')).toBe(true);
		expect(matchesType(fence(), 'fence')).toBe(true);
		expect(matchesType(hr(), 'hr')).toBe(true);
		expect(matchesType(image(), 'image')).toBe(true);
		expect(matchesType(blockquote(), 'blockquote')).toBe(true);
	});

	it('matches heading:N', () => {
		expect(matchesType(heading(1), 'heading:1')).toBe(true);
		expect(matchesType(heading(2), 'heading:2')).toBe(true);
		expect(matchesType(heading(1), 'heading:2')).toBe(false);
		expect(matchesType(heading(3), 'heading:3')).toBe(true);
	});

	it('matches list:ordered and list:unordered', () => {
		expect(matchesType(list(true), 'list:ordered')).toBe(true);
		expect(matchesType(list(false), 'list:ordered')).toBe(false);
		expect(matchesType(list(false), 'list:unordered')).toBe(true);
		expect(matchesType(list(true), 'list:unordered')).toBe(false);
		expect(matchesType(list(true), 'list')).toBe(true);
		expect(matchesType(list(false), 'list')).toBe(true);
	});

	it('matches tag:NAME', () => {
		expect(matchesType(tagNode('tint'), 'tag:tint')).toBe(true);
		expect(matchesType(tagNode('bg'), 'tag:bg')).toBe(true);
		expect(matchesType(tagNode('tint'), 'tag:bg')).toBe(false);
	});

	it('matches any', () => {
		expect(matchesType(paragraph(), 'any')).toBe(true);
		expect(matchesType(heading(1), 'any')).toBe(true);
		expect(matchesType(hr(), 'any')).toBe(true);
	});

	it('matches pipe-separated alternatives', () => {
		expect(matchesType(list(false), 'list|fence')).toBe(true);
		expect(matchesType(fence(), 'list|fence')).toBe(true);
		expect(matchesType(paragraph(), 'list|fence')).toBe(false);
		expect(matchesType(heading(2), 'heading:1|heading:2')).toBe(true);
		expect(matchesType(heading(3), 'heading:1|heading:2')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// resolveSequence
// ---------------------------------------------------------------------------

describe('resolveSequence', () => {
	it('matches children in order', () => {
		const children = [paragraph('eyebrow'), heading(1, 'title'), paragraph('blurb')];
		const fields: ContentFieldDefinition[] = [
			{ name: 'eyebrow', match: 'paragraph', optional: true },
			{ name: 'headline', match: 'heading' },
			{ name: 'blurb', match: 'paragraph', optional: true },
		];

		const result = resolveSequence(children, fields);
		expect(result.eyebrow).toBe(children[0]);
		expect(result.headline).toBe(children[1]);
		expect(result.blurb).toBe(children[2]);
	});

	it('skips optional fields when no match', () => {
		const children = [heading(1, 'title'), paragraph('blurb')];
		const fields: ContentFieldDefinition[] = [
			{ name: 'eyebrow', match: 'paragraph', optional: true },
			{ name: 'headline', match: 'heading' },
			{ name: 'blurb', match: 'paragraph', optional: true },
		];

		const result = resolveSequence(children, fields);
		expect(result.eyebrow).toBeUndefined();
		expect(result.headline).toBe(children[0]);
		expect(result.blurb).toBe(children[1]);
	});

	it('collects greedy fields', () => {
		const p1 = paragraph('a');
		const p2 = paragraph('b');
		const p3 = paragraph('c');
		const children = [heading(1), p1, p2, p3];
		const fields: ContentFieldDefinition[] = [
			{ name: 'title', match: 'heading' },
			{ name: 'body', match: 'paragraph', greedy: true },
		];

		const result = resolveSequence(children, fields);
		expect(result.title).toBe(children[0]);
		expect(result.body).toEqual([p1, p2, p3]);
	});

	it('greedy stops at non-matching nodes', () => {
		const p1 = paragraph('a');
		const p2 = paragraph('b');
		const children = [p1, p2, heading(1), paragraph('c')];
		const fields: ContentFieldDefinition[] = [
			{ name: 'intro', match: 'paragraph', greedy: true },
			{ name: 'title', match: 'heading' },
		];

		const result = resolveSequence(children, fields);
		expect(result.intro).toEqual([p1, p2]);
		expect(result.title).toBe(children[2]);
	});

	it('handles empty children', () => {
		const fields: ContentFieldDefinition[] = [
			{ name: 'title', match: 'heading', optional: true },
			{ name: 'body', match: 'paragraph', optional: true },
		];

		const result = resolveSequence([], fields);
		expect(result.title).toBeUndefined();
		expect(result.body).toBeUndefined();
	});

	it('handles all optional fields missing', () => {
		const children = [heading(1)];
		const fields: ContentFieldDefinition[] = [
			{ name: 'intro', match: 'paragraph', optional: true },
			{ name: 'title', match: 'heading' },
			{ name: 'body', match: 'paragraph', optional: true },
			{ name: 'actions', match: 'list', optional: true },
		];

		const result = resolveSequence(children, fields);
		expect(result.intro).toBeUndefined();
		expect(result.title).toBe(children[0]);
		expect(result.body).toBeUndefined();
		expect(result.actions).toBeUndefined();
	});

	it('handles greedy with match: any', () => {
		const children = [heading(1), paragraph('a'), list(), fence()];
		const fields: ContentFieldDefinition[] = [
			{ name: 'title', match: 'heading' },
			{ name: 'content', match: 'any', greedy: true },
		];

		const result = resolveSequence(children, fields);
		expect(result.title).toBe(children[0]);
		expect(result.content).toEqual([children[1], children[2], children[3]]);
	});

	it('matches pipe-separated types', () => {
		const children = [heading(1), fence(), list()];
		const fields: ContentFieldDefinition[] = [
			{ name: 'title', match: 'heading' },
			{ name: 'actions', match: 'list|fence', greedy: true },
		];

		const result = resolveSequence(children, fields);
		expect(result.title).toBe(children[0]);
		expect(result.actions).toEqual([children[1], children[2]]);
	});
});

// ---------------------------------------------------------------------------
// resolveDelimited
// ---------------------------------------------------------------------------

describe('resolveDelimited', () => {
	it('splits at delimiter and resolves named zones', () => {
		const p1 = paragraph('eyebrow');
		const h = heading(1, 'title');
		const img = image('/hero.png');
		const children = [p1, h, hr(), img];

		const model: DelimitedModel = {
			type: 'delimited',
			delimiter: 'hr',
			zones: [
				{
					name: 'content',
					type: 'sequence',
					fields: [
						{ name: 'eyebrow', match: 'paragraph', optional: true },
						{ name: 'headline', match: 'heading' },
					],
				},
				{
					name: 'media',
					type: 'sequence',
					fields: [
						{ name: 'media', match: 'any', greedy: true },
					],
				},
			],
		};

		const result = resolveDelimited(children, model);
		const content = result.content as Record<string, any>;
		const media = result.media as Record<string, any>;

		expect(content.eyebrow).toBe(p1);
		expect(content.headline).toBe(h);
		expect(media.media).toEqual([img]);
	});

	it('handles no delimiter (single zone)', () => {
		const children = [heading(1), paragraph('blurb')];

		const model: DelimitedModel = {
			type: 'delimited',
			delimiter: 'hr',
			zones: [
				{
					name: 'content',
					type: 'sequence',
					fields: [
						{ name: 'title', match: 'heading' },
						{ name: 'blurb', match: 'paragraph', optional: true },
					],
				},
				{
					name: 'media',
					type: 'sequence',
					fields: [
						{ name: 'media', match: 'any', greedy: true, optional: true },
					],
				},
			],
		};

		const result = resolveDelimited(children, model);
		const content = result.content as Record<string, any>;
		const media = result.media as Record<string, any>;

		expect(content.title).toBe(children[0]);
		expect(content.blurb).toBe(children[1]);
		expect(media.media).toBeUndefined();
	});

	it('handles dynamic zones', () => {
		const children = [
			paragraph('a'), hr(), paragraph('b'), hr(), paragraph('c'),
		];

		const model: DelimitedModel = {
			type: 'delimited',
			delimiter: 'hr',
			dynamicZones: true,
			zoneModel: {
				type: 'sequence',
				fields: [
					{ name: 'content', match: 'any', greedy: true },
				],
			},
		};

		const result = resolveDelimited(children, model);
		const zones = result.zones as Record<string, any>[];

		expect(zones).toHaveLength(3);
		expect(zones[0].content).toEqual([children[0]]);
		expect(zones[1].content).toEqual([children[2]]);
		expect(zones[2].content).toEqual([children[4]]);
	});

	it('handles empty children', () => {
		const model: DelimitedModel = {
			type: 'delimited',
			delimiter: 'hr',
			zones: [
				{
					name: 'content',
					type: 'sequence',
					fields: [
						{ name: 'title', match: 'heading', optional: true },
					],
				},
			],
		};

		const result = resolveDelimited([], model);
		const content = result.content as Record<string, any>;
		expect(content.title).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// resolve (top-level dispatcher)
// ---------------------------------------------------------------------------

describe('resolve', () => {
	it('dispatches to sequence resolver', () => {
		const children = [heading(1), paragraph('text')];
		const model: SequenceModel = {
			type: 'sequence',
			fields: [
				{ name: 'title', match: 'heading' },
				{ name: 'body', match: 'paragraph', optional: true },
			],
		};

		const result = resolve(children, model);
		expect(result.title).toBe(children[0]);
		expect(result.body).toBe(children[1]);
	});

	it('dispatches to delimited resolver', () => {
		const children = [heading(1), hr(), paragraph('media')];
		const model: DelimitedModel = {
			type: 'delimited',
			delimiter: 'hr',
			zones: [
				{
					name: 'content',
					type: 'sequence',
					fields: [{ name: 'title', match: 'heading' }],
				},
				{
					name: 'media',
					type: 'sequence',
					fields: [{ name: 'body', match: 'any', greedy: true }],
				},
			],
		};

		const result = resolve(children, model);
		expect((result.content as any).title).toBe(children[0]);
		expect((result.media as any).body).toEqual([children[2]]);
	});
});

// ---------------------------------------------------------------------------
// resolveContentModel (with tint/bg extraction)
// ---------------------------------------------------------------------------

describe('resolveContentModel', () => {
	it('extracts tint child tag before resolving', () => {
		const tint = tagNode('tint', { name: 'warm' });
		const children = [tint, heading(1), paragraph('text')];
		const model: SequenceModel = {
			type: 'sequence',
			fields: [
				{ name: 'title', match: 'heading' },
				{ name: 'body', match: 'paragraph', optional: true },
			],
		};

		const result = resolveContentModel(children, model);
		expect(result.tintNode).toBe(tint);
		expect(result.content.title).toBe(children[1]);
		expect(result.content.body).toBe(children[2]);
	});

	it('extracts bg child tag before resolving', () => {
		const bg = tagNode('bg', { src: '/bg.jpg' });
		const children = [heading(1), bg, paragraph('text')];
		const model: SequenceModel = {
			type: 'sequence',
			fields: [
				{ name: 'title', match: 'heading' },
				{ name: 'body', match: 'paragraph', optional: true },
			],
		};

		const result = resolveContentModel(children, model);
		expect(result.bgNode).toBe(bg);
		expect(result.content.title).toBe(children[0]);
		expect(result.content.body).toBe(children[2]);
	});

	it('resolves normally when no tint/bg present', () => {
		const children = [heading(1), paragraph('text')];
		const model: SequenceModel = {
			type: 'sequence',
			fields: [
				{ name: 'title', match: 'heading' },
				{ name: 'body', match: 'paragraph', optional: true },
			],
		};

		const result = resolveContentModel(children, model);
		expect(result.tintNode).toBeUndefined();
		expect(result.bgNode).toBeUndefined();
		expect(result.content.title).toBe(children[0]);
	});
});
