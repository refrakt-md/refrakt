import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { bindDrawerLinks } from '../src/drawer-pipeline.js';

const { Tag } = Markdoc;

/** SPEC-187 D10 — a link to a drawer on the page opens it. */

const drawer = (id: string) =>
	new Tag('section', { 'data-rune': 'drawer', 'data-drawer-id': id, id: `drawer-${id}` }, []);
const a = (href: string, attrs: Record<string, unknown> = {}) =>
	new Tag('a', { href, ...attrs }, ['label']);
const page = (...children: unknown[]) => new Tag('article', {}, children as never[]);
// biome-ignore lint/suspicious/noExplicitAny: a rendered tree is untyped
const links = (tree: any): any[] => {
	const out: unknown[] = [];
	const walk = (n: any) => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!Tag.isTag(n)) return;
		if (n.name === 'a') out.push(n);
		n.children.forEach(walk);
	};
	walk(tree);
	return out as any[];
};

describe('bindDrawerLinks', () => {
	it('turns a link to a drawer id into a trigger for it', () => {
		const [link] = links(bindDrawerLinks(page(a('#install'), drawer('install'))));
		expect(link.attributes).toMatchObject({
			href: '#drawer-install',
			'data-target-type': 'drawer',
		});
	});

	it('accepts the drawer’s anchor as well as its id', () => {
		const [link] = links(bindDrawerLinks(page(a('#drawer-install'), drawer('install'))));
		expect(link.attributes).toMatchObject({
			href: '#drawer-install',
			'data-target-type': 'drawer',
		});
	});

	it('keeps the link’s text and other attributes, an icon included', () => {
		const icon = new Tag('svg', { 'data-icon': 'code' }, []);
		const link = new Tag('a', { href: '#source', class: 'x' }, [icon, ' Source']);
		const [out] = links(bindDrawerLinks(page(new Tag('li', {}, [link]), drawer('source'))));
		expect(out.attributes.class).toBe('x');
		expect(out.children).toEqual([icon, ' Source']);
	});

	it('prefers a drawer over a heading with the same id', () => {
		const heading = new Tag('h2', { id: 'install' }, ['Install']);
		const [link] = links(bindDrawerLinks(page(heading, a('#install'), drawer('install'))));
		expect(link.attributes['data-target-type']).toBe('drawer');
	});

	it('leaves a link to an id no drawer has, and every link on a page with no drawer', () => {
		const tree = page(a('#basic-usage'), drawer('install'));
		const [link] = links(bindDrawerLinks(tree));
		expect(link.attributes).toEqual({ href: '#basic-usage' });
		const none = page(a('#install'));
		expect(bindDrawerLinks(none)).toBe(none);
	});

	it('leaves a reference rune’s trigger and off-page links alone', () => {
		const ref = a('#drawer-install', { 'data-target-type': 'drawer', class: 'rf-xref' });
		const tree = page(ref, a('/other#install'), drawer('install'));
		const out = bindDrawerLinks(tree);
		const [first, second] = links(out);
		expect(first).toBe(ref);
		expect(second.attributes).toEqual({ href: '/other#install' });
	});
});
