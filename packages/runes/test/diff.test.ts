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

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
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

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const mode = metas.find(m => m.attributes['data-field'] === 'mode');
		expect(mode).toBeDefined();
		expect(mode!.attributes.content).toBe('split');

		const language = metas.find(m => m.attributes['data-field'] === 'language');
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

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
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

	it('should include raw text with data-language in line content', () => {
		const result = parse(`{% diff language="javascript" %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
let y = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const lineContents = findAllTags(tag!, t => t.attributes['data-name'] === 'line-content');
		expect(lineContents.length).toBeGreaterThan(0);

		// Line content should have data-language for the highlight transform
		const hasLang = lineContents.some(lc => lc.attributes['data-language'] === 'javascript');
		expect(hasLang).toBe(true);

		// Line content children should be plain text (not highlighted HTML)
		const hasPlainText = lineContents.some(lc =>
			lc.children.some(c => typeof c === 'string' && !c.includes('<span'))
		);
		expect(hasPlainText).toBe(true);
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

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
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

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const splitContainer = findTag(tag!, t => t.attributes['data-name'] === 'split-container');
		expect(splitContainer).toBeDefined();

		const panels = findAllTags(splitContainer!, t => t.attributes['data-name'] === 'panel');
		expect(panels.length).toBe(2);

		// Per-panel Before/After headers were removed in favour of a single
		// optional full-width header above the split container.
		const perPanelHeaders = findAllTags(splitContainer!, t => t.attributes['data-name'] === 'header');
		expect(perPanelHeaders.length).toBe(0);
	});

	it('should not render a header when title is omitted', () => {
		const result = parse(`{% diff mode="split" %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
let y = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const header = findTag(tag!, t => t.attributes['data-name'] === 'header');
		expect(header).toBeUndefined();
	});

	it('should number each split panel with a single per-side gutter and no prefix column', () => {
		const result = parse(`{% diff mode="split" %}
\`\`\`javascript
const x = 1;
const y = 2;
\`\`\`

\`\`\`javascript
const x = 1;
const z = 3;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const splitContainer = findTag(tag!, t => t.attributes['data-name'] === 'split-container');
		const panels = findAllTags(splitContainer!, t => t.attributes['data-name'] === 'panel');

		// The +/- prefix column is gone — directional cue is encoded in the
		// number's colour + the absence of a number on the opposite side.
		const prefixSpans = findAllTags(splitContainer!, t => t.attributes['data-name'] === 'gutter-prefix');
		expect(prefixSpans.length).toBe(0);

		// Left panel: numbers tagged data-side="before".
		const beforeNums = findAllTags(panels[0], t => t.attributes['data-name'] === 'gutter-num');
		expect(beforeNums.length).toBeGreaterThan(0);
		expect(beforeNums.every(n => n.attributes['data-side'] === 'before')).toBe(true);

		// Right panel: numbers tagged data-side="after".
		const afterNums = findAllTags(panels[1], t => t.attributes['data-name'] === 'gutter-num');
		expect(afterNums.length).toBeGreaterThan(0);
		expect(afterNums.every(n => n.attributes['data-side'] === 'after')).toBe(true);
	});

	it('should leave the off-side number empty on add/remove rows in unified mode', () => {
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

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const lines = findAllTags(tag!, t => t.attributes['data-name'] === 'line');

		const removeLine = lines.find(l => l.attributes['data-type'] === 'remove');
		expect(removeLine).toBeDefined();
		const removeNums = findAllTags(removeLine!, t => t.attributes['data-name'] === 'gutter-num');
		expect(removeNums.length).toBe(2);
		// before-num populated, after-num empty
		expect(removeNums.find(n => n.attributes['data-side'] === 'before')!.children[0]).not.toBe('');
		expect(removeNums.find(n => n.attributes['data-side'] === 'after')!.children[0]).toBe('');

		const addLine = lines.find(l => l.attributes['data-type'] === 'add');
		expect(addLine).toBeDefined();
		const addNums = findAllTags(addLine!, t => t.attributes['data-name'] === 'gutter-num');
		// after-num populated, before-num empty
		expect(addNums.find(n => n.attributes['data-side'] === 'after')!.children[0]).not.toBe('');
		expect(addNums.find(n => n.attributes['data-side'] === 'before')!.children[0]).toBe('');
	});

	it('should not emit a gutter-prefix column in unified mode', () => {
		const result = parse(`{% diff %}
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`javascript
const x = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const prefixSpans = findAllTags(tag!, t => t.attributes['data-name'] === 'gutter-prefix');
		expect(prefixSpans.length).toBe(0);
	});

	it('should render an optional full-width header from the title attribute', () => {
		const result = parse(`{% diff mode="split" title="src/app.ts" %}
\`\`\`typescript
const x = 1;
\`\`\`

\`\`\`typescript
const x = 2;
\`\`\`
{% /diff %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diff');
		const header = findTag(tag!, t => t.attributes['data-name'] === 'header');
		expect(header).toBeDefined();
		expect(header!.children).toContain('src/app.ts');

		// The header sits at the rune root, not inside a panel.
		const splitContainer = findTag(tag!, t => t.attributes['data-name'] === 'split-container');
		const headerInsidePanel = findTag(splitContainer!, t => t.attributes['data-name'] === 'header');
		expect(headerInsidePanel).toBeUndefined();
	});
});
