import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '@refrakt-md/runes';

const seoTypeMap = buildSeoTypeMap(runes);
seoTypeMap.set('music-playlist', 'MusicPlaylist');
seoTypeMap.set('music-recording', 'MusicRecording');

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, {} as any, '/test');
}

describe('SEO: MusicPlaylist', () => {
	it('should extract MusicPlaylist with tracks', () => {
		const result = seo(`{% music-playlist %}
# Summer Vibes

- Track One | 3:42
- Track Two | 4:15
{% /music-playlist %}`);

		expect(result.jsonLd).toHaveLength(1);
		const playlist = result.jsonLd[0] as any;
		expect(playlist['@context']).toBe('https://schema.org');
		expect(playlist['@type']).toBe('MusicPlaylist');
		expect(playlist.name).toBe('Summer Vibes');
		expect(playlist.track).toBeDefined();
		expect(playlist.track.length).toBeGreaterThanOrEqual(2);
		expect(playlist.track[0]['@type']).toBe('MusicRecording');
	});
});
