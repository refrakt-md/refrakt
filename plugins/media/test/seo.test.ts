/**
 * These expectations are hand-written and deliberately partial — they say what a
 * rune's structured data is *for*, in a form a reader can check by eye.
 *
 * For the catalog-wide question "what does every rune emit today", the
 * authoritative record is `contracts/seo-baseline/baseline.json` (WORK-562):
 * 41 fixtures over all 30 emitting runes, regenerated with
 * `npm run seo:baseline` and guarded by a drift test. These files assert intent;
 * the baseline records fact, defects included. Where the two disagree, the
 * baseline is what shipped — and one of them is a bug.
 */
import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { extractSeo } from '@refrakt-md/runes';

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, {} as any, '/test');
}

describe('SEO: Playlist', () => {
	it('should extract MusicPlaylist with tracks', () => {
		const result = seo(`{% playlist %}
# Summer Vibes

- **Track One** (3:42)
- **Track Two** (4:15)
{% /playlist %}`);

		expect(result.jsonLd).toHaveLength(1);
		const playlist = result.jsonLd[0] as any;
		expect(playlist['@context']).toBe('https://schema.org');
		// `MusicAlbum` since WORK-569, not `MusicPlaylist`: the `type` attribute
		// defaults to `album`, and `MusicAlbum` — a subtype of `MusicPlaylist` —
		// had been available and unused the whole time. `type="mix"` still gives
		// the broader type.
		expect(playlist['@type']).toBe('MusicAlbum');
		expect(playlist.name).toBe('Summer Vibes');
	});

	it('keeps MusicPlaylist for a mix, the one kind with no narrower type', () => {
		const result = seo(`{% playlist type="mix" %}
# Summer Vibes

- **Track One** (3:42)
{% /playlist %}`);
		expect((result.jsonLd[0] as any)['@type']).toBe('MusicPlaylist');
	});
});

describe('SEO: MusicPlaylist (legacy)', () => {
	it('should extract MusicPlaylist with tracks using legacy name', () => {
		const result = seo(`{% music-playlist %}
# Summer Vibes

- **Track One** (3:42)
- **Track Two** (4:15)
{% /music-playlist %}`);

		expect(result.jsonLd).toHaveLength(1);
		const playlist = result.jsonLd[0] as any;
		expect(playlist['@context']).toBe('https://schema.org');
		// The legacy alias resolves to the same rune and the same table.
		expect(playlist['@type']).toBe('MusicAlbum');
		expect(playlist.name).toBe('Summer Vibes');
	});
});
