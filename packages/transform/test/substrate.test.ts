import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const meta = (f: string, c: string) => makeTag('meta', { 'data-field': f, content: c }, []);
const mediaChild = () => makeTag('div', { 'data-section': 'media', 'data-name': 'media' }, ['img']);

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		Hero: { block: 'hero', sections: { media: 'media' } }, // has media, but substrate defaults to self
		Card: { block: 'card', sections: { media: 'media' } },
		Plain: { block: 'plain' },
	},
};

function findMedia(node: any): SerializedTag | undefined {
	if (node?.attributes?.['data-section'] === 'media') return node;
	for (const c of node?.children ?? []) { const f = findMedia(c); if (f) return f; }
	return undefined;
}

describe('SPEC-087 substrate', () => {
	it('defaults to the self surface even when a media section exists', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [mediaChild(), meta('substrate', 'dots'), meta('substrate-size', 'md')]);
		const result = asTag(transform(tag));
		expect(result.attributes['data-substrate']).toBe('dots');
		expect(result.attributes.style).toContain('--substrate-cell: 16px');
		// not on the media zone
		expect(findMedia(result)!.attributes['data-substrate']).toBeUndefined();
	});

	it('routes to the media well with substrate-target="media"', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, [mediaChild(), meta('substrate', 'grid'), meta('substrate-target', 'media'), meta('substrate-fill', 'inset')]);
		const result = asTag(transform(tag));
		expect(result.attributes['data-substrate']).toBeUndefined(); // not on root
		const media = findMedia(result)!;
		expect(media.attributes['data-substrate']).toBe('grid');
		expect(media.attributes['data-substrate-fill']).toBe('inset');
	});

	it('warns and drops substrate-target="media" on a rune with no media section', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'plain' }, [meta('substrate', 'dots'), meta('substrate-target', 'media')]);
		const result = asTag(transform(tag));
		expect(result.attributes['data-substrate']).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no media section'));
		warn.mockRestore();
	});

	it('consumes substrate metas (stripped from output)', () => {
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hero' }, [meta('substrate', 'dots')]);
		const result = asTag(transform(tag));
		const leaked = (result.children as any[]).some((c) => c?.name === 'meta' && c.attributes?.['data-field'] === 'substrate');
		expect(leaked).toBe(false);
	});
});
