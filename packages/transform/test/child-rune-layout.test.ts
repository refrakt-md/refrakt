/**
 * Layout assembly on a **child** rune (WORK-584 Q1).
 *
 * `identityTransform` dispatches `transformRune` for every node carrying a
 * `data-rune` that resolves to a config key — nested ones included. A child
 * rune (`Track` inside `Playlist`) therefore gets its own assembly pass driven
 * by its own `RuneConfig`, and `layout` needs no notion of a parent/child rune
 * boundary because there is none to cross: each rune assembles itself from its
 * own flat pool of `data-name`d children (`mapDataNames` does not recurse).
 *
 * These cases pin the four properties ADR-029 and ADR-030 rely on:
 * a theme can reorder a child rune's parts (A) and group them into a new
 * wrapper (B); a wrapper only carries a section role when `sections` names it
 * (C), which is identity-guarded so a theme cannot add one; and a parent's
 * layout cannot reach into a child rune's internals (D).
 */
import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;

/** A playlist containing one track, shaped like the real emitted tree:
 *  playlist > ol[data-name=tracks] > li[data-rune=track] > named spans. */
const playlistTree = () =>
	makeTag('section', { 'data-rune': 'playlist' }, [
		makeTag('ol', { 'data-name': 'tracks' }, [
			makeTag('li', { 'data-rune': 'track' }, [
				makeTag('span', { 'data-name': 'track-name' }, ['Weird Fishes']),
				makeTag('span', { 'data-name': 'track-artist' }, ['Radiohead']),
				makeTag('span', { 'data-name': 'track-duration' }, ['5:18']),
			]),
		]),
	]);

const base = { prefix: 'rf', tokenPrefix: '--rf', icons: {} };

/** Pull the transformed <li data-rune=track> out of the result. */
function findTrack(root: SerializedTag): SerializedTag {
	const ol = root.children.find((c: any) => c?.name === 'ol') as SerializedTag;
	return ol.children.find((c: any) => c?.name === 'li') as SerializedTag;
}
const names = (t: SerializedTag) =>
	t.children.filter((c: any) => c?.attributes).map((c: any) => c.attributes['data-name']);

describe('layout assembly on a child rune', () => {
	it('baseline: no layout → children render in transform order', () => {
		const config: ThemeConfig = {
			...base,
			runes: { Playlist: { block: 'playlist' }, Track: { block: 'track', parent: 'Playlist' } },
		} as ThemeConfig;
		const track = findTrack(asTag(createTransform(config)(playlistTree())));
		expect(names(track)).toEqual(['track-name', 'track-artist', 'track-duration']);
		expect(track.attributes.class).toContain('rf-track');
	});

	it('A. a layout on Track REORDERS its own named parts', () => {
		const config: ThemeConfig = {
			...base,
			runes: {
				Playlist: { block: 'playlist' },
				Track: {
					block: 'track',
					parent: 'Playlist',
					layout: { root: ['track-duration', 'track-name', 'track-artist'] },
				},
			},
		} as ThemeConfig;
		const track = findTrack(asTag(createTransform(config)(playlistTree())));
		expect(names(track)).toEqual(['track-duration', 'track-name', 'track-artist']);
	});

	it('B. a layout on Track CREATES a grouping wrapper (the byline case)', () => {
		const config: ThemeConfig = {
			...base,
			runes: {
				Playlist: { block: 'playlist' },
				Track: {
					block: 'track',
					parent: 'Playlist',
					layout: {
						root: ['track-name', 'byline'],
						byline: { tag: 'div', children: ['track-artist', 'track-duration'] },
					},
				},
			},
		} as ThemeConfig;
		const track = findTrack(asTag(createTransform(config)(playlistTree())));
		expect(names(track)).toEqual(['track-name', 'byline']);

		const byline = track.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'byline',
		) as SerializedTag;
		expect(byline.name).toBe('div');
		expect(byline.attributes.class).toBe('rf-track__byline');
		expect(names(byline)).toEqual(['track-artist', 'track-duration']);
		// A theme-created wrapper carries no section role.
		expect(byline.attributes['data-section']).toBeUndefined();
	});

	it('C. a wrapper named in `sections` DOES get a section role', () => {
		const config: ThemeConfig = {
			...base,
			runes: {
				Playlist: { block: 'playlist' },
				Track: {
					block: 'track',
					parent: 'Playlist',
					sections: { byline: 'footer' },
					layout: {
						root: ['track-name', 'byline'],
						byline: { tag: 'div', children: ['track-artist'] },
					},
				},
			},
		} as ThemeConfig;
		const track = findTrack(asTag(createTransform(config)(playlistTree())));
		const byline = track.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'byline',
		) as SerializedTag;
		expect(byline.attributes['data-section']).toBe('footer');
	});

	it('D. Playlist layout can NOT reach into Track internals', () => {
		const config: ThemeConfig = {
			...base,
			runes: {
				Playlist: {
					block: 'playlist',
					// try to reorder a track's parts from the parent
					layout: { root: ['tracks'], tracks: ['track-duration', 'track-name'] },
				},
				Track: { block: 'track', parent: 'Playlist' },
			},
		} as ThemeConfig;
		const track = findTrack(asTag(createTransform(config)(playlistTree())));
		expect(names(track)).toEqual(['track-name', 'track-artist', 'track-duration']);
	});
});
