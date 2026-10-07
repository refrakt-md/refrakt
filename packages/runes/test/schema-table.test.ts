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
import { OWNER_ATTR, releaseOwnedNodes } from '../src/lib/schema-table.js';
import { breadcrumbSchema } from '../src/tags/breadcrumb.js';
import { createContentModelSchema } from '../src/lib/index.js';

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
		const table: SchemaTable = {
			type: 'Review',
			properties: { quote: 'reviewBody' },
			entities: {
				author: { type: 'Person', property: 'author', properties: { 'author-name': 'name' } },
			},
		};

		// The `Person` has no name to give, so it is not nested — but the review
		// still has its own quote, so the review itself stands.
		const withQuote = applySchemaTable(root({}, [named('quote', 'Good stuff')]), table, {});
		expect(first(withQuote)).toEqual({
			'@context': 'https://schema.org',
			'@type': 'Review',
			reviewBody: 'Good stuff',
		});

		// With nothing at all to say, the review goes too — WORK-567 made this the
		// collector's rule rather than each rune's discipline.
		expect(graph(applySchemaTable(root({}), table, {}))).toEqual([]);
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
		properties: { heading: 'name' },
		lists: ['track'],
		children: { item: { type: 'MusicRecording', property: 'track', properties: { n: 'name' } } },
	};

	// Each item needs a property of its own: since WORK-567 a bare
	// `MusicRecording` is dropped before it can be nested, so a placeholder child
	// would leave nothing to promote and the test would measure D4 instead of D6.
	const item = (name: string) =>
		new Tag('li', { 'data-rune': 'item' }, [named('n', name)] as never);
	const playlist = (...items: unknown[]) => root({}, [named('heading', 'Mixtape'), ...items]);

	it('emits an array for a one-item collection', () => {
		const tree = applySchemaTable(playlist(item('one')), table, {});
		expect(Array.isArray(first(tree).track)).toBe(true);
		expect(first(tree).track).toHaveLength(1);
	});

	it('emits an array for a two-item collection', () => {
		const tree = applySchemaTable(playlist(item('one'), item('two')), table, {});
		expect(Array.isArray(first(tree).track)).toBe(true);
		expect(first(tree).track).toHaveLength(2);
	});

	it('says nothing rather than asserting an empty collection', () => {
		// `[]` is the claim "this has no tracks", which is not the same as making
		// no claim. The playlist keeps its name, so it is the `track` key alone
		// that is absent rather than the whole entity.
		const tree = applySchemaTable(playlist(), table, {});
		expect(first(tree).name).toBe('Mixtape');
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

// SPEC-146 Problem 1 / WORK-609 — a `children` key that is also a rune name
// (`track`, `step`, `tier`, `breadcrumb-item`) used to match that rune anywhere
// below the parent, including inside a rune the *author* nested. These were
// written against the pre-fix resolver first, and failed on every assertion
// about the author's node.
describe('a child key naming a rune matches only the parent’s own children', () => {
	/** `playlist`'s music row: the child row carries its own `properties`. */
	const playlistTable: SchemaTable = {
		type: 'MusicAlbum',
		lists: ['track'],
		children: {
			track: {
				type: 'MusicRecording',
				property: 'track',
				properties: { 'track-name': 'name', 'track-artist': 'byArtist' },
			},
		},
	};

	const track = (name: string, artist: string) =>
		new Tag('li', { 'data-rune': 'track', typeof: 'MusicRecording' }, [
			new Tag('span', { 'data-name': 'track-name' }, [name]),
			new Tag('span', { 'data-name': 'track-artist' }, [artist]),
		] as never);

	/** A playlist with one own track and one an author put inside a `hint`. */
	const playlistWithForeignTrack = () => {
		const own = track('Own Song', 'Own Artist');
		const authors = track('Unrelated', 'Someone Else');
		// Its own table has already run — Markdoc transforms bottom-up.
		authors.children.forEach((c: any, i: number) => {
			c.attributes.property = ['name', 'byArtist'][i];
		});
		const hint = new Tag('section', { 'data-rune': 'hint' }, [
			new Tag('div', { 'data-name': 'body' }, [authors]),
		] as never);
		const tree = new Tag('section', { 'data-rune': 'playlist' }, [
			new Tag('ol', { 'data-name': 'tracks' }, [own]),
			new Tag('div', { 'data-name': 'body' }, [hint]),
		] as never);
		return { tree: applySchemaTable(tree, playlistTable, {}), own, authors };
	};

	it('does not stamp an author-nested rune as one of the parent’s children', () => {
		const { authors } = playlistWithForeignTrack();
		// Before the fix: `typeof` stayed `MusicRecording` but `property` was
		// `track` — the parent claimed it.
		expect(authors.attributes.property).toBeUndefined();
		expect(authors.attributes.typeof).toBe('MusicRecording');
	});

	it('publishes exactly one track in the graph, not two', () => {
		const { tree } = playlistWithForeignTrack();
		const [album, ...rest] = graph(tree) as Record<string, any>[];
		expect(album['@type']).toBe('MusicAlbum');
		// D6 keeps a declared list an array at any length.
		expect(album.track).toEqual([
			{ '@type': 'MusicRecording', name: 'Own Song', byArtist: 'Own Artist' },
		]);
		// The author's track is its own entity, as it would be anywhere else.
		expect(rest).toHaveLength(1);
		expect(rest[0]).toMatchObject({ '@type': 'MusicRecording', byArtist: 'Someone Else' });
	});

	it('leaves the author’s rune its own property map', () => {
		// The second-order effect: retyping an over-matched child ran
		// `clearProperties` on the author's node first, stripping what its own
		// table had stamped wherever the parent's row maps it differently.
		const authors = track('Unrelated', 'Someone Else');
		const artist = authors.children[1] as InstanceType<typeof Tag>;
		artist.attributes.property = 'creator';
		applySchemaTable(
			new Tag('section', { 'data-rune': 'playlist' }, [
				new Tag('section', { 'data-rune': 'hint' }, [authors]),
			] as never),
			playlistTable,
			{},
		);
		expect(artist.attributes.property).toBe('creator');
	});

	it('covers breadcrumb’s `breadcrumb-item` row the same way', () => {
		const item = (name: string, url: string) =>
			new Tag('li', { 'data-rune': 'breadcrumb-item' }, [
				new Tag('a', { 'data-name': 'url', href: url, 'data-field': 'url' }, [
					new Tag('span', { 'data-name': 'name' }, [name]),
				]),
			] as never);
		const foreign = item('Elsewhere', '/elsewhere');
		const tree = applySchemaTable(
			new Tag('nav', { 'data-rune': 'breadcrumb' }, [
				new Tag('ol', { 'data-name': 'items' }, [item('Home', '/'), item('Docs', '/docs')]),
				new Tag('aside', { 'data-rune': 'hint' }, [foreign]),
			] as never),
			breadcrumbSchema,
			{},
		);
		expect(foreign.attributes.property).toBeUndefined();
		const trail = first(tree);
		expect(trail.itemListElement.map((i: any) => i.name)).toEqual(['Home', 'Docs']);
		expect(trail.itemListElement.map((i: any) => i.position)).toEqual(['1', '2']);
	});

	it('still matches a child the parent placed itself, by name or by rune', () => {
		// `playlist` builds some tracks from list items and receives others as
		// `{% track %}` tags; both are its own and take one row.
		const listed = new Tag('li', { 'data-name': 'track' }, [
			new Tag('span', { 'data-name': 'track-name' }, ['Listed']),
		] as never);
		const tagged = track('Tagged', 'Artist');
		const tree = applySchemaTable(
			new Tag('section', { 'data-rune': 'playlist' }, [
				new Tag('ol', { 'data-name': 'tracks' }, [listed, tagged]),
			] as never),
			playlistTable,
			{},
		);
		expect(first(tree).track.map((t: any) => t.name)).toEqual(['Listed', 'Tagged']);
	});

	it('rejects a match marked for another rune, even among its own nodes', () => {
		const theirs = track('Placed for someone else', 'X');
		theirs.attributes[OWNER_ATTR] = 'mixtape';
		const tree = applySchemaTable(
			new Tag('section', { 'data-rune': 'playlist' }, [theirs] as never),
			playlistTable,
			{},
		);
		expect(theirs.attributes.property).toBeUndefined();
		expect(graph(tree).some((e: any) => e.track !== undefined)).toBe(false);
	});

	it('admits a match past a boundary when it is marked for this rune', () => {
		// Nothing sets the marker yet — SPEC-145's composition will. This is the
		// one way past a boundary, and the reason the marker exists.
		const placed = track('Placed for me', 'Y');
		placed.attributes[OWNER_ATTR] = 'playlist';
		const tree = applySchemaTable(
			new Tag('section', { 'data-rune': 'playlist' }, [
				new Tag('div', { 'data-rune': 'card' }, [placed]),
			] as never),
			playlistTable,
			{},
		);
		expect(first(tree).track).toEqual([
			{ '@type': 'MusicRecording', name: 'Placed for me', byArtist: 'Y' },
		]);
	});
});

describe('the ownership marker is bookkeeping, not output (SPEC-146 D4)', () => {
	it('is stripped from the nodes the finishing rune owns', () => {
		const mine = new Tag('img', { [OWNER_ATTR]: 'character' });
		const theirs = new Tag('img', { [OWNER_ATTR]: 'faction' });
		const tree = new Tag('article', { 'data-rune': 'character' }, [
			new Tag('div', { 'data-rune': 'card' }, [mine, theirs]),
		] as never);
		releaseOwnedNodes(tree);
		expect(mine.attributes[OWNER_ATTR]).toBeUndefined();
		// Another rune's mark is left for that rune, which may still run.
		expect(theirs.attributes[OWNER_ATTR]).toBe('faction');
	});

	it('never leaves a rune’s transform, table or no table', () => {
		// The strip is in the schema wrapper, not the table applier, so a rune
		// with no schema row cannot leak a mark into the HTML either.
		const placed = new Tag('img', { [OWNER_ATTR]: 'probe-rune', src: 'v.jpg' });
		const schema = createContentModelSchema({
			attributes: {},
			contentModel: { type: 'sequence', fields: [] },
			transform: () =>
				new Tag('article', { 'data-rune': 'probe-rune' }, [
					new Tag('div', { 'data-rune': 'card' }, [placed]),
				] as never),
		});
		const ast = Markdoc.parse('{% probe-rune %}{% /probe-rune %}');
		Markdoc.transform(ast, { tags: { 'probe-rune': schema } } as never);
		expect(placed.attributes[OWNER_ATTR]).toBeUndefined();
		expect(placed.attributes.src).toBe('v.jpg');
	});
});

describe('findAllByName resolves owner-marked nodes past a boundary (SPEC-146 Problem 2, WORK-610)', () => {
	// Node-sourced values — `properties` from a node, `text`, the node half of
	// `entities` — are the ones nesting can hide. The marker is set by hand here,
	// as nothing sets it in production yet (SPEC-145 will).
	const mine = <T extends InstanceType<typeof Tag>>(node: T): T => {
		node.attributes[OWNER_ATTR] = 'probe';
		return node;
	};
	const card = (...children: unknown[]) =>
		new Tag('div', { 'data-rune': 'card' }, children as never);

	const table: SchemaTable = {
		type: 'Product',
		properties: { name: 'name', sku: 'sku' },
	};

	it('resolves both sources on a declared tree', () => {
		const tree = applySchemaTable(root({ sku: 'A1' }, [named('name', 'Widget')]), table, {});
		expect(first(tree)).toMatchObject({ name: 'Widget', sku: 'A1' });
	});

	it('resolves both sources on a composed tree, the node-sourced one only via the marker', () => {
		// Fails before WORK-610: `name` sits inside `card` and the walk stopped
		// there, so only the attribute-sourced `sku` published.
		const tree = applySchemaTable(
			root({ sku: 'A1' }, [card(mine(named('name', 'Widget')))]),
			table,
			{},
		);
		expect(first(tree)).toMatchObject({ name: 'Widget', sku: 'A1' });
	});

	it('publishes a composed entity whose values are all attributes', () => {
		// The narrower scope of Problem 2: the field bag is untouched by nesting,
		// so this held before WORK-610 and must keep holding.
		const attrsOnly: SchemaTable = { type: 'Product', properties: { sku: 'sku', brand: 'brand' } };
		const tree = applySchemaTable(
			root({ sku: 'A1', brand: 'Acme' }, [card(named('caption', 'Inside a card'))]),
			attrsOnly,
			{},
		);
		expect(first(tree)).toMatchObject({ '@type': 'Product', sku: 'A1', brand: 'Acme' });
	});

	it('keeps every member of a set past the boundary', () => {
		// `recipe`'s shape (SPEC-154): each ingredient `<li>` wears the same name.
		const ingredients: SchemaTable = {
			type: 'Recipe',
			properties: { ingredient: 'recipeIngredient' },
		};
		const li = (text: string) => new Tag('li', { 'data-name': 'ingredient' }, [text]);
		const tree = applySchemaTable(
			root({}, [li('Flour'), card(mine(li('Sugar')), mine(li('Eggs')))]),
			ingredients,
			{},
		);
		expect(first(tree).recipeIngredient).toEqual(['Flour', 'Sugar', 'Eggs']);
	});

	it('resolves a `text` source past the boundary', () => {
		const textTable: SchemaTable = { type: 'Article', text: { body: 'articleBody' } };
		const tree = applySchemaTable(root({}, [card(mine(named('body', 'Hello')))]), textTable, {});
		expect(first(tree).articleBody).toBe('Hello');
	});

	it('resolves the node half of an entity past the boundary', () => {
		const entityTable: SchemaTable = {
			type: 'Product',
			entities: {
				brand: { type: 'Brand', property: 'brand', properties: { maker: 'name' } },
			},
		};
		const tree = applySchemaTable(root({}, [card(mine(named('maker', 'Acme')))]), entityTable, {});
		expect(first(tree).brand).toEqual({ '@type': 'Brand', name: 'Acme' });
	});

	it('ignores an unmarked node past the boundary, and one marked for another rune', () => {
		const theirs = named('name', 'Theirs');
		theirs.attributes[OWNER_ATTR] = 'card';
		const tree = applySchemaTable(
			root({}, [named('name', 'Mine'), card(named('name', 'Unmarked'), theirs)]),
			{ type: 'Thing', properties: { name: 'name' } },
			{},
		);
		expect(first(tree).name).toBe('Mine');
	});

	it('keeps the character / character-section collision suppressed', () => {
		// The history the boundary guard was added for: `character` names its title
		// span `name`, and so does every `character-section` inside it. Reaching
		// into the sections published a character named after every heading.
		const section = (heading: string) =>
			new Tag('section', { 'data-rune': 'character-section' }, [named('name', heading)] as never);
		const tree = applySchemaTable(
			new Tag('article', { 'data-rune': 'character' }, [
				named('name', 'Aria'),
				section('Backstory'),
				section('Abilities'),
			] as never),
			{ type: 'Person', properties: { name: 'name' } },
			{},
		);
		expect(first(tree).name).toBe('Aria');
	});

	it('answers the CLI audit as before on a released tree', () => {
		// `packages/cli/src/lib/schema-row.ts` calls `findByName` on a rendered rune
		// tree, where `releaseOwnedNodes` has already stripped every mark — so a
		// nested rune's names stay out of reach, exactly as before WORK-610.
		const tree = root({}, [named('caption', 'Own'), card(named('name', 'Nested'))]);
		expect(findByName(tree, 'caption')).toBeDefined();
		expect(findByName(tree, 'name')).toBeUndefined();
	});
});
