import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, tags, nodes, serializeTree } from '../src/index.js';

/**
 * SPEC-185 D3 (WORK-696) — a plain `>` is a quotation, marked on its element;
 * a rune that reinterprets `>` carries no marker.
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
const quotes = (tree: Json) => all(tree, (n) => n.name === 'blockquote');

describe('the quotation role (SPEC-185 D3)', () => {
	it('a plain `>` is marked `data-quote="quotation"` (D3.2)', () => {
		const [q] = quotes(render('Text.\n\n> Someone else’s words.\n'));
		expect(q.attributes['data-quote']).toBe('quotation');
	});

	it('a pull quote, which reinterprets `>`, carries no quotation marker (D3.3)', () => {
		const tree = render('{% pullquote %}\n> Design is how it works.\n{% /pullquote %}');
		for (const q of quotes(tree)) expect(q.attributes['data-quote']).toBeUndefined();
	});
});
