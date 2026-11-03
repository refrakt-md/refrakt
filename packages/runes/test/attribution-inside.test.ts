import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { defineComposedRune, parse, tags, nodes, serializeTree } from '../src/index.js';
import { insideAttributionItemModel, readAttribution } from '../src/lib/attribution.js';

/**
 * SPEC-185 D6, the inside form (WORK-699) — `— **Name**, Source` as a
 * blockquote's last paragraph is its attribution.
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const render = (src: string, extra: Record<string, unknown> = {}): Json =>
	serializeTree(
		Markdoc.transform(parse(src), {
			tags: { ...tags, ...extra },
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
const text = (n: Json): string =>
	typeof n === 'string' ? n : (n?.children ?? []).map(text).join('');
const named = (tree: Json, name: string) => all(tree, (n) => n.name === name);
const role = (tree: Json, r: string) => all(tree, (n) => n.attributes?.['data-quote'] === r);
const paragraph = (src: string): Json => Markdoc.parse(src).children[0];

const QUOTE = '> Not all those who wander are lost.\n>\n> — **J. R. R. Tolkien**, The Fellowship';

describe('the inside attribution model (D6)', () => {
	const read = (src: string) => readAttribution(paragraph(src), insideAttributionItemModel);

	it('reads a leading dash, then the name in bold, then the source', () => {
		expect(read('— **Ada Lovelace**, Analyst')).toEqual({
			name: 'Ada Lovelace',
			source: 'Analyst',
		});
		expect(read('– **Ada Lovelace**')).toEqual({ name: 'Ada Lovelace' });
	});

	it('does not misread a quote ending in bold text', () => {
		expect(read('It ends in **bold**.')).toBeUndefined();
		expect(read('**Ada Lovelace** — Analyst')).toBeUndefined();
		expect(read('— and then **bold**')).toBeUndefined();
	});
});

describe('the core blockquote node reads an inside attribution (D6)', () => {
	it('an attributed quotation is a figure with its figcaption', () => {
		const tree = render(`Text.\n\n${QUOTE}`);
		const [figure] = role(tree, 'quotation');
		expect(figure.name).toBe('figure');
		expect(figure.children.map((c: Json) => c.name)).toEqual(['blockquote', 'figcaption']);
		const [quote] = named(figure, 'blockquote');
		expect(quote.attributes['data-quote']).toBeUndefined();
		expect(text(quote)).toBe('Not all those who wander are lost.');
		expect(text(named(figure, 'cite')[0])).toBe('J. R. R. Tolkien');
	});

	it('without one it stays a bare blockquote, marked', () => {
		const tree = render('Text.\n\n> It ends in **bold**.');
		const [q] = role(tree, 'quotation');
		expect(q.name).toBe('blockquote');
		expect(named(tree, 'figcaption')).toHaveLength(0);
	});

	it('an attribution alone is not a quotation with a source: a quote needs words', () => {
		const tree = render('Text.\n\n> — **Ada Lovelace**');
		expect(named(tree, 'figure')).toHaveLength(0);
	});
});

describe('pullquote and the epigraph accept either form (D6)', () => {
	it('pullquote reads the inside form, one figcaption', () => {
		const tree = render(`{% pullquote %}\n${QUOTE}\n{% /pullquote %}`);
		const [pq] = role(tree, 'featured');
		expect(named(pq, 'figcaption')).toHaveLength(1);
		expect(named(pq.children, 'figure')).toHaveLength(0);
		expect(text(named(pq, 'blockquote')[0])).toBe('Not all those who wander are lost.');
		expect(text(named(pq, 'cite')[0])).toBe('J. R. R. Tolkien');
	});

	it('with both forms, one figcaption: the paragraph after the quote', () => {
		const tree = render(`{% pullquote %}\n${QUOTE}\n\n**Bilbo** — a hobbit\n{% /pullquote %}`);
		const [pq] = role(tree, 'featured');
		expect(named(pq, 'figcaption')).toHaveLength(1);
		expect(text(named(pq, 'cite')[0])).toBe('Bilbo');
	});

	it('a section reads an inside-attributed epigraph after its header', () => {
		const tree = render(`{% section %}\n## Wandering\n\n${QUOTE}\n\nBody.\n{% /section %}`);
		const [epigraph] = role(tree, 'epigraph');
		expect(epigraph.attributes['data-name']).toBe('epigraph');
		expect(named(epigraph, 'figcaption')).toHaveLength(1);
		const [body] = all(tree, (n) => n.attributes?.['data-name'] === 'body');
		expect(text(body)).toBe('Body.');
	});

	it('a page reads an inside-attributed epigraph at its start', () => {
		const tree = render(`# The Road\n\n${QUOTE}\n\nThe text begins.`);
		expect(tree.children[1].attributes['data-quote']).toBe('epigraph');
		expect(named(tree.children[1].children, 'figure')).toHaveLength(0);
		expect(text(tree.children[2])).toBe('The text begins.');
	});

	it('an epigraph with both forms renders one figcaption', () => {
		const tree = render(`${QUOTE}\n\n**Bilbo** — a hobbit\n\nText.`);
		const [epigraph] = role(tree, 'epigraph');
		expect(named(epigraph, 'figcaption')).toHaveLength(1);
		expect(text(named(epigraph, 'cite')[0])).toBe('Bilbo');
	});
});

describe('a composition reads it through a nested model, `position: last` (D6)', () => {
	const DEF = `---
tag: figure
content:
  type: sequence
  fields:
    quote:
      match: blockquote
      model:
        type: sequence
        fields:
          body: { match: paragraph, greedy: true }
          attribution:
            match: paragraph
            optional: true
            position: last
            itemModel:
              prefix: '^\\s*[—–]\\s*$'
              fields:
                - { name: name, match: strong }
---

{% slot name="quote.attribution" /%}

{% slot name="quote.body" /%}
`;
	const rune = defineComposedRune('saying', DEF);
	const out = (src: string) => JSON.stringify(render(src, { saying: rune.rune.schema }));

	it('places the inside attribution as its own member', () => {
		const html = out('{% saying %}\n> Wise words.\n>\n> — **Ada**\n{% /saying %}');
		expect(html.indexOf('Ada')).toBeLessThan(html.indexOf('Wise words.'));
	});

	it('a last line in bold with no dash stays the body', () => {
		const html = out('{% saying %}\n> Wise words.\n>\n> **Ada**\n{% /saying %}');
		expect(html.indexOf('Wise words.')).toBeLessThan(html.indexOf('Ada'));
	});
});
