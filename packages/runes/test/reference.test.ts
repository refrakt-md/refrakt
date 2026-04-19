import { describe, it, expect } from 'vitest';
import {
	renderContentModel,
	serializeContentModel,
	describeRune,
	type RuneInfo,
	type SerializedContentModel,
} from '../src/reference.js';
import {
	registerAttributePreset,
	lookupAttributePreset,
	schemaBasePresets,
} from '../src/attribute-presets.js';
import { createContentModelSchema } from '../src/lib/index.js';
import type { SchemaAttribute } from '@markdoc/markdoc';
import type { ContentModel } from '@refrakt-md/types';

// -----------------------------------------------------------------------------
// Snapshot coverage: one rune per content-model pattern
// -----------------------------------------------------------------------------

describe('renderContentModel — sequence', () => {
	it('renders numbered fields with match and optionality (palette shape)', () => {
		const paletteModel: SerializedContentModel = {
			type: 'sequence',
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		};
		expect(renderContentModel(paletteModel)).toMatchInlineSnapshot(`
			"Content:
			  - \`body\` (optional, repeatable any block)"
		`);
	});

	it('renders a multi-field sequence with a mix of required and optional fields', () => {
		const model: SerializedContentModel = {
			type: 'sequence',
			fields: [
				{ name: 'title', match: 'heading', optional: false },
				{ name: 'summary', match: 'paragraph', optional: true },
				{ name: 'actions', match: 'list|fence', optional: true, greedy: true },
			],
		};
		expect(renderContentModel(model)).toMatchInlineSnapshot(`
			"Content:
			  - \`title\` (required heading)
			  - \`summary\` (optional paragraph)
			  - \`actions\` (optional, repeatable list or fence)"
		`);
	});
});

describe('renderContentModel — sections', () => {
	it('renders preamble fields, section body shape, and emitTag (character shape)', () => {
		const characterModel: SerializedContentModel = {
			type: 'sections',
			sectionHeading: 'heading',
			emitTag: 'character-section',
			fields: [
				{ name: 'portrait', match: 'image', optional: true },
				{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
				{ name: 'items', match: 'tag', optional: true, greedy: true },
			],
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
		};
		expect(renderContentModel(characterModel)).toMatchInlineSnapshot(`
			"Content is split into sections by heading elements. Each section becomes one named block.
			Preamble (before first section):
			  - \`portrait\` (optional image)
			  - \`header\` (optional, repeatable heading or paragraph)
			  - \`items\` (optional, repeatable tag)
			Section body: any blocks"
		`);
	});

	it('surfaces headingExtract fields with pattern vs remainder', () => {
		const itineraryModel: SerializedContentModel = {
			type: 'sections',
			sectionHeading: 'heading',
			emitTag: 'itinerary-stop',
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
			headingExtract: {
				fields: [
					{ name: 'time', pattern: '^(.+?)\\s*[-–—]\\s*' },
					{ name: 'location', pattern: 'remainder' },
				],
			},
		};
		const out = renderContentModel(itineraryModel);
		expect(out).toContain('Heading parsing: each section heading is parsed into `time` (pattern `^(.+?)\\s*[-–—]\\s*`) and `location` (remaining text).');
	});

	it('lists knownSections with aliases', () => {
		const model: SerializedContentModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
			knownSections: {
				abilities: { hasModel: false },
				relationships: { alias: ['connections', 'bonds'], hasModel: false },
			},
		};
		const out = renderContentModel(model);
		expect(out).toContain('Known sections: `abilities`, `relationships` (aliases: connections, bonds).');
	});
});

describe('renderContentModel — delimited', () => {
	it('renders named zones with nested fields (hero shape)', () => {
		const heroModel: SerializedContentModel = {
			type: 'delimited',
			delimiter: 'hr',
			zones: [
				{
					name: 'content',
					type: 'sequence',
					fields: [
						{ name: 'eyebrow', match: 'paragraph', optional: true },
						{ name: 'headline', match: 'heading', optional: false },
						{ name: 'blurb', match: 'paragraph', optional: true },
						{ name: 'actions', match: 'list|fence', optional: true, greedy: true },
					],
				},
				{
					name: 'media',
					type: 'sequence',
					fields: [{ name: 'media', match: 'any', optional: true, greedy: true }],
				},
			],
		};
		expect(renderContentModel(heroModel)).toMatchInlineSnapshot(`
			"Content is split by \`---\` into zones.
			Zone "content":
			  - \`eyebrow\` (optional paragraph)
			  - \`headline\` (required heading)
			  - \`blurb\` (optional paragraph)
			  - \`actions\` (optional, repeatable list or fence)
			Zone "media":
			  - \`media\` (optional, repeatable any block)"
		`);
	});

	it('renders dynamic zones with their shared zoneModel', () => {
		const model: SerializedContentModel = {
			type: 'delimited',
			delimiter: 'hr',
			dynamicZones: true,
			zoneModel: {
				type: 'sequence',
				fields: [
					{ name: 'title', match: 'heading', optional: false },
					{ name: 'body', match: 'any', optional: true, greedy: true },
				],
			},
		};
		const out = renderContentModel(model);
		expect(out).toContain('Each zone between delimiters contains:');
		expect(out).toContain('`title` (required heading)');
		expect(out).toContain('`body` (optional, repeatable any block)');
	});
});

describe('renderContentModel — custom', () => {
	it('renders the description verbatim under Content structure (tabs shape)', () => {
		const tabsModel: SerializedContentModel = {
			type: 'custom',
			description: 'Converts headings at the specified level to tab tags, extracting tab name and optional image from heading content.',
		};
		expect(renderContentModel(tabsModel)).toMatchInlineSnapshot(`
			"Content structure:
			Converts headings at the specified level to tab tags, extracting tab name and optional image from heading content."
		`);
	});
});

describe('renderContentModel — stability', () => {
	it('produces byte-identical output on repeated calls', () => {
		const model: SerializedContentModel = {
			type: 'delimited',
			delimiter: 'hr',
			zones: [
				{ name: 'content', type: 'sequence', fields: [{ name: 'headline', match: 'heading' }] },
				{ name: 'media', type: 'sequence', fields: [{ name: 'media', match: 'any', greedy: true }] },
			],
		};
		const first = renderContentModel(model);
		const second = renderContentModel(model);
		expect(first).toBe(second);
	});
});

// -----------------------------------------------------------------------------
// serializeContentModel: headingExtract round-trip
// -----------------------------------------------------------------------------

describe('serializeContentModel', () => {
	it('preserves headingExtract fields as regex source or "remainder"', () => {
		const model: ContentModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
			},
			headingExtract: {
				fields: [
					{ name: 'time', match: 'text', pattern: /^(.+?)\s*[-–—]\s*/ },
					{ name: 'location', match: 'text', pattern: 'remainder' },
				],
			},
		};
		const serialized = serializeContentModel(model);
		expect(serialized).toMatchObject({
			type: 'sections',
			headingExtract: {
				fields: [
					{ name: 'time', pattern: '^(.+?)\\s*[-–—]\\s*' },
					{ name: 'location', pattern: 'remainder' },
				],
			},
		});
	});

	it('preserves knownSections with hasModel flag', () => {
		const model: ContentModel = {
			type: 'sections',
			sectionHeading: 'heading',
			sectionModel: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', greedy: true }],
			},
			knownSections: {
				steps: { alias: ['instructions'], model: { type: 'sequence', fields: [] } },
				notes: {},
			},
		};
		const serialized = serializeContentModel(model) as any;
		expect(serialized.knownSections).toEqual({
			steps: { alias: ['instructions'], hasModel: true },
			notes: { alias: undefined, hasModel: false },
		});
	});

	it('unwraps conditional models to their default branch', () => {
		const model: ContentModel = {
			when: [
				{
					condition: { attribute: 'layout', in: ['split'] },
					model: {
						type: 'delimited',
						delimiter: 'hr',
						zones: [{ name: 'left', type: 'sequence', fields: [] }],
					},
				},
			],
			default: {
				type: 'sequence',
				fields: [{ name: 'body', match: 'any', greedy: true }],
			},
		};
		const serialized = serializeContentModel(model);
		expect(serialized?.type).toBe('sequence');
	});
});

// -----------------------------------------------------------------------------
// describeRune integration
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Attribute preset registry + describeRune tier classification
// -----------------------------------------------------------------------------

describe('attribute preset registry', () => {
	it('registers and looks up preset metadata by record reference', () => {
		const record: Record<string, SchemaAttribute> = {
			flavor: { type: String, required: false },
		};
		registerAttributePreset(record, { name: 'test preset', description: 'A preset for testing.' });
		expect(lookupAttributePreset(record)).toEqual({ name: 'test preset', description: 'A preset for testing.' });
	});

	it('populates schemaBasePresets when a schema is built with base:', () => {
		const preset: Record<string, SchemaAttribute> = {
			shared: { type: String, required: false },
		};
		const schema = createContentModelSchema({
			base: preset,
			attributes: { own: { type: String, required: false } },
			contentModel: { type: 'sequence', fields: [] },
			transform: () => 'x',
		});
		expect(schemaBasePresets.get(schema)).toBe(preset);
	});
});

describe('describeRune — attribute tiers', () => {
	it('separates own, preset-inherited, and universal attributes', () => {
		const rune: RuneInfo = {
			name: 'hero',
			aliases: [],
			description: 'Page intro.',
			schema: {
				attributes: {
					align: { type: String, required: false, matches: ['left', 'right'] },
					layout: { type: String, required: false, matches: ['stacked', 'split'] },
					ratio: { type: String, required: false },
					tint: { type: String, required: false },
					bg: { type: String, required: false },
					width: { type: String, required: false },
				},
			},
			basePreset: {
				name: 'split layout',
				description: 'Layout controls for runes that can render stacked or split.',
				attributes: ['layout', 'ratio', 'valign', 'gap', 'collapse'],
			},
		};
		const out = describeRune(rune);
		expect(out).toContain('Attributes:\n  - align: "left" | "right" (optional)');
		expect(out).toContain('Inherited from the `split layout` preset — Layout controls for runes that can render stacked or split.');
		expect(out).toContain('  - layout: "stacked" | "split" (optional)');
		expect(out).toContain('  - ratio: string (optional)');
		expect(out).toContain('Universal attributes (available on every rune): tint, tint-mode, bg, width, spacing, inset.');
		// Universal attrs should not be listed under Attributes:
		expect(out).not.toMatch(/Attributes:[\s\S]*- tint:/);
	});

	it('omits the preset section when no preset-inherited attributes are present', () => {
		const rune: RuneInfo = {
			name: 'simple',
			aliases: [],
			description: 'x',
			schema: { attributes: { name: { type: String, required: true } } },
		};
		const out = describeRune(rune);
		expect(out).toContain('Attributes:\n  - name: string (required)');
		expect(out).not.toContain('Inherited from');
		expect(out).not.toContain('Universal attributes');
	});
});

describe('describeRune', () => {
	it('renders the content-model when rune.contentModel is present', () => {
		const rune: RuneInfo = {
			name: 'hero',
			aliases: [],
			description: 'Page intro with headline, blurb, and call-to-action.',
			schema: { attributes: {} },
			contentModel: {
				type: 'delimited',
				delimiter: 'hr',
				zones: [
					{ name: 'content', type: 'sequence', fields: [{ name: 'headline', match: 'heading' }] },
					{ name: 'media', type: 'sequence', fields: [{ name: 'media', match: 'any', greedy: true }] },
				],
			},
		};
		const out = describeRune(rune);
		expect(out).toContain('Content is split by `---` into zones.');
	});
});
