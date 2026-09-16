import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { describeSchemaRow, bySchemaProperty } from '@refrakt-md/runes';
import type { ResolvedSchemaRow, SchemaTable } from '@refrakt-md/runes';
import { auditSchemaSources } from '../src/lib/schema-row.js';

const { Tag } = Markdoc;

// WORK-566 — the review surface D5 substitutes for validation.
//
// SPEC-130 D5 dispenses with checking a table against schema.org, because
// refrakt ships no ontology. What replaces it is visibility: a wrong row has to
// be *seeable*. These tests cover the two halves of that — describing a resolved
// row, and the one thing about a row that is mechanically checkable.

const TABLE: SchemaTable = {
	type: 'Review',
	properties: { quote: 'reviewBody' },
	entities: {
		author: {
			type: 'Person',
			property: 'author',
			properties: { 'author-name': 'name', 'author-role': 'jobTitle' },
		},
	},
};

const named = (name: string, text = 'x') => new Tag('span', { 'data-name': name }, [text]);
const root = (fields: Record<string, unknown>, children: unknown[] = []) =>
	new Tag(
		'article',
		{
			'data-rune': 'probe',
			...(Object.keys(fields).length > 0 ? { 'data-rune-fields': JSON.stringify(fields) } : {}),
		},
		children as never,
	);

describe('describeSchemaRow', () => {
	it('flattens parent and nested mappings into one list', () => {
		const row = describeSchemaRow(TABLE);
		expect(row.type).toBe('Review');
		expect(row.properties).toHaveLength(3);
		expect(row.entities).toEqual([{ name: 'author', type: 'Person', property: 'author' }]);
	});

	it('marks which entity a nested mapping belongs to', () => {
		const row = describeSchemaRow(TABLE);
		const jobTitle = row.properties.find((p) => p.property === 'jobTitle');
		expect(jobTitle?.entity).toBe('author');
		expect(row.properties.find((p) => p.property === 'reviewBody')?.entity).toBeUndefined();
	});

	it('resolves the row an attribute selects', () => {
		const table: SchemaTable = {
			by: 'type',
			rows: { podcast: { type: 'PodcastSeries' } },
			fallback: { type: 'MusicPlaylist' },
		};
		expect(describeSchemaRow(table, { type: 'podcast' }).type).toBe('PodcastSeries');
		expect(describeSchemaRow(table, { type: 'podcast' }).selectedFor).toBe('podcast');
		expect(describeSchemaRow(table, {}).type).toBe('MusicPlaylist');
		expect(describeSchemaRow(table, {}).selectedFor).toBeUndefined();
	});

	it('reports generated values with no source to resolve', () => {
		const row = describeSchemaRow({ type: 'ListItem', generated: { position: 'index' } });
		expect(row.properties).toEqual([
			{ source: '(index)', property: 'position', kind: 'generated' },
		]);
	});
});

describe('bySchemaProperty', () => {
	it('orders by schema.org property regardless of authoring order', () => {
		// The review view need not match the authoring view: the question a
		// reviewer asks is "what does this claim", which is property-first.
		const ordered = bySchemaProperty(describeSchemaRow(TABLE).properties);
		expect(ordered.map((p) => p.property)).toEqual(['jobTitle', 'name', 'reviewBody']);
	});
});

describe('auditSchemaSources', () => {
	const row: ResolvedSchemaRow = describeSchemaRow(TABLE);

	it('is silent when every source resolves to a node', () => {
		const tree = root({}, [named('quote'), named('author-name'), named('author-role')]);
		expect(auditSchemaSources(row, tree)).toEqual([]);
	});

	it('resolves a source from the field bag', () => {
		// The applier's second strategy — a value-only carrier dropped as pure
		// data — so the audit has to accept it too or it would report every
		// rebuilt property as broken.
		const tree = root({ quote: 'q', 'author-name': 'n', 'author-role': 'r' });
		expect(auditSchemaSources(row, tree)).toEqual([]);
	});

	it('reports a source that matches nothing at all', () => {
		// The failure mode worth a tool: a typo'd or renamed source resolves to
		// nothing ever, and the property is simply absent from the published
		// graph — silently.
		const typo = describeSchemaRow({ type: 'Review', properties: { quotee: 'reviewBody' } });
		const found = auditSchemaSources(typo, root({}, [named('quote')]));
		expect(found).toEqual([{ source: 'quotee', property: 'reviewBody' }]);
	});

	it('does not report an optional source a minimal input leaves unset', () => {
		// `rating` on `testimonial` is a declared attribute the canonical fixture
		// never sets. Flagging that would call a correct table broken because the
		// input was minimal — which is what the first version of this check did.
		const optional = describeSchemaRow({ type: 'Review', properties: { rating: 'ratingValue' } });
		expect(auditSchemaSources(optional, root({}), ['rating'])).toEqual([]);
	});

	it('matches a declared attribute through kebab-casing', () => {
		const optional = describeSchemaRow({ type: 'Event', properties: { endDate: 'endDate' } });
		expect(auditSchemaSources(optional, root({}), ['end-date'])).toEqual([]);
	});

	it('never reports a generated value', () => {
		const generated = describeSchemaRow({ type: 'ListItem', generated: { position: 'index' } });
		expect(auditSchemaSources(generated, root({}))).toEqual([]);
	});
});
