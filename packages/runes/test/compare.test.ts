import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('compare tag', () => {
	it('should collect code blocks as comparison panels', () => {
		const result = parse(`{% compare %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
const x = 2;
\`\`\`
{% /compare %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Compare');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');
	});

	it('should pass layout attribute as meta', () => {
		const result = parse(`{% compare layout="stacked" %}
\`\`\`javascript
const a = 1;
\`\`\`

\`\`\`javascript
const b = 2;
\`\`\`
{% /compare %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Compare');
		const layoutMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'stacked');
		expect(layoutMeta).toBeDefined();
	});

	it('should create panel wrappers for each code block', () => {
		const result = parse(`{% compare %}
\`\`\`javascript
const before = true;
\`\`\`

\`\`\`javascript
const after = true;
\`\`\`
{% /compare %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Compare');
		const panels = findAllTags(tag!, t => t.name === 'div' && t.attributes['data-panel'] === true);
		expect(panels.length).toBe(2);
	});

	it('should support three or more panels', () => {
		const result = parse(`{% compare %}
\`\`\`javascript
// Version 1
\`\`\`

\`\`\`javascript
// Version 2
\`\`\`

\`\`\`javascript
// Version 3
\`\`\`
{% /compare %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Compare');
		const panels = findAllTags(tag!, t => t.name === 'div' && t.attributes['data-panel'] === true);
		expect(panels.length).toBe(3);
	});
});
