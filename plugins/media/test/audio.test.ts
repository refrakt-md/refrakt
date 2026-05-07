import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('audio rune', () => {
	it('should create an Audio component', () => {
		const result = parse(`{% audio src="/audio/interview.mp3" title="Interview" %}{% /audio %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'audio');
		expect(tag).toBeDefined();
	});

	it('should contain rf-audio element with JSON data', () => {
		const result = parse(`{% audio src="/audio/test.mp3" title="Test" %}{% /audio %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'audio');
		const audioEl = findTag(tag!, t => t.name === 'rf-audio');
		expect(audioEl).toBeDefined();

		const script = findTag(audioEl!, t => t.name === 'script');
		expect(script).toBeDefined();
		expect(script!.attributes.type).toBe('application/json');
	});

	it('should include waveform attribute when set', () => {
		const result = parse(`{% audio src="/audio/test.mp3" waveform=true %}{% /audio %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'audio');
		const audioEl = findTag(tag!, t => t.name === 'rf-audio');
		expect(audioEl).toBeDefined();
		expect(audioEl!.attributes.waveform).toBe('true');
	});

	it('should support inline chapters', () => {
		const result = parse(`{% audio src="/audio/interview.mp3" title="Interview" %}
Recorded on January 15, 2025.

1. Introduction (0:00)
2. Early career (4:30)
3. Founding the company (18:00)
{% /audio %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'audio');
		expect(tag).toBeDefined();

		// Should contain the rf-audio element with player data
		const audioEl = findTag(tag!, t => t.name === 'rf-audio');
		expect(audioEl).toBeDefined();
	});
});
