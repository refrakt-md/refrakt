import { describe, it, expect } from 'vitest';
import { formatIndentation, guardRewrite } from '../src/format-indent.js';

/**
 * WORK-657 — `refrakt format`, SPEC-170 D5: a block tag's content is indented
 * one tab only when the tag holds another block tag. Only leading whitespace
 * changes, and a rewrite that would change the AST is refused.
 */

const T = '\t';

/** Every fixture: flat input, and the D5 layout of it. */
const FIXTURES: Record<string, { input: string; expected: string }> = {
	'a tag holding a block tag indents; one holding prose stays at its own level': {
		input: [
			'{% card %}',
			'Intro with *emphasis* and **strong** text.',
			'',
			'{% hint type="note" %}',
			'A hint holds only prose.',
			'{% /hint %}',
			'{% /card %}',
			'',
		].join('\n'),
		expected: [
			'{% card %}',
			`${T}Intro with *emphasis* and **strong** text.`,
			'',
			`${T}{% hint type="note" %}`,
			`${T}A hint holds only prose.`,
			`${T}{% /hint %}`,
			'{% /card %}',
			'',
		].join('\n'),
	},
	'inline tags do not count': {
		input:
			'{% hint %}\nA {% badge %}new{% /badge %} thing, and an {% icon name="x" /%}.\n{% /hint %}\n',
		expected:
			'{% hint %}\nA {% badge %}new{% /badge %} thing, and an {% icon name="x" /%}.\n{% /hint %}\n',
	},
	'lists keep their relative indentation': {
		input: [
			'{% grid %}',
			'- one',
			'  - nested',
			'    continued',
			'- two',
			'',
			'{% badge /%}',
			'{% /grid %}',
		].join('\n'),
		expected: [
			'{% grid %}',
			`${T}- one`,
			`${T}  - nested`,
			`${T}    continued`,
			`${T}- two`,
			'',
			`${T}{% badge /%}`,
			'{% /grid %}',
		].join('\n'),
	},
	'a fence is shifted as a whole and keeps its own indentation': {
		input: [
			'{% tabs %}',
			'{% tab name="JS" %}',
			'```js',
			'if (x) {',
			'  y();',
			'}',
			'```',
			'{% /tab %}',
			'{% /tabs %}',
		].join('\n'),
		expected: [
			'{% tabs %}',
			`${T}{% tab name="JS" %}`,
			`${T}\`\`\`js`,
			`${T}if (x) {`,
			`${T}  y();`,
			`${T}}`,
			`${T}\`\`\``,
			`${T}{% /tab %}`,
			'{% /tabs %}',
		].join('\n'),
	},
	'a long tag opening moves with its first line': {
		input: [
			'{% layout %}',
			'{% region name="header"',
			'   mode="prepend" %}',
			'# Title',
			'{% /region %}',
			'{% /layout %}',
		].join('\n'),
		expected: [
			'{% layout %}',
			`${T}{% region name="header"`,
			`${T}   mode="prepend" %}`,
			`${T}# Title`,
			`${T}{% /region %}`,
			'{% /layout %}',
		].join('\n'),
	},
	'a table keeps its rows': {
		input: [
			'{% card %}',
			'{% table %}',
			'* Name',
			'* Value',
			'---',
			'* a',
			'* 1',
			'{% /table %}',
			'{% /card %}',
		].join('\n'),
		expected: [
			'{% card %}',
			`${T}{% table %}`,
			`${T}* Name`,
			`${T}* Value`,
			`${T}---`,
			`${T}* a`,
			`${T}* 1`,
			`${T}{% /table %}`,
			'{% /card %}',
		].join('\n'),
	},
	'existing indentation is replaced, not added to': {
		input: [
			'{% card %}',
			'    {% hint %}',
			'        Over-indented prose.',
			'    {% /hint %}',
			'{% /card %}',
		].join('\n'),
		expected: [
			'{% card %}',
			`${T}{% hint %}`,
			`${T}Over-indented prose.`,
			`${T}{% /hint %}`,
			'{% /card %}',
		].join('\n'),
	},
	'a composition template, `each` and all': {
		input: [
			'{% card %}',
			'{% slot name="sections" each %}',
			'{% details summary=$each.heading %}',
			'{% slot /%}',
			'{% /details %}',
			'{% /slot %}',
			'{% /card %}',
		].join('\n'),
		expected: [
			'{% card %}',
			`${T}{% slot name="sections" each %}`,
			`${T}${T}{% details summary=$each.heading %}`,
			`${T}${T}${T}{% slot /%}`,
			`${T}${T}{% /details %}`,
			`${T}{% /slot %}`,
			'{% /card %}',
		].join('\n'),
	},
	'frontmatter and lines outside every tag are untouched': {
		input: '---\ntitle: T\n---\n\n  Indented prose at the top.\n\n{% hint %}\nx\n{% /hint %}\n',
		expected: '---\ntitle: T\n---\n\n  Indented prose at the top.\n\n{% hint %}\nx\n{% /hint %}\n',
	},
};

describe('`formatIndentation` applies SPEC-170 D5', () => {
	for (const [name, { input, expected }] of Object.entries(FIXTURES)) {
		it(name, () => {
			const result = formatIndentation(input);
			expect(result.refused).toBeUndefined();
			expect(result.output).toBe(expected);
			expect(result.changed).toBe(input !== expected);
		});
	}

	it('changes only leading whitespace: every line keeps every other byte', () => {
		for (const { input } of Object.values(FIXTURES)) {
			const before = input.split('\n');
			const after = formatIndentation(input).output.split('\n');
			expect(after).toHaveLength(before.length);
			after.forEach((line, i) => expect(line.trimStart()).toBe(before[i].trimStart()));
		}
	});

	it('is idempotent on every fixture', () => {
		for (const { input } of Object.values(FIXTURES)) {
			const once = formatIndentation(input).output;
			const twice = formatIndentation(once);
			expect(twice.changed).toBe(false);
			expect(twice.output).toBe(once);
		}
	});

	it('leaves blank lines exactly as they are', () => {
		const input = '{% card %}\n   \n{% hint %}\nx\n{% /hint %}\n{% /card %}\n';
		expect(formatIndentation(input).output).toBe(
			'{% card %}\n   \n\t{% hint %}\n\tx\n\t{% /hint %}\n{% /card %}\n',
		);
	});

	it('moves a whitespace-only line inside a fence with the fence, keeping the code', () => {
		const input = '{% tabs %}\n{% tab %}\n```js\nf() {\n  \n}\n```\n{% /tab %}\n{% /tabs %}\n';
		const result = formatIndentation(input);
		expect(result.refused).toBeUndefined();
		expect(result.output).toBe(
			'{% tabs %}\n\t{% tab %}\n\t```js\n\tf() {\n\t  \n\t}\n\t```\n\t{% /tab %}\n{% /tabs %}\n',
		);
	});

	it('keeps CRLF line endings', () => {
		const out = formatIndentation(
			'{% card %}\r\n{% hint %}\r\nx\r\n{% /hint %}\r\n{% /card %}\r\n',
		);
		expect(out.output).toBe(
			'{% card %}\r\n\t{% hint %}\r\n\tx\r\n\t{% /hint %}\r\n{% /card %}\r\n',
		);
	});
});

describe('the AST guard', () => {
	it('refuses a rewrite that changes the parse, naming the line, and keeps the source', () => {
		const source = '{% card %}\nText.\n{% /card %}\n\n# Heading\n';
		// Not something the layout produces: a rewrite that turns the heading
		// into a paragraph, to prove the guard rejects it.
		const result = guardRewrite(source, '{% card %}\n\tText.\n{% /card %}\n\n\\# Heading\n');
		expect(result.changed).toBe(false);
		expect(result.output).toBe(source);
		expect(result.refused?.line).toBe(5);
		expect(result.refused?.message).toMatch(/from line 5 \(a `heading`\)/);
	});

	it('accepts a rewrite that changes only indentation', () => {
		const source = '{% card %}\nText.\n{% /card %}\n';
		const result = guardRewrite(source, '{% card %}\n\tText.\n{% /card %}\n');
		expect(result).toEqual({ output: '{% card %}\n\tText.\n{% /card %}\n', changed: true });
	});
});
