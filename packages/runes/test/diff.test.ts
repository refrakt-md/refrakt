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

	it('should produce expanded line spans with diff types', () => {
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
		const lines = findAllTags(tag!, t => t.attributes['data-name'] === 'line');
		expect(lines.length).toBeGreaterThan(0);

		// "const x = 1;" is equal in both
		const equalLine = lines.find(l => l.attributes['data-type'] === 'equal');
		expect(equalLine).toBeDefined();

		// "const y = 2;" is removed
		const removeLine = lines.find(l => l.attributes['data-type'] === 'remove');
		expect(removeLine).toBeDefined();

		// "const z = 3;" is added
		const addLine = lines.find(l => l.attributes['data-type'] === 'add');
		expect(addLine).toBeDefined();
	});

	it('should include syntax-highlighted HTML in line content', () => {
		const result = parse(`{% diff language="javascript" %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
let y = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const lineContents = findAllTags(tag!, t => t.attributes['data-name'] === 'line-content');
		expect(lineContents.length).toBeGreaterThan(0);

		// Line content children should have hljs-highlighted HTML strings
		const hasHighlight = lineContents.some(lc =>
			lc.children.some(c => typeof c === 'string' && c.includes('hljs-'))
		);
		expect(hasHighlight).toBe(true);
	});

	it('should handle identical code blocks with all equal lines', () => {
		const result = parse(`{% diff %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
const x = 1;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const lines = findAllTags(tag!, t => t.attributes['data-name'] === 'line');
		expect(lines.length).toBeGreaterThan(0);

		// All lines should be equal
		expect(lines.every(l => l.attributes['data-type'] === 'equal')).toBe(true);
	});

	it('should produce split renderable with panels', () => {
		const result = parse(`{% diff mode="split" %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
let y = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diff');
		const splitContainer = findTag(tag!, t => t.attributes['data-name'] === 'split-container');
		expect(splitContainer).toBeDefined();

		const panels = findAllTags(splitContainer!, t => t.attributes['data-name'] === 'panel');
		expect(panels.length).toBe(2);

		const header = findTag(panels[0], t => t.attributes['data-name'] === 'header');
		expect(header).toBeDefined();
		expect(header!.children).toContain('Before');

		const headerAfter = findTag(panels[1], t => t.attributes['data-name'] === 'header-after');
		expect(headerAfter).toBeDefined();
		expect(headerAfter!.children).toContain('After');
	});
});
