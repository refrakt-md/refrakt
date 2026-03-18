import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('playlist rune', () => {
	it('should create a Playlist component', () => {
		const result = parse(`{% playlist type="album" %}
# My Album

- **Track One** (3:42)
- **Track Two** (4:15)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');
	});

	it('should extract header with title', () => {
		const result = parse(`{% playlist %}
# Summer Vibes

- **Track One** (3:00)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		expect(tag).toBeDefined();

		const header = findTag(tag!, t =>
			t.attributes['data-name'] === 'header');
		expect(header).toBeDefined();
	});

	it('should extract track names from bold text', () => {
		const result = parse(`{% playlist %}
# Test Playlist

- **Bohemian Rhapsody** (5:55)
- **Hotel California** (6:30)
- **Stairway to Heaven** (8:02)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const trackNames = findAllTags(tag!, t =>
			t.attributes['data-name'] === 'track-name');
		expect(trackNames.length).toBe(3);
		expect(trackNames[0].children).toContain('Bohemian Rhapsody');
		expect(trackNames[1].children).toContain('Hotel California');
		expect(trackNames[2].children).toContain('Stairway to Heaven');
	});

	it('should extract durations from parenthetical text', () => {
		const result = parse(`{% playlist %}
# Test

- **Track** (3:42)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const duration = findTag(tag!, t =>
			t.attributes['data-name'] === 'track-duration');
		expect(duration).toBeDefined();
		expect(duration!.children).toContain('3:42');
	});

	it('should extract artist from italic text', () => {
		const result = parse(`{% playlist type="mix" %}
# Road Trip Mix

- **Bohemian Rhapsody** — *Queen* (5:55)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const artist = findTag(tag!, t =>
			t.attributes['data-name'] === 'track-artist');
		expect(artist).toBeDefined();
		expect(artist!.children).toContain('Queen');
	});

	it('should inherit artist from playlist attribute', () => {
		const result = parse(`{% playlist type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon

- **Speak to Me** (1:13)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const artist = findTag(tag!, t =>
			t.attributes['data-name'] === 'track-artist');
		expect(artist).toBeDefined();
		expect(artist!.children).toContain('Pink Floyd');
	});

	it('should support cover image in media zone', () => {
		const result = parse(`{% playlist %}
# Album

- **Track** (3:00)

---

![Cover](/images/cover.jpg)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const img = findTag(tag!, t => t.name === 'img');
		expect(img).toBeDefined();
	});

	it('should work with music-playlist legacy name', () => {
		const result = parse(`{% music-playlist %}
# Legacy Playlist

- **Track One** (3:00)
{% /music-playlist %}`);

		// Legacy name uses same schema, data-rune is 'playlist'
		const tag = findTag(result as any, t =>
			t.attributes['data-rune'] === 'playlist');
		expect(tag).toBeDefined();
	});

	it('should include player element when player attribute is set', () => {
		const result = parse(`{% playlist player=true %}
# With Player

- **Track** (3:00)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const player = findTag(tag!, t => t.attributes['data-name'] === 'player');
		expect(player).toBeDefined();

		const audioEl = findTag(player!, t => t.name === 'rf-audio');
		expect(audioEl).toBeDefined();
	});

	it('should create tracks container', () => {
		const result = parse(`{% playlist %}
# Test

- **Track One** (3:00)
- **Track Two** (4:00)
{% /playlist %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'playlist');
		const tracks = findTag(tag!, t =>
			t.attributes['data-name'] === 'tracks');
		expect(tracks).toBeDefined();
		expect(tracks!.name).toBe('ol');
	});
});
