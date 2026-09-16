import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse } from './helpers.js';
import { collectJsonLd } from '../src/index.js';

/**
 * The RDFa shape `accordion` depends on — WORK-570.
 *
 * `recipe` and `how-to` carry the same constraint and are covered in
 * `plugins/learning/test/rdfa-text-wrapper.test.ts`, where their tags resolve.
 *
 * The obvious cleanup is to delete the `<div property="text">` wrapper and teach
 * `collectJsonLd` to read a typed node's own text. **It would break the page.**
 *
 * RDFa Core 1.1 §7.5 step 11 resolves a property's object as `@content` →
 * literal; else `@typeof` present and `@about` absent → *the typed resource*;
 * else a plain literal from the text. So an element carrying both `property` and
 * `typeof` has its object fixed to the typed resource and its own text is
 * unreachable as a literal:
 *
 * ```html
 * <div typeof="Answer" property="acceptedAnswer"><div property="text">…</div></div>
 * ```
 *
 * expresses `_:q acceptedAnswer _:a . _:a a Answer . _:a text "…"`. Without the
 * inner element the third triple is gone — while `collectJsonLd`, which is not a
 * conformant distiller, would go on emitting it. SPEC-082 renders the SEO
 * carriers inline, so refrakt publishes RDFa *and* JSON-LD on the same page, and
 * the two would assert different graphs on every accordion, recipe and how-to.
 *
 * The prose above is a comment and will not run. This is the argument in a form
 * that does, because the reasoning is short enough that someone will re-derive
 * it and reach for the simplification again.
 */

const { Tag } = Markdoc;

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

const ACCORDION = `{% accordion %}
## What is refrakt?

A content framework.
{% /accordion %}`;

const FIXTURES: Array<[string, string]> = [['accordion', ACCORDION]];

describe('a typed property node always carries its text on an inner element', () => {
	for (const [name, content] of FIXTURES) {
		it(`holds for ${name}`, () => {
			const tree = parse(content);
			const typed = typedProperties(tree);
			expect(typed.length, `${name} emitted no typed property node`).toBeGreaterThan(0);

			for (const node of typed) {
				// Anything whose value is `@content` is already a literal and needs no
				// carrier — that is the first branch of step 11.
				if (node.attributes?.content !== undefined) continue;
				const carriers = carrierProperties(node);
				expect(
					carriers.length,
					`<${node.name} property="${node.attributes?.property}" typeof="${node.attributes?.typeof}"> ` +
						'has no inner property carrier, so its text is unreachable in RDFa',
				).toBeGreaterThan(0);
			}
		});
	}

	it('is a real constraint, not a tautology', () => {
		// The shape the check rejects, built by hand: without this the assertions
		// above would pass on a tree that never had a wrapper to lose.
		const bare = new Tag('div', { property: 'acceptedAnswer', typeof: 'Answer' }, [
			'An answer.',
		] as never);
		const [node] = typedProperties(bare);
		expect(node).toBeTruthy();
		expect(carrierProperties(node)).toEqual([]);
	});
});

describe('the wrapper carries the value into both channels', () => {
	it('publishes the answer text, and would not without the wrapper', () => {
		const graph = collectJsonLd(parse(ACCORDION) as never) as Record<string, any>[];
		const faq = graph.find((e) => e['@type'] === 'FAQPage');
		expect(faq?.mainEntity.acceptedAnswer.text).toContain('content framework');
	});
});

describe('schema="none" strips the applier\'s wrapper too (WORK-552)', () => {
	const content = `{% accordion schema="none" %}
## Not a question

Just a definition.
{% /accordion %}`;

	it('emits no structured data at all', () => {
		expect(collectJsonLd(parse(content) as never)).toEqual([]);
	});

	it('leaves no typed node and no orphan text carrier behind', () => {
		// The suppression has to reach the wrapper the applier now emits, not only
		// the types: a `<div property="text">` with nothing above it would be an
		// assertion about nothing.
		const tree = JSON.stringify(parse(content));
		expect(tree).not.toContain('"typeof"');
		expect(tree).not.toContain('"property"');
	});
});
