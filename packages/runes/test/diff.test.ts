import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('diff tag', () => {
	it('should transform two code blocks into a diff view', () => {
		const result = parse(`{% diff %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
const x = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');
	});

	it('should pass mode and language as meta', () => {
		const result = parse(`{% diff mode="split" language="typescript" %}
\`\`\`typescript
let x: number = 1;
\`\`\`

\`\`\`typescript
const x: number = 1;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const mode = metas.find(m => m.attributes.property === 'mode');
		expect(mode).toBeDefined();
		expect(mode!.attributes.content).toBe('split');

		const language = metas.find(m => m.attributes.property === 'language');
		expect(language).toBeDefined();
		expect(language!.attributes.content).toBe('typescript');
	});

	it('should include before and after refs', () => {
		const result = parse(`{% diff %}
\`\`\`
old code
\`\`\`

\`\`\`
new code
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const before = findTag(tag!, t => t.name === 'pre' && t.attributes['data-name'] === 'before');
		expect(before).toBeDefined();

		const after = findTag(tag!, t => t.name === 'pre' && t.attributes['data-name'] === 'after');
		expect(after).toBeDefined();
	});
});
