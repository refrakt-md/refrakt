import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Tag } from '@markdoc/markdoc';
import { tags as coreTags, nodes, runeTagMap, defineRune } from '@refrakt-md/runes';
import { parse, findTag } from './helpers.js';
import { plan } from '../src/index.js';

/**
 * WORK-638 — the plan entity runes keep everything an author writes. Before it,
 * `milestone` dropped every `##` section and `work` / `bug` / `decision`
 * dropped any preamble node that was not a paragraph, which is what made
 * `content-unmatched` fire 800 times over this repository's `plan/`.
 */

const pluginRunes: Record<string, any> = {};
for (const [name, entry] of Object.entries(plan.runes)) {
	pluginRunes[name] = defineRune({ name, schema: entry.transform as any, aliases: entry.aliases });
}
const tags = { ...coreTags, ...runeTagMap(pluginRunes), ...Markdoc.tags };

function unmatched(source: string) {
	return Markdoc.validate(Markdoc.parse(source), {
		tags,
		nodes,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never).filter((f) => f.error.id === 'content-unmatched');
}

function text(node: unknown): string {
	if (typeof node === 'string') return node;
	if (node && typeof node === 'object' && 'children' in node) {
		return ((node as Tag).children as unknown[]).map(text).join(' ');
	}
	return '';
}

function named(root: unknown, name: string) {
	return findTag(root as any, (t) => t.attributes['data-name'] === name);
}

const PREAMBLE = `# Title

> Ref: SPEC-1

Lead paragraph.

- a list
- before the first section

\`\`\`ts
const fence = true;
\`\`\`

| a | b |
|---|---|
| 1 | 2 |

---

## Approach

In a section.`;

describe('work, bug and decision keep their preamble (WORK-638)', () => {
	for (const [rune, id] of [
		['work', 'WORK-1'],
		['bug', 'BUG-1'],
		['decision', 'ADR-1'],
	] as const) {
		const source = `{% ${rune} id="${id}" %}\n${PREAMBLE}\n{% /${rune} %}`;

		it(`${rune}: nothing in the preamble is reported as unmatched`, () => {
			expect(unmatched(source)).toEqual([]);
		});

		it(`${rune}: non-paragraph preamble content lands in the intro, in authored order`, () => {
			const out = parse(source);
			const intro = named(out, 'intro')!;
			expect(intro).toBeDefined();
			// Fences and tables come back wrapped by their core node renderers.
			const names = intro.children.map((c: any) => c.name);
			expect(names).toHaveLength(6);
			expect(names.slice(0, 3)).toEqual(['blockquote', 'p', 'ul']);
			expect(names[5]).toBe('hr');
			const all = text(intro);
			for (const piece of ['Ref: SPEC-1', 'Lead paragraph.', 'a list', 'const fence', '1']) {
				expect(all).toContain(piece);
			}
			expect(findTag(intro as any, (t) => t.name === 'table')).toBeDefined();
			// The section is still the body's, and the intro precedes it.
			const root = findTag(out as any, (t) => t.attributes['data-rune'] === rune)!;
			const order = root.children
				.filter((c: any) => c?.attributes?.['data-name'])
				.map((c: any) => c.attributes['data-name']);
			expect(order.indexOf('intro')).toBeLessThan(order.indexOf('body'));
			expect(text(named(out, 'body'))).toContain('In a section.');
		});

		it(`${rune}: lead paragraphs alone still render as the blurb, with no intro`, () => {
			const out = parse(
				`{% ${rune} id="${id}" %}\n# Title\n\nLead.\n\n## Approach\n\nX.\n{% /${rune} %}`,
			);
			expect(text(named(out, 'blurb'))).toContain('Lead.');
			expect(named(out, 'intro')).toBeUndefined();
		});
	}
});

describe('milestone keeps its sections (WORK-638)', () => {
	const source = `{% milestone name="v1.0" %}
# v1.0 — Title

Lead paragraph.

- goal one
- goal two

A note.

---

## Why

> Quoted reasoning.

### Detail

Deeper.
{% /milestone %}`;

	it('nothing is reported as unmatched', () => {
		expect(unmatched(source)).toEqual([]);
	});

	it('the goals, notes and every section render in the body, in authored order', () => {
		const out = parse(source);
		expect(text(named(out, 'blurb'))).toContain('Lead paragraph.');
		const body = named(out, 'body')!;
		expect(body.children.map((c: any) => c.name)).toEqual([
			'ul',
			'p',
			'h2',
			'blockquote',
			'h3',
			'p',
		]);
		expect(text(body)).toContain('Deeper.');
	});
});
