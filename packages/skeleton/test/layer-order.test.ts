import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import { LAYER_ORDER_DECLARATION, SKELETON_LAYER, SKIN_LAYER } from '../src/index.js';

const css = readFileSync(join(import.meta.dirname, '..', 'index.css'), 'utf-8');
const root = postcss.parse(css);

/** The at-rules in source order (the cascade-relevant statements). */
const atRules = root.nodes.filter((n): n is postcss.AtRule => n.type === 'atrule');

describe('@refrakt-md/skeleton — layer-order contract (SPEC-094 §3 / WORK-436)', () => {
	it('declares the layer order as the first statement', () => {
		// `@layer skeleton, skin;` is the keystone: declared up front, it fixes the
		// order so skin wins regardless of where layer *content* loads.
		const first = atRules[0];
		expect(first.name).toBe('layer');
		expect(first.params.replace(/\s+/g, ' ').trim()).toBe(`${SKELETON_LAYER}, ${SKIN_LAYER}`);
		// …and it has no block (it's the order declaration, not a layer body).
		expect(first.nodes).toBeUndefined();
	});

	it('orders skeleton before skin, so skin wins on equal specificity', () => {
		const order = atRules[0].params.split(',').map(s => s.trim());
		expect(order.indexOf(SKELETON_LAYER)).toBeLessThan(order.indexOf(SKIN_LAYER));
	});

	it('emits the order declaration before the skeleton layer body', () => {
		const declIdx = atRules.findIndex(r => r.name === 'layer' && r.nodes === undefined);
		const bodyIdx = atRules.findIndex(r => r.name === 'layer' && r.nodes !== undefined);
		expect(declIdx).toBe(0);
		expect(bodyIdx).toBeGreaterThan(declIdx);
	});

	it('uses no !important anywhere — layer order alone carries precedence', () => {
		let bang = false;
		root.walkDecls(d => { if (d.important) bang = true; });
		expect(bang).toBe(false);
	});

	it('exposes a matching order-declaration constant for the loader/tests', () => {
		expect(LAYER_ORDER_DECLARATION).toBe(`@layer ${SKELETON_LAYER}, ${SKIN_LAYER};`);
		// The constant matches what the stylesheet declares.
		expect(css).toContain(LAYER_ORDER_DECLARATION);
	});
});
