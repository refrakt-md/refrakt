import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('howto tag', () => {
	it('should transform a basic how-to', () => {
		const result = parse(`{% howto estimatedTime="PT1H" difficulty="medium" %}
# How to Build a Birdhouse

You will need these tools:

- Hammer
- Nails
- Saw

1. Cut the wood to size
2. Assemble the walls
3. Attach the roof
{% /howto %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'how-to');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass attributes as meta tags', () => {
		const result = parse(`{% howto estimatedTime="PT30M" difficulty="easy" %}
# Simple Task

1. Do this
{% /howto %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'how-to');
		const metas = findAllTags(tag!, t => t.name === 'meta');
		const time = metas.find(m => m.attributes['data-field'] === 'estimated-time');
		expect(time).toBeDefined();
		expect(time!.attributes.content).toBe('PT30M');
	});

	it('should set data-name on tool and step list items', () => {
		const result = parse(`{% howto %}
# Build a Shelf

- Hammer
- Screwdriver

1. Measure the boards
2. Cut to size
{% /howto %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'how-to');
		const tools = findAllTags(tag!, t => t.name === 'li' && t.attributes['data-name'] === 'tool');
		expect(tools.length).toBe(2);
		expect(tools[0].attributes.typeof).toBe('HowToTool');

		const steps = findAllTags(tag!, t => t.name === 'li' && t.attributes['data-name'] === 'step');
		expect(steps.length).toBe(2);
		expect(steps[0].attributes.typeof).toBe('HowToStep');
	});

	it('should work with how-to alias', () => {
		const result = parse(`{% how-to %}
# Test

1. Step one
{% /how-to %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'how-to');
		expect(tag).toBeDefined();
	});
});
