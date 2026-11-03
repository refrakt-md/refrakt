import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { readHeaderRoles, schemaHeaderRoles } from '../src/lib/header-roles.js';
import { section, sectionContentModel } from '../src/tags/section.js';
import { parse } from '../src/index.js';

/**
 * SPEC-186 D5 (WORK-695) — `section`'s header grammar is its declared content
 * model, and the composition audit reads that model rather than a reader of
 * its own. The rendering is unchanged: every section, hero, cta and
 * testimonial test passes as it did.
 */

// biome-ignore lint/suspicious/noExplicitAny: models are inspected loosely
type Any = any;

describe('section declares its header as a group (D5)', () => {
	it('auto: an optional group of eyebrow, a required headline, blurb and epigraph, then body', () => {
		const m: Any = sectionContentModel({});
		expect(m.type).toBe('sequence');
		const [header, body] = m.fields;
		expect(header).toMatchObject({ name: 'header', optional: true });
		expect(header.group.map((f: Any) => [f.name, !!f.optional])).toEqual([
			['eyebrow', true],
			['headline', false],
			['blurb', true],
			['epigraph', true],
		]);
		// SPEC-185 D5 — the epigraph is a group within: a quote and its
		// attribution, both required, so neither is read without the other.
		const epigraph = header.group[3];
		expect(epigraph.group.map((f: Any) => [f.name, !!f.optional])).toEqual([
			['epigraph-quote', false],
			['epigraph-attribution', false],
		]);
		expect(body).toMatchObject({ name: 'body', greedy: true });
	});

	it('`header` modes are conditional models: headline lifts only the heading, none reads no header', () => {
		const headline: Any = sectionContentModel({ header: 'headline' });
		expect(headline.fields[0].group.map((f: Any) => f.name)).toEqual(['headline']);
		const none: Any = sectionContentModel({ header: 'none' });
		expect(none.fields.map((f: Any) => f.name)).toEqual(['body']);
	});

	it('a split is a delimited model whose content zone holds the header', () => {
		const m: Any = sectionContentModel({ 'media-position': 'start' });
		expect(m.type).toBe('delimited');
		expect(m.zones.map((z: Any) => [z.name, !!z.primary])).toEqual([
			['media', false],
			['content', true],
			['footer', false],
		]);
		expect(m.zones[1].fields[0].name).toBe('header');
	});
});

describe('the composition audit reads the declared model (D5)', () => {
	const roles = (src: string, attrs: Record<string, unknown> = {}) =>
		readHeaderRoles(schemaHeaderRoles.get(section)!, parse(src).children, attrs).map((r) => r.role);

	it('finds eyebrow, headline and blurb around a leading heading', () => {
		expect(roles('New\n\n## Title\n\nBlurb.\n\nBody.')).toEqual(['eyebrow', 'headline', 'blurb']);
	});

	it('a paragraph with no heading after it is body (ADR-046)', () => {
		expect(roles('Just prose.\n\nMore prose.')).toEqual([]);
	});

	it('reads the content zone of a split', () => {
		expect(roles('![m](m.png)\n\n---\n\n## Title', { 'media-position': 'start' })).toEqual([
			'headline',
		]);
	});

	it('no hand-written header reader remains', async () => {
		const mod: Any = await import('../src/tags/section.js');
		expect(mod.sectionHeaderParts).toBeUndefined();
		expect(Markdoc).toBeDefined();
	});
});
