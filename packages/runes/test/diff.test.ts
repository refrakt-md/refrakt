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

	it('should include diff data with hunks', () => {
		const result = parse(`{% diff %}
\`\`\`javascript
const x = 1;
const y = 2;
\`\`\`

\`\`\`javascript
const x = 1;
const z = 3;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const dataMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-name'] === 'data');
		expect(dataMeta).toBeDefined();

		const data = JSON.parse(dataMeta!.attributes.content);
		expect(data.hunks).toBeDefined();
		expect(Array.isArray(data.hunks)).toBe(true);

		// "const x = 1;" is equal in both
		const equalHunk = data.hunks.find((h: any) => h.type === 'equal' && h.text === 'const x = 1;');
		expect(equalHunk).toBeDefined();

		// "const y = 2;" is removed
		const removeHunk = data.hunks.find((h: any) => h.type === 'remove' && h.text === 'const y = 2;');
		expect(removeHunk).toBeDefined();

		// "const z = 3;" is added
		const addHunk = data.hunks.find((h: any) => h.type === 'add' && h.text === 'const z = 3;');
		expect(addHunk).toBeDefined();
	});

	it('should include syntax-highlighted HTML in hunks', () => {
		const result = parse(`{% diff language="javascript" %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
let y = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const dataMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-name'] === 'data');
		const data = JSON.parse(dataMeta!.attributes.content);

		// Hunks should have html with hljs span tags
		const hunkWithHighlight = data.hunks.find((h: any) => h.html.includes('hljs-'));
		expect(hunkWithHighlight).toBeDefined();
	});

	it('should handle identical code blocks', () => {
		const result = parse(`{% diff %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
const x = 1;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const dataMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-name'] === 'data');
		const data = JSON.parse(dataMeta!.attributes.content);

		// All hunks should be equal
		expect(data.hunks.every((h: any) => h.type === 'equal')).toBe(true);
	});
});
