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
			sections: { media: 'media' },
			modifiers: { 'media-position': { source: 'meta', default: 'top', noBemClass: true } },
		},
		// Behaviour-driven (interactive) guests, and a presentational one. Two
		// interactive guests so the once-per-`container:guest` warning dedup
		// doesn't bleed between tests.
		Widget: { block: 'widget', interactive: true },
		Widget2: { block: 'widget2', interactive: true },
		Still: { block: 'still' },
	},
};

/** Build a card with a media zone (holding `guestRune`), a content zone (with a
 *  body link), and optionally a stretched whole-tile link. */
function card(opts: { href?: boolean; cover?: boolean; guestRune?: string }) {
	const guest = opts.guestRune
		? [makeTag('div', { 'data-rune': opts.guestRune }, [])]
		: [makeTag('img', { src: '/a.png' }, [])];
	const children: any[] = [
		makeTag('div', { 'data-section': 'media', 'data-name': 'media' }, guest),
		makeTag('div', { 'data-name': 'content' }, [makeTag('a', { 'data-name': 'follow', href: '/b' }, ['Follow'])]),
	];
	if (opts.cover) children.unshift(meta('media-position', 'cover'));
	if (opts.href) children.push(makeTag('a', { 'data-name': 'link', href: '/a' }, []));
	return makeTag('div', { 'data-rune': 'card' }, children);
}

function findBy(node: any, pred: (n: any) => boolean): any {
	if (!node || typeof node !== 'object') return undefined;
	if (pred(node)) return node;
	for (const c of node.children ?? []) {
		const hit = findBy(c, pred);
		if (hit) return hit;
	}
	return undefined;
}
const mediaZone = (n: any) => findBy(n, (x) => x.attributes?.['data-section'] === 'media');
const followLink = (n: any) => findBy(n, (x) => x.attributes?.['data-name'] === 'follow');

describe('SPEC-090 media-guest interaction posture', () => {
	it('a linked container demotes its media guest to presentational', () => {
		const t = createTransform(config);
		const r = asTag(t(card({ href: true, guestRune: 'widget' })));
		expect(mediaZone(r)?.attributes['data-guest-posture']).toBe('presentational');
	});

	it('an interactive guest in a linked tile emits a build warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const t = createTransform(config);
		t(card({ href: true, guestRune: 'widget2' }));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('interactive guest `widget2` in a linked `card`'));
		warn.mockRestore();
	});

	it('a non-interactive guest (image) in a linked tile is demoted but does not warn', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const t = createTransform(config);
		const r = asTag(t(card({ href: true }))); // plain image
		expect(mediaZone(r)?.attributes['data-guest-posture']).toBe('presentational');
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('the demotion is scoped to the media zone — content controls are untouched', () => {
		const t = createTransform(config);
		const r = asTag(t(card({ href: true, guestRune: 'widget' })));
		expect(followLink(r)?.attributes['data-guest-posture']).toBeUndefined();
	});

	it('a non-clickable, non-cover container hosts its interactive guest normally', () => {
		const t = createTransform(config);
		const r = asTag(t(card({ guestRune: 'widget' })));
		expect(mediaZone(r)?.attributes['data-guest-posture']).toBeUndefined();
	});

	it('a cover guest is an inert backdrop regardless of href', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const t = createTransform(config);
		const r = asTag(t(card({ cover: true, guestRune: 'widget' }))); // cover, no href
		expect(mediaZone(r)?.attributes['data-guest-posture']).toBe('presentational');
		// Cover full-bleed widgets are out of scope, so no warning without a link.
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
