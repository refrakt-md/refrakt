import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

const flat = (t: any): string => {
	if (typeof t === 'string') return t;
	if (t && Array.isArray(t.children)) return t.children.map(flat).join('');
	return '';
};

describe('section tag', () => {
	it('splits a leading eyebrow/headline/blurb into a header and keeps the rest as body', () => {
		const result = parse(`{% section %}
Compose, don't configure

## Runes that work together

Every block is a rune.

\`\`\`js
const grid = true;
\`\`\`
{% /section %}`);

		const section = findTag(result as any, t => t.attributes['data-rune'] === 'section');
		expect(section).toBeDefined();
		expect(section!.name).toBe('section');

		// Header wrapper with the three classified slots.
		const header = findTag(section!, t => t.name === 'header');
		expect(header).toBeDefined();

		const eyebrow = findTag(section!, t => t.attributes['data-name'] === 'eyebrow');
		const headline = findTag(section!, t => t.attributes['data-name'] === 'headline');
		const blurb = findTag(section!, t => t.attributes['data-name'] === 'blurb');
		expect(flat(eyebrow)).toContain("Compose, don't configure");
		expect(flat(headline)).toContain('Runes that work together');
		expect(flat(blurb)).toContain('Every block is a rune');

		// Body carries everything after the header — here a code fence, not the blurb.
		const body = findTag(section!, t => t.attributes['data-name'] === 'body');
		expect(body).toBeDefined();
		expect(flat(body)).toContain('const grid = true');
		// The fence must not have been swallowed by the header.
		expect(flat(header)).not.toContain('const grid = true');
	});

	it('renders only the body when there is no header content', () => {
		const result = parse(`{% section %}
\`\`\`js
const x = 1;
\`\`\`
{% /section %}`);

		const section = findTag(result as any, t => t.attributes['data-rune'] === 'section');
		expect(section).toBeDefined();
		// No header wrapper, no classified header slots.
		expect(findTag(section!, t => t.name === 'header')).toBeUndefined();
		expect(findAllTags(section!, t => ['eyebrow', 'headline', 'blurb'].includes(String(t.attributes['data-name'])))).toHaveLength(0);

		const body = findTag(section!, t => t.attributes['data-name'] === 'body');
		expect(body).toBeDefined();
		expect(flat(body)).toContain('const x = 1');
	});

	it('carries the align attribute in the field channel', () => {
		const result = parse(`{% section align="center" %}
## Centered
{% /section %}`);
		const section = findTag(result as any, t => t.attributes['data-rune'] === 'section');
		expect(fields(section).align).toBe('center');
	});
});
