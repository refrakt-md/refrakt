import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

function render(src: string, variables: Record<string, unknown> = {}) {
	return Markdoc.transform(Markdoc.parse(src), { tags, nodes, variables } as never);
}

function find(node: unknown, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean) {
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

const card = (t: unknown) => find(t, (x) => x.attributes['data-rune'] === 'card');
const part = (t: unknown, name: string) => find(t, (x) => x.attributes['data-name'] === name);

describe('card rune', () => {
	it('1 zone → body only (no media, no footer)', () => {
		const out = render('{% card %}\nJust the body.\n{% /card %}');
		expect(card(out)).toBeDefined();
		expect(part(out, 'body')).toBeDefined();
		expect(part(out, 'media')).toBeUndefined();
		expect(part(out, 'footer')).toBeUndefined();
		expect(JSON.stringify(out)).toContain('Just the body.');
	});

	it('2 zones → media + body', () => {
		const out = render('{% card %}\n![alt](/img.png)\n\n---\n\n### Title\nBody text.\n{% /card %}');
		const media = part(out, 'media');
		expect(media).toBeDefined();
		expect(find(media, (x) => x.name === 'img')).toBeDefined();
		expect(part(out, 'body')).toBeDefined();
		expect(part(out, 'footer')).toBeUndefined();
	});

	it('3 zones → media + body + footer', () => {
		const out = render('{% card %}\n![a](/i.png)\n\n---\n\n### T\nBody.\n\n---\n\nJan 15 · tag\n{% /card %}');
		expect(part(out, 'media')).toBeDefined();
		expect(part(out, 'body')).toBeDefined();
		const footer = part(out, 'footer');
		expect(footer).toBeDefined();
		expect(footer!.name).toBe('footer');
		expect(JSON.stringify(footer)).toContain('Jan 15');
	});

	it('media zone accepts arbitrary content (not just an image)', () => {
		const out = render('{% card %}\n```js\nconst x = 1;\n```\n\n---\n\n### Code card\n{% /card %}');
		const media = part(out, 'media');
		expect(media).toBeDefined();
		// the fenced code rendered inside the media zone (a <pre>), not an <img>
		expect(find(media, (x) => x.name === 'pre')).toBeDefined();
		expect(find(media, (x) => x.name === 'img')).toBeUndefined();
	});

	it('href adds a stretched link overlay', () => {
		const out = render('{% card href="/posts/hello/" %}\n### Hello\n{% /card %}');
		const link = part(out, 'link');
		expect(link).toBeDefined();
		expect(link!.name).toBe('a');
		expect(link!.attributes.href).toBe('/posts/hello/');
	});

	it('resolves $item in the body (collection-fed usage)', () => {
		const out = render('{% card href=$item.url %}\n### {% $item.data.title %}\n{% /card %}', {
			item: { url: '/r/tart/', data: { title: 'Lemon Tart' } },
		});
		expect(JSON.stringify(out)).toContain('Lemon Tart');
		expect(part(out, 'link')!.attributes.href).toBe('/r/tart/');
	});
});
