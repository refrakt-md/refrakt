import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import {
	applySchemaTable,
	validateSchemaTable,
	selectRow,
	findByName,
	collectJsonLd,
	type SchemaTable,
} from '../src/index.js';

const { Tag } = Markdoc;

// SPEC-130 / WORK-565 — the schema table and its applier.
//
// These tests assert the JSON-LD, not just the HTML attributes: the whole point
// of the mechanism is what reaches a consumer, and `collectJsonLd` derives that
// by walking the tree. Asserting `property=` alone would pass on a graph that
// nests nothing.

/** A rune root as `createComponentRenderable` shapes one. */
function root(
	fields: Record<string, unknown>,
	children: unknown[] = [],
	attrs: Record<string, unknown> = {},
) {
	return new Tag(
		'article',
		{
			'data-rune': 'probe',
			...(Object.keys(fields).length > 0 ? { 'data-rune-fields': JSON.stringify(fields) } : {}),
			...attrs,
		},
		children as never,
	);
}

const named = (name: string, text: string) => new Tag('span', { 'data-name': name }, [text]);
const fielded = (name: string, text: string) => new Tag('span', { 'data-field': name }, [text]);

const graph = (node: unknown) => collectJsonLd(node as never);
const first = (node: unknown) => graph(node)[0] as Record<string, any>;

describe('name resolution is attribute-agnostic (WORK-565)', () => {
	// The criterion that keeps SPEC-133 independent of this milestone. Its sweep
	// moves ~97 nodes between `properties` and `refs`, which changes whether a
	// name surfaces as `data-field` or `data-name`. If the applier branched on
	// that, every one of those moves would break a table.
	const table: SchemaTable = { type: 'Review', properties: { quote: 'reviewBody' } };

	it('resolves a source carried as data-name', () => {
		const tree = applySchemaTable(root({}, [named('quote', 'Good stuff')]), table, {});
		expect(first(tree).reviewBody).toBe('Good stuff');
	});

	it('resolves the same source carried as data-field, with no edit to the table', () => {
		const tree = applySchemaTable(root({}, [fielded('quote', 'Good stuff')]), table, {});
		expect(first(tree).reviewBody).toBe('Good stuff');
	});

	it('produces the same graph either way', () => {
		const asName = first(applySchemaTable(root({}, [named('quote', 'X')]), table, {}));
		const asField = first(applySchemaTable(root({}, [fielded('quote', 'X')]), table, {}));
		expect(asField).toEqual(asName);
	});

	it('matches a kebab-cased carrier for a camelCase name', () => {
		// `createComponentRenderable` kebab-cases `data-field`; refs keep the key as
		// authored. A table keys on the name, so both spellings must resolve.
		expect(findByName(root({}, [fielded('end-date', '2025')]), 'endDate')).toBeDefined();
	});
});

describe('the three resolution strategies', () => {
	it('stamps a surviving node in place', () => {
		const node = named('quote', 'Stamped');
		applySchemaTable(root({}, [node]), { type: 'Review', properties: { quote: 'reviewBody' } }, {});
		expect(node.attributes.property).toBe('reviewBody');
	});

	it('rebuilds a value-only carrier from the field bag', () => {
		// The case that settled the mechanism's shape: once a rune stops declaring
		// `schema:`, `createComponentRenderable` classifies its property metas as
		// pure data and drops them. The bag is the recovery.
		const tree = applySchemaTable(
			root({ rating: 5 }),
			{ type: 'Review', properties: { rating: 'ratingValue' } },
			{},
		);
		expect(first(tree).ratingValue).toBe(5);
	});

	it('keeps a bag value’s type rather than stringifying it', () => {
		// `collectJsonLd` reads `content` straight through, so coercing here would
		// publish `"5"` where the hand-built span published `5`.
		const tree = applySchemaTable(
			root({ rating: 5 }),
			{ type: 'Review', properties: { rating: 'ratingValue' } },
			{},
		);
		expect(typeof first(tree).ratingValue).toBe('number');
	});

	it('synthesises a nested entity from either source', () => {
		const tree = applySchemaTable(
			root({ rating: 4 }, [named('author-name', 'Sarah Chen')]),
			{
				type: 'Review',
				entities: {
					author: { type: 'Person', property: 'author', properties: { 'author-name': 'name' } },
					rating: {
						type: 'Rating',
						property: 'reviewRating',
						properties: { rating: 'ratingValue' },
					},
				},
			},
			{},
		);
		const review = first(tree);
		expect(review.author).toEqual({ '@type': 'Person', name: 'Sarah Chen' });
		expect(review.reviewRating).toEqual({ '@type': 'Rating', ratingValue: 4 });
	});

	it('emits no entity when it would resolve to a bare @type (D4)', () => {
		// Seven runes in the catalog assert a type and describe nothing. The table
		// makes that a decision rather than an accident.
		const tree = applySchemaTable(
			root({}),
			{
				type: 'Review',
				entities: {
					author: { type: 'Person', property: 'author', properties: { 'author-name': 'name' } },
				},
			},
			{},
		);
		expect(first(tree).author).toBeUndefined();
	});

	it('leaves the rendered HTML alone when synthesising', () => {
		// The entity takes a *copy* of a surviving node's value. Relocating the node
		// would change the page, which this mechanism must never do.
		const node = named('author-name', 'Sarah Chen');
		const tree = applySchemaTable(
			root({}, [node]),
			{
				type: 'Review',
				entities: {
					author: { type: 'Person', property: 'author', properties: { 'author-name': 'name' } },
				},
			},
			{},
		);
		expect(JSON.stringify(tree)).toContain('Sarah Chen');
		expect(node.children).toEqual(['Sarah Chen']);
	});
});

describe('text: emits the RDFa-conformant wrapper', () => {
	it('wraps a node’s own content so its text is readable as a literal', () => {
		// RDFa Core 1.1 §7.5 step 11 — an element carrying both `property` and
		// `typeof` has its object fixed to the typed resource, so its text is
		// unreachable. Since SPEC-082 renders the SEO carriers inline, refrakt
		// publishes RDFa *and* JSON-LD on one page; dropping the wrapper would have
		// the two channels assert different graphs.
		const body = named('answer', '');
		body.children = ['A content framework.'] as never;
		const tree = applySchemaTable(
			root({}, [body]),
			{ type: 'Question', text: { answer: 'text' } },
			{},
		);
		expect(first(tree).text).toBe('A content framework.');
		// The wrapper is the applier's, not the rune's.
		expect((body.children[0] as any).attributes.property).toBe('text');
	});
});

describe('by: selects a row from an attribute', () => {
	const table: SchemaTable = {
		by: 'type',
		rows: {
			podcast: { type: 'PodcastSeries' },
			album: { type: 'MusicAlbum' },
		},
		fallback: { type: 'MusicPlaylist' },
	};

	it('picks the row the attribute names', () => {
		expect(selectRow(table, { type: 'podcast' }).type).toBe('PodcastSeries');
	});

	it('falls back when the attribute is absent', () => {
		expect(selectRow(table, {}).type).toBe('MusicPlaylist');
	});

	it('falls back when the value matches no row', () => {
		expect(selectRow(table, { type: 'mixtape' }).type).toBe('MusicPlaylist');
	});

	it('applies the selected row’s type to the output', () => {
		const tree = applySchemaTable(root({}, [named('x', 'y')]), table, { type: 'podcast' });
		expect((tree as any).attributes.typeof).toBe('PodcastSeries');
	});
});

describe('validateSchemaTable', () => {
	it('rejects a child entity declared without the property that holds it', () => {
		// `collectJsonLd` nests a typed node only when it also carries `property`,
		// so this would publish a detached top-level entity related to nothing.
		const issues = validateSchemaTable({
			type: 'Review',
			entities: { author: { type: 'Person' } as never },
		});
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toMatch(/detached top-level entity/);
	});

	it('rejects a child entity with no type', () => {
		const issues = validateSchemaTable({
			type: 'Review',
			entities: { author: { property: 'author' } as never },
		});
		expect(issues.some((i) => /needs a `type`/.test(i.message))).toBe(true);
	});

	it('rejects `by` naming an attribute the rune does not declare', () => {
		// `by` names an attribute, not a modifier — `modifiers` is read by the
		// engine, which has no part in this path. Validated so the ambiguity
		// cannot ship silently.
		const issues = validateSchemaTable(
			{ by: 'kind', rows: { a: { type: 'A' } }, fallback: { type: 'B' } },
			['type', 'artist'],
		);
		expect(issues.some((i) => /names an attribute the rune does not declare/.test(i.message))).toBe(
			true,
		);
	});

	it('accepts `by` naming a declared attribute', () => {
		const issues = validateSchemaTable(
			{ by: 'type', rows: { a: { type: 'A' } }, fallback: { type: 'B' } },
			['type'],
		);
		expect(issues).toEqual([]);
	});

	it('requires an explicit fallback row', () => {
		const issues = validateSchemaTable({ by: 'type', rows: { a: { type: 'A' } } }, ['type']);
		expect(issues.some((i) => /explicit `fallback`/.test(i.message))).toBe(true);
	});

	it('passes a well-formed table', () => {
		expect(
			validateSchemaTable({
				type: 'Review',
				properties: { quote: 'reviewBody' },
				entities: {
					author: { type: 'Person', property: 'author', properties: { 'author-name': 'name' } },
				},
			}),
		).toEqual([]);
	});
});

describe('declared lists always serialise as arrays (D6)', () => {
	// `appendToProperty` stores the first value as a scalar and only promotes on
	// the second, so the *shape* of the output varied with the amount of content
	// and every consumer had to handle both.
	const table: SchemaTable = {
		type: 'MusicPlaylist',
		lists: ['track'],
		children: { item: { type: 'MusicRecording', property: 'track' } },
	};

	const item = (name: string) =>
		new Tag('li', { 'data-rune': 'item' }, [new Tag('meta', { 'data-name': 'n' }, [])] as never);

	it('emits an array for a one-item collection', () => {
		const tree = applySchemaTable(root({}, [item('one')]), table, {});
		expect(Array.isArray(first(tree).track)).toBe(true);
		expect(first(tree).track).toHaveLength(1);
	});

	it('emits an array for a two-item collection', () => {
		const tree = applySchemaTable(root({}, [item('one'), item('two')]), table, {});
		expect(Array.isArray(first(tree).track)).toBe(true);
		expect(first(tree).track).toHaveLength(2);
	});

	it('says nothing rather than asserting an empty collection', () => {
		// `[]` is the claim "this has no tracks", which is not the same as making
		// no claim.
		const tree = applySchemaTable(root({}), table, {});
		expect(first(tree).track).toBeUndefined();
	});
});

describe('children are retyped by the parent (D9)', () => {
	it('retypes each child and stamps the property that nests it', () => {
		const child = new Tag('li', { 'data-rune': 'item', typeof: 'MusicRecording' }, [
			new Tag('span', { 'data-name': 'n' }, ['Episode One']),
		] as never);
		const tree = applySchemaTable(
			root({}, [child]),
			{
				type: 'PodcastSeries',
				children: {
					item: { type: 'PodcastEpisode', property: 'hasPart', properties: { n: 'name' } },
				},
			},
			{},
		);
		const series = first(tree);
		expect(series.hasPart).toEqual({ '@type': 'PodcastEpisode', name: 'Episode One' });
		// Nothing floats: a typed node the parent did not stamp becomes its own
		// top-level entity.
		expect(graph(tree)).toHaveLength(1);
	});

	it('generates a position that exists nowhere in the content', () => {
		const items = [0, 1].map(
			() =>
				new Tag('li', { 'data-rune': 'item' }, [
					new Tag('span', { 'data-name': 'n' }, ['x']),
				] as never),
		);
		const tree = applySchemaTable(
			root({}, items),
			{
				type: 'BreadcrumbList',
				lists: ['itemListElement'],
				children: {
					item: {
						type: 'ListItem',
						property: 'itemListElement',
						properties: { n: 'name' },
						generated: { position: 'index' },
					},
				},
			},
			{},
		);
		expect(first(tree).itemListElement.map((i: any) => i.position)).toEqual(['1', '2']);
	});
});

describe('schema="none"', () => {
	it('emits no schema at all', () => {
		const tree = applySchemaTable(
			root({}, [named('quote', 'Good stuff')]),
			{ type: 'Review', properties: { quote: 'reviewBody' } },
			{ schema: 'none' },
		);
		expect((tree as any).attributes.typeof).toBeUndefined();
		expect(graph(tree)).toEqual([]);
	});
});
