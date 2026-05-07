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
		expect(playlist['@type']).toBe('MusicPlaylist');
		expect(playlist.name).toBe('Summer Vibes');
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
		expect(playlist['@type']).toBe('MusicPlaylist');
		expect(playlist.name).toBe('Summer Vibes');
	});
});
