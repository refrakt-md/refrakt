import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { createTransform } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { tags, nodes } from '../src/index.js';
import { baseConfig } from '../src/config.js';

// SPEC-125 Phase 1 / WORK-529 — section-role corrections on core runes.
//
// `data-section` is emitted by the identity transform from `RuneConfig.sections`,
// so these run the whole pipeline (schema → serialize → engine) against the real
// `baseConfig` rather than a synthetic one. A synthetic config would test the
// engine, which already works; what was wrong was the data.

/** Transform the outermost `rune` in `src`, then return the subtree for `within`
 *  (default: the rune itself). Child runes are located *after* the transform so
 *  they keep their parent — transforming a `requiresParent` rune in isolation
 *  trips the engine's parent check. */
function identity(src: string, rune: string, within = rune): SerializedTag {
	const transformed = Markdoc.transform(Markdoc.parse(src), { tags, nodes } as never);
	const found = findTag(transformed, (t) => t.attributes?.['data-rune'] === rune);
	expect(found, `no ${rune} in output`).toBeDefined();
	const serialized = JSON.parse(JSON.stringify(found)) as SerializedTag;
	const out = createTransform(baseConfig)(serialized) as SerializedTag;
	if (within === rune) return out;
	const child = findTag(out, (t) => t.attributes?.['data-rune'] === within);
	expect(child, `no ${within} inside ${rune}`).toBeDefined();
	return child as SerializedTag;
}

function findTag(node: unknown, pred: (t: any) => boolean): any {
	if (Array.isArray(node)) {
		for (const n of node) {
			const hit = findTag(n, pred);
			if (hit) return hit;
		}
		return undefined;
	}
	if (!node || typeof node !== 'object') return undefined;
	const t = node as any;
	if (t.attributes && pred(t)) return t;
	return findTag(t.children ?? [], pred);
}

const byName = (node: unknown, name: string) =>
	findTag(node, (t) => t.attributes?.['data-name'] === name);

describe('card — the body slot is the body role', () => {
	// The content model is literally "body (optional, repeatable any block)".
	// The role was never declared, so `data-section="body"` never landed and
	// `reading`/`dropcap` were dropped in silence — the case that surfaced
	// SPEC-125 in the first place.
	it('emits data-section="body" on the body slot', () => {
		const out = identity('{% card %}\nJust the body.\n{% /card %}', 'card');
		expect(byName(out, 'body')?.attributes['data-section']).toBe('body');
	});

	it('reading now lands on the card body', () => {
		const out = identity('{% card reading="prose" %}\nJust the body.\n{% /card %}', 'card');
		const body = byName(out, 'body');
		expect(body?.attributes['data-section']).toBe('body');
		expect(body?.attributes['data-reading']).toBe('prose');
	});

	it('dropcap now lands on the card body', () => {
		const out = identity('{% card reading="prose" dropcap=true %}\nJust the body.\n{% /card %}', 'card');
		expect(byName(out, 'body')?.attributes['data-dropcap']).toBe('true');
	});

	it('leaves the title unroled — it is nested inside the body slot', () => {
		// Card's leading heading is a child of the body div, not a sibling. A
		// `title` role would nest a section inside a section and resize every card
		// heading through `--rf-title-size`; the correction is the body role only.
		const out = identity('{% card %}\n## Heading\n\nProse.\n{% /card %}', 'card');
		const title = byName(out, 'title');
		expect(title).toBeDefined();
		expect(title?.attributes['data-section']).toBeUndefined();
	});

	it('leaves the media role alone', () => {
		const out = identity('{% card %}\n![alt](/i.png)\n\n---\n\nBody.\n{% /card %}', 'card');
		expect(byName(out, 'media')?.attributes['data-section']).toBe('media');
	});
});

describe('accordion-item — the answer panel is the body role', () => {
	const src = '{% accordion %}\n## Question?\n\nThe answer.\n{% /accordion %}';

	it('emits data-section="body" on the answer panel', () => {
		const out = identity(src, 'accordion', 'accordion-item');
		expect(byName(out, 'body')?.attributes['data-section']).toBe('body');
	});

	it('reading lands on the answer panel', () => {
		const out = identity(
			'{% accordion %}\n{% accordion-item name="Q" reading="prose" %}\nThe answer.\n{% /accordion-item %}\n{% /accordion %}',
			'accordion',
			'accordion-item',
		);
		const body = byName(out, 'body');
		expect(body?.attributes['data-section']).toBe('body');
		expect(body?.attributes['data-reading']).toBe('prose');
	});

	it('declares no header-ish role on the summary', () => {
		// Deliberate, not an omission. The `header` slot is the `<summary>`
		// disclosure control: the `header` role carries the chrome-row rhythm
		// (a 3rem bottom margin under every summary), and a `title` role would
		// tighten every summary's line-height while leaving `prominence` inert,
		// since the skin pins the control's font size on purpose.
		const out = identity(src, 'accordion', 'accordion-item');
		const header = byName(out, 'header');
		expect(header).toBeDefined();
		expect(header?.attributes['data-section']).toBeUndefined();
	});
});
