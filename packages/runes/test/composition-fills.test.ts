import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { RuneConfig } from '@refrakt-md/transform';
import {
	tags as coreTags,
	nodes as coreNodes,
	baseConfig,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	defineComposedRune,
	serializeTree,
	type ComposedRune,
} from '../src/index.js';
import { resolveSequence } from '../src/lib/resolver.js';
import { CompositionError } from '../src/lib/composition-errors.js';

/**
 * SPEC-182 / WORK-686 — a paragraph is reinterpreted into a rune's own values:
 * a paragraph field takes an item model (D1, D3), and `fills` the rune's
 * declared attributes (D2), the author's attribute winning (D4), placed into
 * values rather than by a slot (D5).
 */

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

const BYLINE = `---
tag: figure
attributes:
  author: { type: string }
  role:   { type: string }
content:
  type: sequence
  fields:
    quote: { match: blockquote }
    attribution:
      match: paragraph
      optional: true
      itemModel:
        fields:
          - { name: name, match: strong }
          - { name: role, match: text, pattern: '^\\s*[-–—,]\\s*(.+)$', optional: true }
      fills: { author: $name, role: $role }
metaFields:
  author: { tag: cite, condition: author }
  role:   { condition: role }
blocks:
  byline: { fields: [author, role], layout: lead }
---

{% section %}
{% slot name="quote" /%}

{% metablock name="byline" /%}
{% /section %}
`;

const quote = defineComposedRune('quote-card', BYLINE);

function config(extra: Record<string, ComposedRune>) {
	const own: Record<string, Schema> = {};
	for (const [name, c] of Object.entries(extra)) own[name] = c.rune.schema;
	return {
		tags: declareSlotMarkers({ ...coreTags, ...own } as Record<string, Schema>),
		nodes: declareSlotMarkersOnNodes(coreNodes as Record<string, Schema>),
		variables: { generatedIds: new Set<string>(), path: '/t', headings: [] },
	};
}

function render(source: string): Json {
	const tree = serializeTree(
		Markdoc.transform(Markdoc.parse(source), config({ 'quote-card': quote }) as never),
	);
	const pluginRunes: Record<string, RuneConfig> = { [quote.typeName]: quote.config };
	const { config: theme } = assembleThemeConfig({ coreConfig: baseConfig, pluginRunes });
	return createTransform(theme)(tree as never);
}

function validate(source: string) {
	return Markdoc.validate(Markdoc.parse(source), config({ 'quote-card': quote }) as never).map(
		(e) => e.error,
	);
}

function find(node: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] {
	if (Array.isArray(node)) {
		for (const c of node) find(c, pred, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (pred(node)) out.push(node);
	for (const c of node.children ?? []) find(c, pred, out);
	return out;
}
const text = (n: Json): string =>
	typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : text(n?.children ?? []);
const byline = (tree: Json) =>
	find(tree, (n) => n.attributes?.['data-name'] === 'byline')[0]?.children.filter(
		(c: Json) => c && typeof c === 'object',
	) ?? [];

const PARAGRAPH = '{% quote-card %}\n> Quote.\n\n**Ada Lovelace** — Analyst\n{% /quote-card %}';
const ATTRIBUTES =
	'{% quote-card author="Ada Lovelace" role="Analyst" %}\n> Quote.\n{% /quote-card %}';

describe('a paragraph field takes an item model (D1, D3)', () => {
	const fields = [
		{
			name: 'attribution',
			match: 'paragraph',
			optional: true,
			itemModel: {
				fields: [
					{ name: 'name', match: 'strong' },
					{ name: 'role', match: 'text', pattern: /^\s*[-–—,]\s*(.+)$/, optional: true },
				],
			},
		},
		{ name: 'body', match: 'paragraph', optional: true, greedy: true },
	];
	const children = (src: string) => Markdoc.parse(src).children;

	it('resolves one record from the paragraph', () => {
		const resolved = resolveSequence(children('**Ada Lovelace** — Analyst'), fields as never);
		expect(resolved.attributionData).toEqual({ name: 'Ada Lovelace', role: 'Analyst' });
	});

	it('leaves a paragraph without its required fields for the next field', () => {
		const resolved = resolveSequence(children('Just prose.'), fields as never);
		expect(resolved.attribution).toBeUndefined();
		expect(resolved.body).toHaveLength(1);
	});
});

describe('`fills` supplies the rune’s own attributes (D2, D4)', () => {
	it('renders the byline from the paragraph exactly as from the attributes', () => {
		const a = byline(render(PARAGRAPH));
		const b = byline(render(ATTRIBUTES));
		expect(a.map(text)).toEqual(['Ada Lovelace', 'Analyst']);
		expect(a).toEqual(b);
	});

	it('puts the filled values in the field bag, where the attribute would be', () => {
		const [root] = find(render(PARAGRAPH), (n) => n.attributes?.['data-rune'] === 'quote-card');
		expect(root.attributes['data-author']).toBe('Ada Lovelace');
		expect(root.attributes['data-role']).toBe('Analyst');
	});

	it('does not render the paragraph it consumed', () => {
		expect(text(render(PARAGRAPH))).not.toContain('— Analyst');
	});

	it('lets the author’s attribute win, and warns that the paragraph went unused', () => {
		const src =
			'{% quote-card author="Grace Hopper" %}\n> Quote.\n\n**Ada Lovelace** — Analyst\n{% /quote-card %}';
		const names = byline(render(src)).map(text);
		expect(names[0]).toBe('Grace Hopper');
		// Only the written attribute wins; the paragraph still fills the role.
		expect(names[1]).toBe('Analyst');
		const warnings = validate(src).filter((e) => e.id === 'fill-overridden');
		expect(warnings).toHaveLength(1);
		expect(warnings[0].level).toBe('warning');
		expect(warnings[0].message).toContain('`author`');
	});

	it('reports nothing for either form written alone', () => {
		for (const src of [PARAGRAPH, ATTRIBUTES]) {
			expect(validate(src).filter((e) => e.level !== 'info')).toEqual([]);
		}
	});
});

describe('what a definition cannot declare (D2, D5)', () => {
	const fail = (source: string): CompositionError => {
		try {
			defineComposedRune('bad-fill', source);
		} catch (e) {
			return e as CompositionError;
		}
		throw new Error('expected the definition to be rejected');
	};

	it('rejects filling an undeclared attribute, naming it', () => {
		const e = fail(BYLINE.replace('  role:   { type: string }\n', ''));
		expect(e.code).toBe('fills-invalid');
		expect(e.message).toContain('`role`');
	});

	it('rejects a reference to no field of the item model', () => {
		const e = fail(BYLINE.replace('role: $role }', 'role: $title }'));
		expect(e.code).toBe('fills-invalid');
		expect(e.message).toContain('$title');
	});

	it('counts a filling field as placed, and rejects a slot placing it too', () => {
		expect(() => defineComposedRune('fine-fill', BYLINE)).not.toThrow();
		const e = fail(
			BYLINE.replace(
				'{% slot name="quote" /%}',
				'{% slot name="quote" /%}\n\n{% slot name="attribution" /%}',
			),
		);
		expect(e.code).toBe('fill-placed');
	});
});
