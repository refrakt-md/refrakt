import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('track rune', () => {
	it('should create a Track component', () => {
		const result = parse(`{% track src="/audio/breathe.mp3" artist="Pink Floyd" duration="PT2M43S" %}
Breathe
{% /track %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'track');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('li');
	});

	it('should extract track name from content', () => {
		const result = parse(`{% track %}
# My Track
{% /track %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'track');
		const name = findTag(tag!, t => t.attributes['data-name'] === 'track-name');
		expect(name).toBeDefined();
		expect(name!.children).toContain('My Track');
	});

	it('should display artist', () => {
		const result = parse(`{% track artist="Queen" %}
Bohemian Rhapsody
{% /track %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'track');
		const artist = findTag(tag!, t => t.attributes['data-name'] === 'track-artist');
		expect(artist).toBeDefined();
		expect(artist!.children).toContain('Queen');
	});

	it('should format ISO 8601 duration', () => {
		const result = parse(`{% track duration="PT5M55S" %}
Track
{% /track %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'track');
		const duration = findTag(tag!, t => t.attributes['data-name'] === 'track-duration');
		expect(duration).toBeDefined();
		expect(duration!.children).toContain('5:55');
	});

	it('should work with music-recording legacy name', () => {
		const result = parse(`{% music-recording artist="Beethoven" %}
Moonlight Sonata
{% /music-recording %}`);

		// Legacy name uses same schema, data-rune is 'track'
		const tag = findTag(result as any, t =>
			t.attributes['data-rune'] === 'track');
		expect(tag).toBeDefined();
	});
});
