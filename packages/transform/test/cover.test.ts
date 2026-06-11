import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const meta = (f: string, c: string) => makeTag('meta', { 'data-field': f, content: c }, []);

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		Card: {
			block: 'card',
			modifiers: {
				'media-position': { source: 'meta', default: 'top', noBemClass: true },
				'content-place': { source: 'meta', noBemClass: true },
				height: { source: 'meta', noBemClass: true },
			},
			sections: { media: 'media' },
			layout: { root: ['media', 'content'], content: { tag: 'div', children: [] } },
			variants: { 'media-position': { cover: { staticModifiers: ['cover'], rootAttributes: { 'data-cover-scope': 'full' } } } },
		},
		// Mirrors the recipe header-scope cover variant: the band carries the dark
		// colour-scheme so only the overlaid preamble flips, not the body below.
		Recipe: {
			block: 'recipe',
			modifiers: { 'media-position': { source: 'meta', default: 'top', noBemClass: true } },
			sections: { media: 'media' },
			layout: { root: ['media', 'preamble', 'body'] },
			variants: {
				'media-position': {
					cover: {
						staticModifiers: ['cover'],
						rootAttributes: { 'data-cover-scope': 'header' },
						layout: {
							root: ['cover-band', 'body'],
							'cover-band': { tag: 'div', attrs: { 'data-color-scheme': 'dark' }, children: ['media', 'preamble'] },
							body: { tag: 'div', children: [] },
						},
					},
				},
			},
		},
	},
};

const findByName = (node: any, name: string): any => {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.['data-name'] === name) return node;
	for (const c of node.children ?? []) {
		const hit = findByName(c, name);
		if (hit) return hit;
	}
	return undefined;
};

describe('SPEC-089 cover variant', () => {
	it('media-position=cover applies the cover variant (modifier class + scope attr)', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover')])));
		expect(r.attributes.class).toContain('rf-card--cover');
		expect(r.attributes['data-cover-scope']).toBe('full');
		expect(r.attributes['data-media-position']).toBe('cover');
	});

	it('content-place in cover emits 2-axis vars (block × inline)', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('content-place', 'end start')])));
		expect(r.attributes.style).toContain('--cover-place-block: end');
		expect(r.attributes.style).toContain('--cover-place-inline: start');
	});

	it('content-place="auto" emits no place vars (left to the container query)', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('content-place', 'auto')])));
		expect(r.attributes['data-content-place']).toBe('auto');
		expect(r.attributes.style ?? '').not.toContain('--cover-place-block');
	});

	it('content-place outside cover warns and emits no vars', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('content-place', 'end')])));
		expect(r.attributes.style ?? '').not.toContain('--cover-place-block');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('only active in'));
		warn.mockRestore();
	});

	it('non-cover media-position leaves the card uncovered', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'top')])));
		expect(r.attributes.class).not.toContain('rf-card--cover');
		expect(r.attributes['data-cover-scope']).toBeUndefined();
	});

	it('full-scope cover flips the content overlay (not the root) to a dark scheme', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover')])));
		// Card box surface stays on the page palette; only the overlay text flips.
		expect(r.attributes['data-color-scheme']).toBeUndefined();
		expect(findByName(r, 'content')?.attributes['data-color-scheme']).toBe('dark');
	});

	it('scrim="none" opts out of the default cover scrim and the overlay scheme', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('scrim', 'none')])));
		expect(r.attributes['data-scrim']).toBe('none');
		expect(findByName(r, 'content')?.attributes['data-color-scheme']).toBeUndefined();
	});

	it('header-scope cover flips only the cover-band, not the rune root', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'recipe' }, [meta('media-position', 'cover')])));
		// Root stays on the page palette; the band carries the dark scheme.
		expect(r.attributes['data-color-scheme']).toBeUndefined();
		const band = findByName(r, 'cover-band');
		expect(band?.attributes['data-color-scheme']).toBe('dark');
	});

	it('height knob emits a data-height attribute on the card root', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('height', 'lg')])));
		expect(r.attributes['data-height']).toBe('lg');
	});

	it('an explicit scrim direction pins the cover-scrim gradient direction', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('content-place', 'start center'), meta('scrim', 'bottom')])));
		// content-place block start → "to bottom"; explicit scrim="bottom" also "to bottom".
		expect(r.attributes.style).toContain('--cover-scrim-dir: to bottom');
		// And it is not data-scrim="none".
		expect(r.attributes['data-scrim']).toBeUndefined();
	});

	it('scrim-tone="light" flips the cover overlay to a light scheme', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('scrim-tone', 'light')])));
		expect(findByName(r, 'content')?.attributes['data-color-scheme']).toBe('light');
	});

	it('scrim-type="frost" routes a frosted treatment to the cover host (no bg layer)', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('scrim-type', 'frost'), meta('scrim-blur', 'md')])));
		expect(r.attributes['data-scrim-type']).toBe('frost');
		expect(r.attributes['data-scrim-blur']).toBe('md');
		// The scrim stays on the media well (cover.css), not the self-surface bg layer.
		expect(r.attributes.class).not.toContain('--has-bg');
		// The SPEC-088 scrim metas are consumed, not leaked as stray <meta> tags.
		const leaked = (r.children ?? []).filter((c: any) => c?.name === 'meta' && /^scrim/.test(c.attributes?.['data-field'] ?? ''));
		expect(leaked).toHaveLength(0);
	});
});

describe('SPEC-101 cover sandbox backdrop', () => {
	const findSandbox = (node: any): any => {
		if (!node || typeof node !== 'object') return undefined;
		if (node.name === 'rf-sandbox') return node;
		for (const c of node.children ?? []) {
			const hit = findSandbox(c);
			if (hit) return hit;
		}
		return undefined;
	};

	it('auto-fills an auto-height sandbox serving as the cover backdrop', () => {
		const t = createTransform(config);
		const media = makeTag('div', { 'data-name': 'media' }, [
			makeTag('rf-sandbox', { 'data-height': 'auto' }, []),
		]);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), media])));
		expect(findSandbox(r)?.attributes['data-height']).toBe('fill');
	});

	it('leaves an explicit numeric sandbox height alone under cover', () => {
		const t = createTransform(config);
		const media = makeTag('div', { 'data-name': 'media' }, [
			makeTag('rf-sandbox', { 'data-height': '360' }, []),
		]);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), media])));
		expect(findSandbox(r)?.attributes['data-height']).toBe('360');
	});

	it('does not touch sandbox height outside cover', () => {
		const t = createTransform(config);
		const media = makeTag('div', { 'data-name': 'media' }, [
			makeTag('rf-sandbox', { 'data-height': 'auto' }, []),
		]);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'top'), media])));
		expect(findSandbox(r)?.attributes['data-height']).toBe('auto');
	});
});
