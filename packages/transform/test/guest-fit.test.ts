import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		// A framed well — no guestFit → default 'clip'.
		Card: { block: 'card', sections: { media: 'media' } },
		// A bare section host.
		Hero: { block: 'hero', sections: { media: 'media' }, guestFit: 'bleed' },
		// No media section at all.
		Plain: { block: 'plain' },
	},
};

function find(node: any, pred: (n: any) => boolean): any {
	if (!node || typeof node !== 'object') return undefined;
	if (pred(node)) return node;
	for (const c of node.children ?? []) {
		const hit = find(c, pred);
		if (hit) return hit;
	}
	return undefined;
}
const mediaZone = (n: any) => find(n, (x) => x.attributes?.['data-section'] === 'media');

function host(rune: string, guest: any) {
	return makeTag('div', { 'data-rune': rune }, [
		makeTag('div', { 'data-section': 'media', 'data-name': 'media' }, [guest]),
	]);
}

describe('data-guest-fit (media-host chrome axis)', () => {
	it('defaults to clip when guestFit is unset', () => {
		const t = createTransform(config);
		const r = asTag(t(host('card', makeTag('img', { src: '/a.png' }, []))));
		expect(mediaZone(r)?.attributes['data-guest-fit']).toBe('clip');
	});

	it('emits bleed when the rune declares guestFit: bleed', () => {
		const t = createTransform(config);
		const r = asTag(t(host('hero', makeTag('div', { 'data-rune': 'sandbox' }, []))));
		expect(mediaZone(r)?.attributes['data-guest-fit']).toBe('bleed');
	});

	it('only lands on the media zone, regardless of guest type', () => {
		const t = createTransform(config);
		const r = asTag(t(host('hero', makeTag('img', { src: '/a.png' }, []))));
		// the guest itself never carries the axis — it rides the zone
		const img = find(r, (x) => x.name === 'img');
		expect(img?.attributes['data-guest-fit']).toBeUndefined();
		expect(mediaZone(r)?.attributes['data-guest-fit']).toBe('bleed');
	});

	it('is absent on runes with no media section', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('div', { 'data-rune': 'plain' }, [makeTag('p', {}, ['x'])])));
		expect(find(r, (x) => x.attributes?.['data-guest-fit'])).toBeUndefined();
	});
});
