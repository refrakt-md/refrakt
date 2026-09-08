import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as mediaConfig } from '../src/config.js';

// SPEC-125 Phase 1 / WORK-531 — playlist declared a `body` slot in its layout
// and never mapped it, so `reading` and `dropcap` were silently dropped.

const themeConfig: ThemeConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: mediaConfig };

function transformed(content: string): SerializedTag {
	const found = findTag(parse(content) as any, (t) => t.attributes['data-rune'] === 'playlist');
	expect(found, 'no playlist in schema output').toBeDefined();
	return createTransform(themeConfig)(JSON.parse(JSON.stringify(found)) as SerializedTag) as SerializedTag;
}

function findByAttr(node: any, attr: string, value: string): any {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.[attr] === value) return node;
	for (const c of node.children ?? []) {
		const hit = findByAttr(c, attr, value);
		if (hit) return hit;
	}
	return undefined;
}

const src = (attrs = '') => `{% playlist ${attrs} %}
# The Dark Side of the Moon

- **Speak to Me** (1:13)
- **Breathe** (2:43)

Recorded at Abbey Road between June 1972 and January 1973.
{% /playlist %}`;

describe('playlist section roles', () => {
	it('emits data-section="body" on the trailing prose', () => {
		expect(findByAttr(transformed(src()), 'data-name', 'body')?.attributes['data-section']).toBe('body');
	});

	it('reading and dropcap land on that prose', () => {
		const body = findByAttr(transformed(src('reading="prose" dropcap=true')), 'data-name', 'body');
		expect(body?.attributes['data-reading']).toBe('prose');
		expect(body?.attributes['data-dropcap']).toBe('true');
	});

	it('leaves the track list unroled', () => {
		// `tracks` is structured content the rune reinterprets, not the body.
		// Mapping it to `body` would invent the datatable-shaped overload
		// SPEC-125 Direction 2 exists to avoid.
		const tracks = findByAttr(transformed(src()), 'data-name', 'tracks');
		expect(tracks).toBeDefined();
		expect(tracks?.attributes['data-section']).toBeUndefined();
	});

	it('keeps the page-section header roles it already had', () => {
		const out = transformed(src());
		expect(findByAttr(out, 'data-name', 'preamble')?.attributes['data-section']).toBe('preamble');
		expect(findByAttr(out, 'data-name', 'headline')?.attributes['data-section']).toBe('title');
	});
});
