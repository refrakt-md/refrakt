import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';

/**
 * The RDFa shape `recipe` and `how-to` depend on — WORK-570.
 *
 * The full argument, and the same check over `accordion`, live in
 * `packages/runes/test/rdfa-text-wrapper.test.ts`. In short: RDFa Core 1.1 §7.5
 * step 11 fixes a property's object to the typed resource when an element
 * carries both `property` and `typeof`, so its own text is unreachable as a
 * literal and needs an inner carrier. Deleting the wrapper looks like a
 * simplification and silently changes what the page asserts.
 *
 * These two are here rather than beside it because their tags only resolve with
 * the learning plugin loaded.
 */

interface Node {
	name?: string;
	attributes?: Record<string, unknown>;
	children?: unknown[];
}

/** Every element carrying both `property` and `typeof`, anywhere in a tree. */
function typedProperties(node: unknown, out: Node[] = []): Node[] {
	if (Array.isArray(node)) {
		for (const c of node) typedProperties(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	const tag = node as Node;
	const attrs = tag.attributes ?? {};
	if (attrs.property !== undefined && attrs.typeof !== undefined) out.push(tag);
	for (const c of tag.children ?? []) typedProperties(c, out);
	return out;
}

/** The `property` names carried by a node's own children, one level down. */
const carrierProperties = (node: Node): string[] =>
	(node.children ?? [])
		.map((c) => (c as Node)?.attributes?.property)
		.filter((p): p is string => typeof p === 'string');

const FIXTURES: Array<[string, string]> = [
	[
		'recipe',
		// The canonical content model: a bare unordered list becomes the
		// ingredients and a bare ordered list the instructions. Headings would
		// silently produce neither, and the assertions would pass on an empty tree.
		`{% recipe prepTime="PT15M" %}
# Bread

- Flour
- Water

1. Mix.
2. Bake.
{% /recipe %}`,
	],
	[
		'how-to',
		`{% howto %}
# Change a tyre

- Jack

1. Loosen the nuts.
2. Lift the car.
{% /howto %}`,
	],
];

describe('a typed property node always carries its text on an inner element', () => {
	for (const [name, content] of FIXTURES) {
		it(`holds for ${name}`, () => {
			const typed = typedProperties(parse(content));
			expect(typed.length, `${name} emitted no typed property node`).toBeGreaterThan(0);

			for (const node of typed) {
				// Anything whose value is `@content` is already a literal and needs no
				// carrier — that is the first branch of step 11.
				if (node.attributes?.content !== undefined) continue;
				expect(
					carrierProperties(node).length,
					`<${node.name} property="${node.attributes?.property}" typeof="${node.attributes?.typeof}"> ` +
						'has no inner property carrier, so its text is unreachable in RDFa',
				).toBeGreaterThan(0);
			}
		});
	}

	it('wraps an `<li>` in a `<p>`, matching what the rune rendered', () => {
		// `textTag` is a rendering choice, not a schema one: a `<div>` inside an
		// `<li>` would change the page's margins. WORK-570's bar is that the HTML
		// does not move.
		for (const [, content] of FIXTURES) {
			const steps = typedProperties(parse(content)).filter(
				(n) => n.attributes?.typeof === 'HowToStep',
			);
			expect(steps.length).toBeGreaterThan(0);
			for (const step of steps) {
				expect((step.children?.[0] as Node)?.name).toBe('p');
			}
		}
	});

	it('leaves an untyped property node unwrapped', () => {
		// `recipe`'s ingredients are the control: no `typeof`, so nothing fixes
		// their object and their text is readable directly. A wrapper there would
		// be noise, and its absence is what makes the rule above a rule rather
		// than "wrap everything".
		const tree = parse(FIXTURES[0][1]);
		const ingredients = allNodes(tree).filter((n) => n.attributes?.property === 'recipeIngredient');
		expect(ingredients.length).toBeGreaterThan(0);
		for (const li of ingredients) {
			expect(li.attributes?.typeof).toBeUndefined();
			expect(carrierProperties(li)).toEqual([]);
		}
	});
});

/** Every tag in a tree, flat. */
function allNodes(node: unknown, out: Node[] = []): Node[] {
	if (Array.isArray(node)) {
		for (const c of node) allNodes(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	out.push(node as Node);
	for (const c of (node as Node).children ?? []) allNodes(c, out);
	return out;
}
