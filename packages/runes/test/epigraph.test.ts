import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, tags, nodes, serializeTree } from '../src/index.js';

/**
 * SPEC-185 D5 (WORK-698) — an attributed blockquote in the epigraph position is
 * an epigraph: after a section's headline and blurb, or at the start of a page.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const render = (src: string): Json =>
	serializeTree(
		Markdoc.transform(parse(src), {
			tags,
			nodes,
			variables: { generatedIds: new Set(), path: '/t', headings: [] },
		} as never),
	);
const all = (n: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] => {
	if (Array.isArray(n)) {
		for (const c of n) all(c, pred, out);
		return out;
	}
	if (!n || typeof n !== 'object') return out;
	if (pred(n)) out.push(n);
	all(n.children ?? [], pred, out);
	return out;
};
const epigraphs = (tree: Json) => all(tree, (n) => n.attributes?.['data-quote'] === 'epigraph');
const quotations = (tree: Json) => all(tree, (n) => n.attributes?.['data-quote'] === 'quotation');
const text = (n: Json): string =>
	typeof n === 'string' ? n : (n?.children ?? []).map(text).join('');

const QUOTE =
	'> Not all those who wander are lost.\n\n**J. R. R. Tolkien** — The Fellowship of the Ring';

describe('an epigraph in a section header (D5)', () => {
	it('after the headline and blurb, with an attribution, is an epigraph', () => {
		const tree = render(
			`{% section %}\n## Wandering\n\nA blurb.\n\n${QUOTE}\n\nBody text.\n{% /section %}`,
		);
		const [figure] = epigraphs(tree);
		expect(figure.name).toBe('figure');
		expect(figure.attributes['data-name']).toBe('epigraph');
		expect(figure.children.map((c: Json) => c.name)).toEqual(['blockquote', 'figcaption']);
		// The quote inside carries no marker of its own: the role is the figure's.
		expect(figure.children[0].attributes['data-quote']).toBeUndefined();
		const [cite] = all(figure, (n) => n.name === 'cite');
		expect(text(cite)).toBe('J. R. R. Tolkien');
		// It is part of the header, after the blurb.
		const [header] = all(tree, (n) => n.name === 'header');
		expect(header.children.map((c: Json) => c.attributes?.['data-name'])).toEqual([
			'headline',
			'blurb',
			'epigraph',
		]);
		// The body is what follows.
		const [body] = all(tree, (n) => n.attributes?.['data-name'] === 'body');
		expect(text(body)).toBe('Body text.');
	});

	it('directly after the headline, with no blurb', () => {
		const tree = render(`{% section %}\n## Wandering\n\n${QUOTE}\n{% /section %}`);
		expect(epigraphs(tree)).toHaveLength(1);
		expect(all(tree, (n) => n.attributes?.['data-name'] === 'blurb')).toHaveLength(0);
	});

	it('without an attribution it stays a quotation, in the body', () => {
		const tree = render(
			'{% section %}\n## Wandering\n\n> Not all those who wander are lost.\n\nBody.\n{% /section %}',
		);
		expect(epigraphs(tree)).toHaveLength(0);
		const [body] = all(tree, (n) => n.attributes?.['data-name'] === 'body');
		expect(quotations(body)).toHaveLength(1);
	});

	it('a lone attribution after a headline stays the blurb', () => {
		const tree = render('{% section %}\n## Wandering\n\n**Bilbo** — a hobbit\n{% /section %}');
		expect(epigraphs(tree)).toHaveLength(0);
		const [blurb] = all(tree, (n) => n.attributes?.['data-name'] === 'blurb');
		expect(text(blurb)).toContain('Bilbo');
	});

	it('`header="headline"` reads no epigraph', () => {
		const tree = render(
			`{% section header="headline" %}\n## Wandering\n\n${QUOTE}\n{% /section %}`,
		);
		expect(epigraphs(tree)).toHaveLength(0);
	});

	it('with no headline there is no header, so no epigraph', () => {
		const tree = render(`{% section %}\n${QUOTE}\n{% /section %}`);
		expect(epigraphs(tree)).toHaveLength(0);
		expect(quotations(tree)).toHaveLength(1);
	});
});

describe('an epigraph at the start of a page (D5)', () => {
	it('opening the content', () => {
		const tree = render(`${QUOTE}\n\nThe text begins.`);
		const [figure] = epigraphs(tree);
		expect(figure.name).toBe('figure');
		expect(tree.children[0]).toBe(figure);
		expect(text(tree.children[1])).toBe('The text begins.');
		expect(quotations(tree)).toHaveLength(0);
	});

	it('directly after the `#` title', () => {
		const tree = render(`# The Road\n\n${QUOTE}\n\nThe text begins.`);
		expect(tree.children[0].name).toBe('h1');
		expect(tree.children[1].attributes['data-quote']).toBe('epigraph');
	});

	it('not further down the page', () => {
		const tree = render(`# The Road\n\nAn opening.\n\n${QUOTE}`);
		expect(epigraphs(tree)).toHaveLength(0);
		expect(quotations(tree)).toHaveLength(1);
	});

	it('not under a heading inside the body', () => {
		const tree = render(`Intro.\n\n## A source\n\n${QUOTE}`);
		expect(epigraphs(tree)).toHaveLength(0);
	});

	it('without an attribution it stays a quotation', () => {
		const tree = render('> Not all those who wander are lost.\n\nThe text begins.');
		expect(epigraphs(tree)).toHaveLength(0);
		expect(quotations(tree)).toHaveLength(1);
	});
});
