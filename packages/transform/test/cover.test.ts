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

	it('full-scope cover defaults the root to a dark scheme (light overlay text)', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover')])));
		expect(r.attributes['data-color-scheme']).toBe('dark');
	});

	it('scrim="none" opts out of the default cover scrim and the dark scheme', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('scrim', 'none')])));
		expect(r.attributes['data-scrim']).toBe('none');
		expect(r.attributes['data-color-scheme']).toBeUndefined();
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

	it('scrim-tone="light" flips the cover foreground to a light scheme', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'card' }, [meta('media-position', 'cover'), meta('scrim-tone', 'light')])));
		expect(r.attributes['data-color-scheme']).toBe('light');
	});
});
