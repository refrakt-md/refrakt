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

		const tag = findTag(result as any, t => t.attributes.typeof === 'HowTo');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass attributes as meta tags', () => {
		const result = parse(`{% howto estimatedTime="PT30M" difficulty="easy" %}
# Simple Task

1. Do this
{% /howto %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'HowTo');
		const metas = findAllTags(tag!, t => t.name === 'meta');
		const time = metas.find(m => m.attributes.property === 'estimatedTime');
		expect(time).toBeDefined();
		expect(time!.attributes.content).toBe('PT30M');
	});

	it('should work with how-to alias', () => {
		const result = parse(`{% how-to %}
# Test

1. Step one
{% /how-to %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'HowTo');
		expect(tag).toBeDefined();
	});
});
