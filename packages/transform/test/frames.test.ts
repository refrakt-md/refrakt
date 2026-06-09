import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	frames: {
		screenshot: { shadow: 'lg', aspect: '16/9' },
		'hero-peek': { extends: 'screenshot', displace: 'bottom', offset: 'lg' },
	},
	runes: {
		Card: { block: 'card', sections: { media: 'media' } }, // media target (default)
		Figure: { block: 'figure', frameTarget: 'self' },
		Plain: { block: 'plain' }, // no frame target
	},
};

const frameMeta = (name: string, content: string) =>
	makeTag('meta', { 'data-field': name, content }, []);

const mediaChild = () => makeTag('div', { 'data-section': 'media', 'data-name': 'media' }, ['img']);

function findMedia(node: any): SerializedTag | undefined {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.['data-section'] === 'media') return node;
	for (const c of node.children ?? []) {
		const f = findMedia(c);
		if (f) return f;
	}
	return undefined;
}

describe('SPEC-086 frame chrome', () => {
	it('applies a frame preset to the media zone (default media target)', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, [mediaChild(), frameMeta('frame', 'screenshot')]);
		const result = asTag(transform(tag));
		const media = findMedia(result)!;
		expect(media.attributes['data-frame']).toBe('screenshot');
		expect(media.attributes['data-frame-shadow']).toBe('lg');
		expect(media.attributes.style).toContain('--frame-aspect: 16/9');
		// root carries no frame chrome
		expect(result.attributes['data-frame']).toBeUndefined();
	});

	it('resolves `extends` and merges displace/offset (offset via the named scale)', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, [mediaChild(), frameMeta('frame', 'hero-peek')]);
		const media = findMedia(asTag(transform(tag)))!;
		expect(media.attributes['data-displace']).toBe('bottom');
		expect(media.attributes['data-frame-shadow']).toBe('lg'); // inherited
		expect(media.attributes.style).toContain('--frame-offset: var(--rf-spacing-lg)');
	});

	it('inline facets work without a preset and override it', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, [
			mediaChild(),
			frameMeta('frame-displace', 'bottom-end'),
			frameMeta('frame-offset', 'md'),
		]);
		const media = findMedia(asTag(transform(tag)))!;
		expect(media.attributes['data-displace']).toBe('bottom-end');
		expect(media.attributes.style).toContain('--frame-offset: var(--rf-spacing-md)');
	});

	it('routes frame chrome to the root for frameTarget: self', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'figure' }, [frameMeta('frame', 'screenshot')]);
		const result = asTag(transform(tag));
		expect(result.attributes['data-frame']).toBe('screenshot');
		expect(result.attributes.style).toContain('--frame-aspect: 16/9');
	});

	it('warns and applies nothing when there is no frame target', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'plain' }, [frameMeta('frame', 'screenshot')]);
		const result = asTag(transform(tag));
		expect(result.attributes['data-frame']).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no frame target'));
		warn.mockRestore();
	});

	it('consumes frame metas (stripped from output)', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, [mediaChild(), frameMeta('frame', 'screenshot')]);
		const result = asTag(transform(tag));
		const hasFrameMeta = (result.children as any[]).some(
			(c) => c?.name === 'meta' && c.attributes?.['data-field'] === 'frame',
		);
		expect(hasFrameMeta).toBe(false);
	});
});
