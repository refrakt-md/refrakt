// The parser and positions spike (notes X5): can one inline value be changed through each parser,
// touching only its bytes? Each case is applied, then the result is re-parsed and checked.
import Markdoc from '@markdoc/markdoc';
import { parseMarkdown, defineComarkPlugin } from 'comark';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';

const body = (open: string, close: string) => `${open}
# Ship docs *today*

- [Get started](/docs) and more
- [View on GitHub](https://github.com/acme/docs "Repo")

Write \`[docs](/old)\` for a link, as in
the guide: \`[x](/y)\` then [docs](/old).
${close}
`;
const sources = {
	markdoc: body('{% hero align="start" %}', '{% /hero %}'),
	comark: body('::hero{align="start"}', '::'),
	mdast: body(':::hero{align="start"}', ':::'),
};

type Edit = { from: number; to: number; text: string };
const apply = (src: string, e: Edit) => src.slice(0, e.from) + e.text + src.slice(e.to);
const lineStart = (src: string, line: number) =>
	src.split('\n').slice(0, line).join('\n').length + (line ? 1 : 0);

// A naive scanner for a link's destination inside a window: the n-th `](` from the window's start.
// This is what a parser with line positions only forces: find the value again by scanning text.
function naiveHref(src: string, from: number, to: number, nth: number): Edit | null {
	let at = from;
	for (let i = 0; i <= nth; i++) {
		at = src.indexOf('](', at);
		if (at < 0 || at >= to) return null;
		if (i < nth) at += 2;
	}
	const start = at + 2;
	let end = start;
	while (end < to && !/[\s)]/.test(src[end])) end++;
	return { from: start, to: end, text: '' };
}

// mdast: the link node's exact span is known; the destination sits after the label's end, after `](`.
function mdastHref(src: string, link: any): Edit {
	const labelEnd = link.children.at(-1)?.position.end.offset ?? link.position.start.offset + 1;
	const start = src.indexOf('](', labelEnd) + 2;
	let end = start;
	while (end < link.position.end.offset && !/[\s)]/.test(src[end])) end++;
	return { from: start, to: end, text: '' };
}

const links = {
	markdoc(src: string) {
		const out: any[] = [];
		const walk = (n: any, block: any) => {
			const b = n.type === 'paragraph' || n.type === 'item' || n.type === 'heading' ? n : block;
			if (n.type === 'link') out.push({ node: n, block: b });
			for (const c of n.children ?? []) walk(c, b);
		};
		walk(Markdoc.parse(src), null);
		return out;
	},
	mdast(src: string) {
		const tree = fromMarkdown(src, {
			extensions: [directive()],
			mdastExtensions: [directiveFromMarkdown()],
		});
		const out: any[] = [];
		const walk = (n: any) => {
			if (n.type === 'link') out.push(n);
			for (const c of n.children ?? []) walk(c);
		};
		walk(tree);
		return { tree, links: out };
	},
	async comark(src: string) {
		let tokens: any[] = [];
		const grab = defineComarkPlugin(() => ({
			name: 'grab',
			post(s: any) {
				tokens = s.tokens;
			},
		}));
		const doc = await parseMarkdown(src, { plugins: [grab()] });
		const out: any[] = [];
		let block: any = null;
		for (const t of tokens) {
			if (t.map) block = t;
			for (const c of t.children ?? []) if (c.type === 'link_open') out.push({ token: c, block });
		}
		return { doc, links: out };
	},
};

function check(
	name: string,
	before: string,
	after: string,
	expectHrefs: string[],
	parse: (s: string) => string[],
) {
	const got = parse(after);
	const ok = JSON.stringify(got) === JSON.stringify(expectHrefs);
	const changed = [...after].length - [...before].length;
	console.log(
		`  ${ok ? 'OK  ' : 'FAIL'} ${name}: hrefs ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(expectHrefs)})`}; length ${changed >= 0 ? '+' : ''}${changed}`,
	);
}

const hrefsMarkdoc = (s: string) => links.markdoc(s).map((l) => l.node.attributes.href);
const hrefsMdast = (s: string) => links.mdast(s).links.map((l: any) => l.url);

console.log('Markdoc', (Markdoc as any).default ? '' : '');
{
	const src = sources.markdoc;
	const ls = links.markdoc(src);
	for (const [i, l] of ls.entries())
		console.log(
			`  link ${i}: href ${l.node.attributes.href}, node location lines ${JSON.stringify(l.node.location)}, block lines ${JSON.stringify(l.block.lines)}`,
		);
	// Case A: the second link, in its list item. Window: the item's lines; first `](` in it.
	const a = ls[1];
	const wa = naiveHref(src, lineStart(src, a.block.lines[0]), lineStart(src, a.block.lines[1]), 0)!;
	check(
		'A list item href',
		src,
		apply(src, { ...wa, text: 'https://example.com/new' }),
		['/docs', 'https://example.com/new', '/old'],
		hrefsMarkdoc,
	);
	// Case B: the third link, the paragraph's only link (index 0 among the paragraph's links).
	const b = ls[2];
	const wb = naiveHref(
		src,
		lineStart(src, b.block.lines[0]),
		lineStart(src, b.block.lines.at(-1)),
		0,
	)!;
	check(
		'B link after look-alike code spans',
		src,
		apply(src, { ...wb, text: '/new' }),
		['/docs', 'https://github.com/acme/docs', '/new'],
		hrefsMarkdoc,
	);
	// Case C: the tag's attribute: location gives the line only; the value must be found by scanning.
	const tag = Markdoc.parse(src).children[0] as any;
	console.log(
		`  tag attributes ${JSON.stringify(tag.attributes)}, tag location ${JSON.stringify(tag.location)}: no attribute positions`,
	);
}

console.log('\nComark');
{
	const src = sources.comark;
	const { links: ls } = await links.comark(src);
	for (const [i, l] of ls.entries())
		console.log(
			`  link ${i}: href ${l.token.attrs?.[0]?.[1]}, token map ${JSON.stringify(l.token.map)}, enclosing block map ${JSON.stringify(l.block.map)}`,
		);
	console.log(
		'  same situation as Markdoc: block lines only, the value found by scanning text (both are built on markdown-it)',
	);
}

console.log('\nmdast (micromark), generic directives');
{
	const src = sources.mdast;
	const { tree, links: ls } = links.mdast(src);
	for (const [i, l] of ls.entries())
		console.log(
			`  link ${i}: url ${l.url}, span ${l.position.start.offset}-${l.position.end.offset} ${JSON.stringify(src.slice(l.position.start.offset, l.position.end.offset))}`,
		);
	check(
		'A list item href',
		src,
		apply(src, { ...mdastHref(src, ls[1]), text: 'https://example.com/new' }),
		['/docs', 'https://example.com/new', '/old'],
		hrefsMdast,
	);
	check(
		'B link after look-alike code spans',
		src,
		apply(src, { ...mdastHref(src, ls[2]), text: '/new' }),
		['/docs', 'https://github.com/acme/docs', '/new'],
		hrefsMdast,
	);
	const dir = (tree as any).children[0];
	const open = src.slice(dir.position.start.offset, src.indexOf('\n', dir.position.start.offset));
	console.log(
		`  directive attributes ${JSON.stringify(dir.attributes)}, opening line ${JSON.stringify(open)}: the directive's span is exact, but no per-attribute positions`,
	);
}

console.log('\nMarkdoc for structure, micromark for positions inside one block');
{
	const src = sources.markdoc;
	const ls = links.markdoc(src);
	const b = ls[2];
	const from = lineStart(src, b.block.lines[0]);
	const to = lineStart(src, b.block.lines.at(-1));
	// Re-read only the block's lines with micromark; map Markdoc's n-th link in the block to micromark's n-th.
	const local = fromMarkdown(src.slice(from, to));
	const found: any[] = [];
	const walk = (n: any) => {
		if (n.type === 'link') found.push(n);
		for (const c of n.children ?? []) walk(c);
	};
	walk(local);
	const nth = ls.filter((l) => l.block === b.block).indexOf(b);
	const e = mdastHref(src.slice(from, to), found[nth]);
	check(
		'B through the hybrid',
		src,
		apply(src, { from: from + e.from, to: from + e.to, text: '/new' }),
		['/docs', 'https://github.com/acme/docs', '/new'],
		hrefsMarkdoc,
	);
}
