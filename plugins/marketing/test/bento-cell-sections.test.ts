import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as marketingConfig } from '../src/config.js';

// SPEC-125 Phase 1 / WORK-529 — BentoCell appears in both directions of the
// audit: it declared neither the `body` role nor a header-ish one, though its
// layout has a `title` slot and a `body` slot side by side.

const themeConfig: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: marketingConfig,
};

/** Transform the whole bento (the cell requires its parent), then return the
 *  first transformed cell. */
function identityCell(content: string): SerializedTag {
	const bento = findTag(parse(content) as any, (t) => t.attributes['data-rune'] === 'bento');
	expect(bento).toBeDefined();
	const serialized = JSON.parse(JSON.stringify(bento)) as SerializedTag;
	const out = createTransform(themeConfig)(serialized) as SerializedTag;
	const cell = findByAttr(out, 'data-rune', 'bento-cell');
	expect(cell, 'no bento-cell in transformed output').toBeDefined();
	return cell;
}

function findByAttr(node: any, attr: string, value: string): any {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.[attr] === value) return node;
	for (const c of node.children ?? []) {
		const hit = findByAttr(c, attr, value);
		if (hit) return hit;
	}
	return undefined;
}

const byName = (node: any, name: string) => findByAttr(node, 'data-name', name);

const titled = `{% bento %}
{% bento-cell %}
### Cell title

Cell body text.
{% /bento-cell %}
{% /bento %}`;

describe('bento-cell section roles', () => {
	it('emits data-section="body" on the body slot', () => {
		const cell = identityCell(titled);
		expect(byName(cell, 'body')?.attributes['data-section']).toBe('body');
	});

	it('emits data-section="title" on the title slot', () => {
		// Unlike card, the cell's heading is a *sibling* of the body slot, so the
		// title role is a peer section rather than one nested inside another.
		const cell = identityCell(titled);
		expect(byName(cell, 'title')?.attributes['data-section']).toBe('title');
	});

	it('reading and dropcap now land on the cell body', () => {
		const cell = identityCell(`{% bento %}
{% bento-cell reading="prose" dropcap=true %}
Cell body text.
{% /bento-cell %}
{% /bento %}`);
		const body = byName(cell, 'body');
		expect(body?.attributes['data-reading']).toBe('prose');
		expect(body?.attributes['data-dropcap']).toBe('true');
	});

	it('prominence is now accepted rather than dropped with a warning', () => {
		// The title role is what makes the cell a page-section-header family rune.
		// (Lumina pins `.rf-bento-cell__title`'s font size, so the axis has no
		// visible effect under that skin — a skin gap, not a config one.)
		const cell = identityCell(`{% bento %}
{% bento-cell prominence="display" %}
### Cell title

Cell body text.
{% /bento-cell %}
{% /bento %}`);
		expect(cell.attributes['data-prominence']).toBe('display');
	});

	it('leaves the media role alone', () => {
		const cell = identityCell(`{% bento %}
{% bento-cell %}
![alt](/i.png)

---

Cell body text.
{% /bento-cell %}
{% /bento %}`);
		expect(byName(cell, 'media')?.attributes['data-section']).toBe('media');
	});
});
