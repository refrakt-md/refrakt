import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { RuneConfig, ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

/**
 * WORK-583 (ADR-030 rule 3) — a numbered sequence's ordinal is a node, not a
 * CSS counter: real text a reader can copy, assistive technology reads in
 * order, and a layout can address by name.
 */

function render(
	sequence: RuneConfig['sequence'],
	items: SerializedTag[],
	olAttrs: Record<string, string> = {},
): SerializedTag {
	const config: ThemeConfig = {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {},
		runes: { List: { block: 'list', sequence }, Item: { block: 'item' } },
	};
	const tree = makeTag('section', { 'data-rune': 'list' }, [
		makeTag('ol', { 'data-name': 'items', ...olAttrs }, items),
	]);
	const out = createTransform(config)(tree) as SerializedTag;
	return out.children.find((c) => (c as SerializedTag)?.name === 'ol') as SerializedTag;
}

const li = (text: string, fields?: Record<string, unknown>) =>
	makeTag('li', fields ? { 'data-rune-fields': JSON.stringify(fields) } : {}, [text]);
const ordinals = (ol: SerializedTag) =>
	ol.children.map((item) => {
		const first = (item as SerializedTag).children[0] as SerializedTag;
		return first?.attributes?.['data-name'] === 'ordinal' ? first.children[0] : undefined;
	});

describe('a numbered sequence emits its ordinals as nodes (WORK-583)', () => {
	it('puts the number first in each item, as text', () => {
		const ol = render('numbered', [li('one'), li('two'), li('three')]);
		expect(ordinals(ol)).toEqual(['1', '2', '3']);
		const [ordinal] = (ol.children[0] as SerializedTag).children as SerializedTag[];
		expect(ordinal.name).toBe('span');
		// Named, and classed by the BEM pass that follows: once, by the block it
		// sits in.
		expect(ordinal.attributes.class).toBe('rf-list__ordinal');
		expect(ordinal.attributes['data-meta-type']).toBe('quantity');
	});

	it('gives an item rune its ordinal as its own part, before the item is transformed', () => {
		const item = makeTag('li', { 'data-rune': 'item' }, ['one']);
		const ol = render('numbered', [item]);
		const [ordinal] = (ol.children[0] as SerializedTag).children as SerializedTag[];
		// The item's own BEM pass named it, so its layout tree can place it too.
		expect(ordinal.attributes.class).toBe('rf-item__ordinal');
	});

	it('lets an item’s own position win, and counts on from it', () => {
		const ol = render('numbered', [li('a'), li('b', { position: '7' }), li('c')]);
		expect(ordinals(ol)).toEqual(['1', '7', '8']);
	});

	it('starts at the list’s `start`', () => {
		const ol = render('numbered', [li('a'), li('b')], { start: '4' });
		expect(ordinals(ol)).toEqual(['4', '5']);
	});

	it('gives a `connected` or `plain` sequence no ordinal', () => {
		expect(ordinals(render('connected', [li('a'), li('b')]))).toEqual([undefined, undefined]);
		expect(ordinals(render('plain', [li('a'), li('b')]))).toEqual([undefined, undefined]);
	});
});
