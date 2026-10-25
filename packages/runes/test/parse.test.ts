import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import { parse } from '../src/index.js';

/**
 * SPEC-170 D1 / WORK-645 — one shared `parse`, with indentation allowed.
 */

const ROOT = resolve(__dirname, '../../..');

/** An AST's content, without source positions: an indented line starts at a
 *  different column, and that is the only thing that should differ. */
function shape(node: Node): unknown {
	return {
		type: node.type,
		tag: node.tag,
		inline: node.inline,
		attributes: node.attributes,
		children: node.children.map(shape),
	};
}

/** A template with every construct SPEC-170 names, written flat. */
const FLAT = `{% card %}
## Title

Intro with **bold** text.

---

- one
- two
  - nested

{% hint type="note" %}
Inside the hint.

{% details summary="More" %}
Two levels down.
{% /details %}
{% /hint %}

\`\`\`js
if (x) {
  y();
}
\`\`\`
{% /card %}
`;

/** The same template indented by SPEC-170 D5: the content of a tag that holds
 *  another block tag is indented one level per tag. */
function indented(unit: string): string {
	// `card` and `hint` hold block tags, so their content is indented; `details`
	// holds none, so its content stays at the tag's own level.
	const indents = /^\{% \/?(card|hint)\b/;
	let depth = 0;
	return FLAT.split('\n')
		.map((line) => {
			const closes = /^\{% \//.test(line) && indents.test(line);
			if (closes) depth--;
			const out = line === '' ? line : unit.repeat(depth) + line;
			if (!closes && indents.test(line)) depth++;
			return out;
		})
		.join('\n');
}

describe('the shared `parse` (SPEC-170 D1)', () => {
	it('parses a template indented with tabs to the same AST as the flat one', () => {
		const source = indented('\t');
		expect(source).toContain('\t\tTwo levels down.');
		expect(shape(parse(source))).toEqual(shape(parse(FLAT)));
	});

	it('parses one indented with four spaces to the same AST', () => {
		expect(shape(parse(indented('    ')))).toEqual(shape(parse(FLAT)));
	});

	it('keeps a fence’s relative indentation', () => {
		const fence = [...parse(indented('\t')).walk()].find((n) => n.type === 'fence');
		expect(fence?.attributes.content).toBe('if (x) {\n  y();\n}\n');
	});

	it('differs from plain `Markdoc.parse` exactly where indentation used to make code', () => {
		const source = indented('\t');
		const types = (ast: Node) => [...ast.walk()].map((n) => n.type);
		// Markdoc's default reads the indented lines as an indented code block.
		expect(types(Markdoc.parse(source))).toContain('code');
		expect(types(parse(source))).not.toContain('code');
		// Unindented, the two agree.
		expect(shape(parse(FLAT))).toEqual(shape(Markdoc.parse(FLAT)));
	});
});

describe('every parse site uses it', () => {
	it('has no direct `Markdoc.parse` call in package or plugin source', () => {
		// The shared function is the one allowed site. A direct call parses
		// without indentation, so that page would render one way and validate,
		// preview or lint another.
		const out = execSync(
			`git grep -nE "[Mm]arkdoc\\)?\\.parse\\(" -- 'packages/*/src/**' 'packages/*/app/src/**' 'plugins/*/src/**' ':!packages/runes/src/parse.ts' || true`,
			{ cwd: ROOT, encoding: 'utf-8' },
		)
			.split('\n')
			.filter(Boolean)
			// Prose naming it in a comment is not a call.
			.filter((line) => !/^[^:]+:\d+:\s*(\*|\/\/)/.test(line));
		expect(out).toEqual([]);
	});
});
