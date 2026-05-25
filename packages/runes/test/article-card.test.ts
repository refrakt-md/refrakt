import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function render(src: string, variables: Record<string, unknown> = {}) {
	return Markdoc.transform(Markdoc.parse(src), { tags, nodes, variables } as never);
}

function find(node: unknown, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean): InstanceType<typeof Markdoc.Tag> | undefined {
	let found: InstanceType<typeof Markdoc.Tag> | undefined;
	const walk = (n: unknown) => {
		if (found) return;
		if (Array.isArray(n)) return n.forEach(walk);
		if (!Markdoc.Tag.isTag(n as never)) return;
		const t = n as InstanceType<typeof Markdoc.Tag>;
		if (pred(t)) { found = t; return; }
		(t.children ?? []).forEach(walk);
	};
	walk(node);
	return found;
}

describe('article-card', () => {
	it('renders a standalone card from plain attributes', () => {
		const out = render('{% article-card title="Hello World" href="/posts/hello/" date="2024-01-15" excerpt="A summary" /%}');
		const card = find(out, (t) => t.attributes['data-rune'] === 'article-card');
		expect(card).toBeDefined();
		expect(card!.name).toBe('article');
		const link = find(out, (t) => t.name === 'a' && t.attributes.href === '/posts/hello/');
		expect(link).toBeDefined();
		expect((link!.children ?? [])[0]).toBe('Hello World');
		const time = find(out, (t) => t.name === 'time');
		expect(time!.attributes.datetime).toBe('2024-01-15');
	});

	it('omits optional parts when not provided', () => {
		const out = render('{% article-card title="Just a title" /%}');
		expect(find(out, (t) => t.name === 'img')).toBeUndefined();
		expect(find(out, (t) => t.name === 'time')).toBeUndefined();
		// no href → title is a span, not a link
		expect(find(out, (t) => t.name === 'a')).toBeUndefined();
	});

	it('accepts values from markdoc variables (collection-fed usage)', () => {
		const out = render('{% article-card title=$t href=$u /%}', { t: 'From Var', u: '/v/' });
		const link = find(out, (t) => t.name === 'a' && t.attributes.href === '/v/');
		expect(link).toBeDefined();
		expect((link!.children ?? [])[0]).toBe('From Var');
	});
});
