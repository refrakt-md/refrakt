import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Ast } = Markdoc;
import { matchesType, resolveSequence, resolveDelimited, resolveSections, resolve, resolveContentModel, resolveListItems, evaluateCondition } from '../src/lib/resolver.js';
import type { ContentFieldDefinition, DelimitedModel, SequenceModel, SectionsModel, CustomModel, ConditionalContentModel, ItemModel } from '@refrakt-md/types';

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
// resolveSections
// ---------------------------------------------------------------------------

describe('resolveSections', () => {
	it('splits at headings with auto-detected level', () => {
		const p1 = paragraph('intro');
		const h1 = heading(2, 'Section A');
		const p2 = paragraph('body a');
		const h2 = heading(2, 'Section B');
		const p3 = paragraph('body b');
		const children = [p1, h1, p2, h2, p3];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			fields: [
				{ name: 'preamble', match: 'any', greedy: true, optional: true },
			],
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		expect(result.preamble).toEqual([p1]);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(2);
		expect(sections[0].$heading).toBe('Section A');
		expect(sections[0].body).toEqual([p2]);
		expect(sections[1].$heading).toBe('Section B');
		expect(sections[1].body).toEqual([p3]);
	});

	it('splits at explicit heading level', () => {
		const h2 = heading(2, 'Top');
		const p1 = paragraph('text');
		const h3 = heading(3, 'Sub');
		const p2 = paragraph('sub text');
		const children = [h2, p1, h3, p2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading:2',
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].$heading).toBe('Top');
		// h3 and p2 are part of section body (not split at h3)
		expect(sections[0].body).toEqual([p1, h3, p2]);
	});

	it('handles no headings (everything is preamble)', () => {
		const p1 = paragraph('a');
		const p2 = paragraph('b');
		const children = [p1, p2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			fields: [
				{ name: 'content', match: 'any', greedy: true, optional: true },
			],
			sectionModel: {
				type: 'sequence',
				fields: [],
			},
		};

		const result = resolveSections(children, model);
		expect(result.content).toEqual([p1, p2]);
		expect(result.sections).toEqual([]);
	});

	it('handles empty children', () => {
		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [],
			},
		};

		const result = resolveSections([], model);
		expect(result.sections).toEqual([]);
	});

	it('promotes deeper heading level when first heading is shallower', () => {
		const title = heading(2, 'How it works');
		const blurb = paragraph('Some intro text');
		const s1 = heading(3, 'Step 1');
		const p1 = paragraph('body 1');
		const s2 = heading(3, 'Step 2');
		const p2 = paragraph('body 2');
		const s3 = heading(3, 'Step 3');
		const p3 = paragraph('body 3');
		const children = [title, blurb, s1, p1, s2, p2, s3, p3];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			fields: [
				{ name: 'header', match: 'heading|paragraph', greedy: true, optional: true },
			],
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		// h2 title and blurb paragraph go to preamble
		expect(result.header).toEqual([title, blurb]);
		// h3 headings become sections
		const sections = result.sections as any[];
		expect(sections).toHaveLength(3);
		expect(sections[0].$heading).toBe('Step 1');
		expect(sections[1].$heading).toBe('Step 2');
		expect(sections[2].$heading).toBe('Step 3');
	});

	it('does not promote when only one deeper heading exists', () => {
		const title = heading(2, 'Title');
		const sub = heading(3, 'Only sub');
		const p = paragraph('body');
		const children = [title, sub, p];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		// Falls back to first heading level (h2)
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].$heading).toBe('Title');
		expect(sections[0].body).toEqual([sub, p]);
	});

	it('keeps same-level headings as sections (no promotion)', () => {
		const h1 = heading(2, 'Step A');
		const p1 = paragraph('body a');
		const h2 = heading(2, 'Step B');
		const p2 = paragraph('body b');
		const children = [h1, p1, h2, p2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(2);
		expect(sections[0].$heading).toBe('Step A');
		expect(sections[1].$heading).toBe('Step B');
	});

	it('handles no preamble (first child is a heading)', () => {
		const h = heading(2, 'First');
		const p = paragraph('body');
		const children = [h, p];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			fields: [
				{ name: 'preamble', match: 'any', greedy: true, optional: true },
			],
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		expect(result.preamble).toBeUndefined();
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].$heading).toBe('First');
		expect(sections[0].body).toEqual([p]);
	});

	it('emits tag nodes with emitTag', () => {
		const h1 = heading(2, 'Item One');
		const p1 = paragraph('body one');
		const h2 = heading(2, 'Item Two');
		const p2 = paragraph('body two');
		const children = [h1, p1, h2, p2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			emitTag: 'accordion-item',
			emitAttributes: { name: '$heading' },
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(2);

		// Emitted tag nodes are AST nodes
		expect(sections[0].type).toBe('tag');
		expect(sections[0].tag).toBe('accordion-item');
		expect(sections[0].attributes.name).toBe('Item One');
		expect(sections[0].children).toEqual([p1]);

		expect(sections[1].type).toBe('tag');
		expect(sections[1].tag).toBe('accordion-item');
		expect(sections[1].attributes.name).toBe('Item Two');
		expect(sections[1].children).toEqual([p2]);
	});

	it('emits tag nodes with preamble and emitTag', () => {
		const intro = paragraph('intro');
		const h1 = heading(2, 'Step A');
		const p1 = paragraph('step a body');
		const children = [intro, h1, p1];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			fields: [
				{ name: 'header', match: 'paragraph', greedy: true, optional: true },
			],
			emitTag: 'step',
			emitAttributes: { name: '$heading' },
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		expect(result.header).toEqual([intro]);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].tag).toBe('step');
		expect(sections[0].attributes.name).toBe('Step A');
	});

	it('applies headingExtract patterns', () => {
		const h1 = heading(2, '2023 — Company Founded');
		const p1 = paragraph('details');
		const h2 = heading(2, 'Growth Phase');
		const p2 = paragraph('more details');
		const children = [h1, p1, h2, p2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			headingExtract: {
				fields: [
					{ name: 'date', match: 'text', pattern: /^(.+?)\s*[-–—]\s*/, optional: true },
					{ name: 'label', match: 'text', pattern: 'remainder' },
				],
			},
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(2);

		// First heading: "2023 — Company Founded" → date=2023, label=Company Founded
		expect(sections[0].$date).toBe('2023');
		expect(sections[0].$label).toBe('Company Founded');
		expect(sections[0].$heading).toBe('2023 — Company Founded');

		// Second heading: "Growth Phase" → no date match (optional), label=Growth Phase
		expect(sections[1].$date).toBeUndefined();
		expect(sections[1].$label).toBe('Growth Phase');
	});

	it('uses headingExtract with emitTag and emitAttributes', () => {
		const h = heading(2, '2023 — Founded');
		const p = paragraph('details');
		const children = [h, p];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			headingExtract: {
				fields: [
					{ name: 'date', match: 'text', pattern: /^(.+?)\s*[-–—]\s*/, optional: true },
					{ name: 'label', match: 'text', pattern: 'remainder' },
				],
			},
			emitTag: 'timeline-entry',
			emitAttributes: { date: '$date', label: '$label' },
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].tag).toBe('timeline-entry');
		expect(sections[0].attributes.date).toBe('2023');
		expect(sections[0].attributes.label).toBe('Founded');
	});

	it('resolves nested section models', () => {
		const h2 = heading(2, 'Day 1');
		const h3a = heading(3, 'Morning');
		const p1 = paragraph('morning activities');
		const h3b = heading(3, 'Afternoon');
		const p2 = paragraph('afternoon activities');
		const children = [h2, h3a, p1, h3b, p2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading:2',
			sectionModel: {
				type: 'sections',
				sectionHeading: 'heading:3',
				sectionModel: {
					type: 'sequence',
					fields: [
						{ name: 'body', match: 'any', greedy: true, optional: true },
					],
				},
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].$heading).toBe('Day 1');

		// Nested sections from the inner model
		const innerSections = sections[0].sections as any[];
		expect(innerSections).toHaveLength(2);
		expect(innerSections[0].$heading).toBe('Morning');
		expect(innerSections[0].body).toEqual([p1]);
		expect(innerSections[1].$heading).toBe('Afternoon');
		expect(innerSections[1].body).toEqual([p2]);
	});

	it('preserves heading node reference', () => {
		const h = heading(2, 'Section');
		const p = paragraph('body');
		const children = [h, p];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections[0].$headingNode).toBe(h);
	});

	it('handles section with no body content', () => {
		const h1 = heading(2, 'Empty');
		const h2 = heading(2, 'Also Empty');
		const children = [h1, h2];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(2);
		expect(sections[0].$heading).toBe('Empty');
		expect(sections[0].body).toBeUndefined();
		expect(sections[1].$heading).toBe('Also Empty');
		expect(sections[1].body).toBeUndefined();
	});

	it('wraps all children in a single emitted tag when implicitSection is set and no headings found', () => {
		const children = [paragraph('intro'), paragraph('detail')];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
			emitTag: 'my-wrapper',
			implicitSection: { attributes: { label: 'default' } },
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].type).toBe('tag');
		expect(sections[0].tag).toBe('my-wrapper');
		expect(sections[0].attributes.label).toBe('default');
		expect(sections[0].children).toHaveLength(2);
	});

	it('does not use implicitSection when headings are present', () => {
		const children = [heading(2, 'Section A'), paragraph('body')];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading:2',
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
			emitTag: 'my-wrapper',
			implicitSection: { attributes: { label: 'default' } },
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].attributes.label).toBeUndefined();
	});

	it('wraps children when explicit heading level has no matches', () => {
		// Flat itinerary case: heading:2 specified but only h3s present
		const children = [heading(3, 'Stop A'), paragraph('desc'), heading(3, 'Stop B')];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading:2',
			sectionModel: {
				type: 'sequence',
				fields: [],
			},
			emitTag: 'itinerary-day',
			implicitSection: { attributes: { label: '' } },
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].tag).toBe('itinerary-day');
		expect(sections[0].attributes.label).toBe('');
		expect(sections[0].children).toHaveLength(3);
	});

	it('implicitSection with empty attributes', () => {
		const children = [paragraph('content')];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [],
			},
			emitTag: 'wrapper',
			implicitSection: {},
		};

		const result = resolveSections(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].tag).toBe('wrapper');
		expect(sections[0].children).toHaveLength(1);
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

	it('dispatches to sections resolver', () => {
		const h = heading(2, 'Section');
		const p = paragraph('body');
		const children = [h, p];

		const model: SectionsModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [
					{ name: 'body', match: 'any', greedy: true, optional: true },
				],
			},
		};

		const result = resolve(children, model);
		const sections = result.sections as any[];
		expect(sections).toHaveLength(1);
		expect(sections[0].$heading).toBe('Section');
		expect(sections[0].body).toEqual([p]);
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

// ---------------------------------------------------------------------------
// Inline helpers for itemModel tests
// ---------------------------------------------------------------------------

function textNode(content: string) {
	return node('text', { content });
}

function strong(text: string) {
	return node('strong', {}, [textNode(text)]);
}

function em(text: string) {
	return node('em', {}, [textNode(text)]);
}

function link(href: string, children: any[] = []) {
	return node('link', { href }, children);
}

function inlineCode(text: string) {
	return node('code', { content: text });
}

function listItem(children: any[]) {
	return node('item', {}, children);
}

// ---------------------------------------------------------------------------
// custom pattern
// ---------------------------------------------------------------------------

describe('custom pattern', () => {
	it('calls processChildren and returns result', () => {
		const p = paragraph('hello');
		const h = heading(1, 'title');
		const children = [p, h];

		const model: CustomModel = {
			type: 'custom',
			processChildren: (nodes, attrs) => {
				return nodes.map((n: any) => ({ ...n, custom: true, label: attrs.label }));
			},
			description: 'Test custom parser',
		};

		const result = resolve(children, model, { label: 'test' });
		expect(result.children).toHaveLength(2);
		expect((result.children as any[])[0].custom).toBe(true);
		expect((result.children as any[])[0].label).toBe('test');
	});

	it('works with empty children', () => {
		const model: CustomModel = {
			type: 'custom',
			processChildren: () => [],
			description: 'Empty custom parser',
		};

		const result = resolve([], model);
		expect(result.children).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// when conditional models
// ---------------------------------------------------------------------------

describe('conditional content models (when)', () => {
	it('branches on attribute value (in)', () => {
		const children = [heading(1, 'title'), paragraph('body')];

		const model: ConditionalContentModel = {
			when: [
				{
					condition: { attribute: 'kind', in: ['class', 'interface'] },
					model: {
						type: 'sequence',
						fields: [
							{ name: 'classTitle', match: 'heading' },
							{ name: 'classBody', match: 'paragraph', optional: true },
						],
					},
				},
			],
			default: {
				type: 'sequence',
				fields: [
					{ name: 'title', match: 'heading' },
					{ name: 'body', match: 'paragraph', optional: true },
				],
			},
		};

		// Matching condition
		const result1 = resolve(children, model, { kind: 'class' });
		expect(result1.classTitle).toBe(children[0]);
		expect(result1.classBody).toBe(children[1]);

		// Non-matching condition → default
		const result2 = resolve(children, model, { kind: 'function' });
		expect(result2.title).toBe(children[0]);
		expect(result2.body).toBe(children[1]);
	});

	it('branches on attribute exists', () => {
		const children = [heading(1, 'title')];

		const model: ConditionalContentModel = {
			when: [
				{
					condition: { attribute: 'icon', exists: true },
					model: {
						type: 'sequence',
						fields: [{ name: 'iconTitle', match: 'heading' }],
					},
				},
			],
			default: {
				type: 'sequence',
				fields: [{ name: 'title', match: 'heading' }],
			},
		};

		expect(resolve(children, model, { icon: 'star' }).iconTitle).toBe(children[0]);
		expect(resolve(children, model, {}).title).toBe(children[0]);
	});

	it('branches on hasChild condition', () => {
		const withH2 = [heading(2, 'Day 1'), heading(3, 'Stop')];
		const withoutH2 = [heading(3, 'Stop A'), heading(3, 'Stop B')];

		const model: ConditionalContentModel = {
			when: [
				{
					condition: { hasChild: 'heading:2' },
					model: {
						type: 'sections',
						sectionHeading: 'heading:2',
						sectionModel: {
							type: 'sequence',
							fields: [{ name: 'body', match: 'any', greedy: true, optional: true }],
						},
					},
				},
			],
			default: {
				type: 'sections',
				sectionHeading: 'heading:3',
				sectionModel: {
					type: 'sequence',
					fields: [{ name: 'body', match: 'any', greedy: true, optional: true }],
				},
			},
		};

		// With h2 → sections split at h2
		const result1 = resolve(withH2, model);
		const sections1 = result1.sections as any[];
		expect(sections1).toHaveLength(1);
		expect(sections1[0].$heading).toBe('Day 1');

		// Without h2 → sections split at h3
		const result2 = resolve(withoutH2, model);
		const sections2 = result2.sections as any[];
		expect(sections2).toHaveLength(2);
		expect(sections2[0].$heading).toBe('Stop A');
		expect(sections2[1].$heading).toBe('Stop B');
	});

	it('evaluates conditions in order, uses first match', () => {
		const children = [paragraph('text')];

		const model: ConditionalContentModel = {
			when: [
				{
					condition: { attribute: 'type', in: ['a'] },
					model: { type: 'sequence', fields: [{ name: 'typeA', match: 'paragraph' }] },
				},
				{
					condition: { attribute: 'type', in: ['a', 'b'] },
					model: { type: 'sequence', fields: [{ name: 'typeAB', match: 'paragraph' }] },
				},
			],
			default: { type: 'sequence', fields: [{ name: 'fallback', match: 'paragraph' }] },
		};

		// 'a' matches first condition
		const result = resolve(children, model, { type: 'a' });
		expect(result.typeA).toBe(children[0]);
		expect(result.typeAB).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
	it('evaluates attribute in condition', () => {
		expect(evaluateCondition(
			{ attribute: 'kind', in: ['class', 'interface'] },
			[], { kind: 'class' },
		)).toBe(true);
		expect(evaluateCondition(
			{ attribute: 'kind', in: ['class', 'interface'] },
			[], { kind: 'function' },
		)).toBe(false);
	});

	it('evaluates attribute exists condition', () => {
		expect(evaluateCondition(
			{ attribute: 'icon', exists: true },
			[], { icon: 'star' },
		)).toBe(true);
		expect(evaluateCondition(
			{ attribute: 'icon', exists: true },
			[], {},
		)).toBe(false);
		expect(evaluateCondition(
			{ attribute: 'icon', exists: true },
			[], { icon: '' },
		)).toBe(false);
	});

	it('evaluates hasChild condition', () => {
		expect(evaluateCondition(
			{ hasChild: 'heading:2' },
			[heading(2, 'test')], {},
		)).toBe(true);
		expect(evaluateCondition(
			{ hasChild: 'heading:2' },
			[heading(3, 'test')], {},
		)).toBe(false);
		expect(evaluateCondition(
			{ hasChild: 'heading:2' },
			[], {},
		)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// resolveListItems (itemModel)
// ---------------------------------------------------------------------------

describe('resolveListItems', () => {
	it('extracts bold and italic from list items', () => {
		const items = list(false, [
			listItem([strong('Sarah Chen'), textNode(' — '), em('VP Engineering')]),
			listItem([strong('John Doe'), textNode(' — '), em('CTO')]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'name', match: 'strong' },
				{ name: 'role', match: 'em', optional: true },
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('Sarah Chen');
		expect(result[0].role).toBe('VP Engineering');
		expect(result[1].name).toBe('John Doe');
		expect(result[1].role).toBe('CTO');
	});

	it('extracts link href with extract property', () => {
		const items = list(false, [
			listItem([
				link('/audio/track.mp3', [strong('Track Name')]),
			]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'name', match: 'strong' },
				{ name: 'src', match: 'link', extract: 'href', optional: true },
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result[0].name).toBe('Track Name');
		expect(result[0].src).toBe('/audio/track.mp3');
	});

	it('extracts text patterns with regex', () => {
		const items = list(false, [
			listItem([textNode('Brand identity: $8,000')]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'description', match: 'text', pattern: /^(.+?):\s*/ },
				{ name: 'amount', match: 'text', pattern: /\$([\d,.]+)/ },
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result[0].description).toBe('Brand identity');
		expect(result[0].amount).toBe('8,000');
	});

	it('handles remainder pattern', () => {
		const items = list(false, [
			listItem([textNode('a pinch of salt')]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'quantity', match: 'text', optional: true, pattern: /^([\d.]+)\s*/ },
				{ name: 'ingredient', match: 'text', pattern: 'remainder' },
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result[0].quantity).toBeUndefined();
		expect(result[0].ingredient).toBe('a pinch of salt');
	});

	it('extracts with regex and remainder together', () => {
		const items = list(false, [
			listItem([textNode('500g bread flour')]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'quantity', match: 'text', optional: true, pattern: /^([\d./]+)\s*/ },
				{ name: 'unit', match: 'text', optional: true, pattern: /^(g|kg|ml|cup|cups|tbsp|tsp)\s+/ },
				{ name: 'ingredient', match: 'text', pattern: 'remainder' },
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result[0].quantity).toBe('500');
		expect(result[0].unit).toBe('g');
		expect(result[0].ingredient).toBe('bread flour');
	});

	it('handles mixed inline and text patterns', () => {
		const items = list(false, [
			listItem([strong('Sarah Chen'), textNode(' — VP Engineering')]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'name', match: 'strong' },
				{ name: 'role', match: 'text', pattern: /—\s*(.+)$/, optional: true },
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result[0].name).toBe('Sarah Chen');
		expect(result[0].role).toBe('VP Engineering');
	});

	it('handles nested list with sub-itemModel', () => {
		const subList = list(false, [
			listItem([textNode('(1:30) Verse 1')]),
			listItem([textNode('(3:00) Chorus')]),
		]);
		const items = list(false, [
			listItem([strong('Track Name'), textNode(' (5:55)'), subList]),
		]);

		const itemModel: ItemModel = {
			fields: [
				{ name: 'name', match: 'strong' },
				{ name: 'duration', match: 'text', optional: true, pattern: /\((\d+:\d+)\)/ },
				{
					name: 'cuePoints',
					match: 'list',
					optional: true,
					itemModel: {
						fields: [
							{ name: 'time', match: 'text', optional: true, pattern: /\((\d+:\d+)\)/ },
							{ name: 'label', match: 'text', pattern: 'remainder' },
						],
					},
				},
			],
		};

		const result = resolveListItems(items, itemModel);
		expect(result[0].name).toBe('Track Name');
		expect(result[0].duration).toBe('5:55');
		expect(result[0].cuePoints).toHaveLength(2);
		expect((result[0].cuePoints as any[])[0].time).toBe('1:30');
		expect((result[0].cuePoints as any[])[0].label).toBe('Verse 1');
		expect((result[0].cuePoints as any[])[1].time).toBe('3:00');
		expect((result[0].cuePoints as any[])[1].label).toBe('Chorus');
	});

	it('handles empty list items', () => {
		const items = list(false, []);
		const itemModel: ItemModel = {
			fields: [{ name: 'name', match: 'strong' }],
		};

		const result = resolveListItems(items, itemModel);
		expect(result).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// resolveSequence with itemModel integration
// ---------------------------------------------------------------------------

describe('resolveSequence with itemModel', () => {
	it('produces itemData alongside the list node', () => {
		const items = list(false, [
			listItem([strong('Alice'), textNode(' — Manager')]),
			listItem([strong('Bob'), textNode(' — Engineer')]),
		]);

		const fields: ContentFieldDefinition[] = [
			{
				name: 'members',
				match: 'list',
				itemModel: {
					fields: [
						{ name: 'name', match: 'strong' },
						{ name: 'role', match: 'text', pattern: /—\s*(.+)$/, optional: true },
					],
				},
			},
		];

		const result = resolveSequence([items], fields);
		expect(result.members).toBe(items);
		expect(result.membersData).toHaveLength(2);
		expect((result.membersData as any[])[0].name).toBe('Alice');
		expect((result.membersData as any[])[0].role).toBe('Manager');
		expect((result.membersData as any[])[1].name).toBe('Bob');
		expect((result.membersData as any[])[1].role).toBe('Engineer');
	});
});
