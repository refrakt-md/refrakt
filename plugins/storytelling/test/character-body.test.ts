import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, findTag } from './helpers.js';

// BUG-003 — prose written directly inside `{% character %}` was resolved by the
// content model and then dropped: the greedy field was named `header` and
// `transform` never read it, so the body slot rendered as an empty
// `<div data-name="body">`. `Realm` and `Faction` — the two runes that share
// Character's exact shape — handled the same content correctly, which is what
// made it a bug rather than a design choice.
//
// The tests below use the sibling runes as controls, so a regression on any of
// the three shows up as a difference between them rather than as three separate
// assertions that could rot independently.

/** All the text in a rendered tree, flattened. */
function text(node: unknown): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(text).join('');
	if (Markdoc.Tag.isTag(node)) return text(node.children);
	return '';
}

/** The rune's *own* body slot, not a descendant rune's.
 *
 *  `character-section` has a body slot of its own, so an unscoped search finds
 *  a section's body on a character that has no prose — which would make the
 *  "no prose, no slot" case pass against the wrong node. */
function ownBody(root: Markdoc.Tag): Markdoc.Tag | undefined {
	const walk = (node: unknown): Markdoc.Tag | undefined => {
		if (!Markdoc.Tag.isTag(node)) return undefined;
		if (node.attributes['data-name'] === 'body') return node;
		for (const child of node.children) {
			if (Markdoc.Tag.isTag(child) && child.attributes['data-rune']) continue; // a nested rune owns its own slots
			const found = walk(child);
			if (found) return found;
		}
		return undefined;
	};
	for (const child of root.children) {
		const found = walk(child);
		if (found) return found;
	}
	return undefined;
}

const bodyOf = (rune: string, src: string) => {
	const root = findTag(parse(src) as never, (t) => t.attributes['data-rune'] === rune);
	expect(root, `no ${rune} in output`).toBeDefined();
	return ownBody(root!);
};

describe('prose written directly in a character body', () => {
	it('renders, as it does on realm and faction', () => {
		const body = bodyOf('character', `{% character name="Veshra" %}
Prose about Veshra.
{% /character %}`);
		expect(body, 'character emitted no body slot').toBeDefined();
		expect(text(body)).toContain('Prose about Veshra.');
	});

	it('matches its siblings on identical markup', () => {
		// The control. All three take a name and a paragraph and should put that
		// paragraph in their body.
		for (const [rune, src] of [
			['realm', '{% realm name="North" %}\nShared prose.\n{% /realm %}'],
			['faction', '{% faction name="Guild" %}\nShared prose.\n{% /faction %}'],
			['character', '{% character name="Veshra" %}\nShared prose.\n{% /character %}'],
		] as const) {
			expect(text(bodyOf(rune, src)), `${rune} dropped its prose`).toContain('Shared prose.');
		}
	});

	it('keeps lead prose *and* sections, which previously excluded each other', () => {
		// The second half of the defect: the body was built only when
		// `hasSections` was false, so even the items path could not produce lead
		// prose alongside sections.
		const src = `{% character name="Veshra" %}
Lead prose.

## History

She was born in the north.
{% /character %}`;
		const root = findTag(parse(src) as never, (t) => t.attributes['data-rune'] === 'character')!;
		expect(text(bodyOf('character', src))).toContain('Lead prose.');

		const sections = findTag(root, (t) => t.attributes['data-rune'] === 'character-section');
		expect(sections, 'the section is gone').toBeDefined();
		expect(text(sections)).toContain('She was born in the north.');
	});

	it('emits no body slot when there is no prose', () => {
		// The slot is conditional, like Realm's — an empty `<div data-name="body">`
		// on every section-only character is what made the defect invisible.
		const body = bodyOf('character', `{% character name="Veshra" %}
## History

She was born in the north.
{% /character %}`);
		expect(body).toBeUndefined();
	});

	it('still resolves a portrait alongside the prose', () => {
		// The portrait is the field before the prose in the content model, so a
		// mistake in the field order would show up as one swallowing the other.
		const src = `{% character name="Veshra" %}
![Veshra](/veshra.png)

Prose about Veshra.
{% /character %}`;
		const root = findTag(parse(src) as never, (t) => t.attributes['data-rune'] === 'character')!;
		expect(findTag(root, (t) => t.name === 'img'), 'portrait lost').toBeDefined();
		expect(text(bodyOf('character', src))).toContain('Prose about Veshra.');
	});
});
