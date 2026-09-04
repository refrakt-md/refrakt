import { describe, it, expect } from 'vitest';
import { ORDERED_FACETS, FACET_ATTRIBUTES, UNIVERSAL_AXIS_FACETS } from '../../src/facets/index.js';
import { createTransform } from '../../src/engine.js';
import { makeTag } from '../../src/helpers.js';
import type { ThemeConfig } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

describe('facet registry', () => {
	it('orders every facet after the ones it declares', () => {
		const names = ORDERED_FACETS.map(f => f.name);
		for (const facet of ORDERED_FACETS) {
			for (const dep of facet.after ?? []) {
				expect(names.indexOf(dep)).toBeGreaterThanOrEqual(0);
				expect(names.indexOf(dep)).toBeLessThan(names.indexOf(facet.name));
			}
		}
	});

	it('has no duplicate names', () => {
		const names = ORDERED_FACETS.map(f => f.name);
		expect(new Set(names).size).toBe(names.length);
	});
});

describe('UNIVERSAL_AXIS_FACETS', () => {
	// The three config-modifier facets describe themselves through
	// `DESCRIBABLE_FACETS` instead — their output is already in the contract's
	// `modifiers` / `contextModifiers` / `staticModifiers` sections.
	const CONFIG_MODIFIER_FACETS = ['modifiers', 'context-modifiers', 'static-modifiers'];

	// This is the drift the list can still have: adding a facet to the registry
	// and forgetting to describe it puts an axis back in the blind spot
	// WORK-527 closed.
	it('describes every registered facet that is not a config-modifier facet', () => {
		const described = new Set(UNIVERSAL_AXIS_FACETS.map(f => f.axis));
		const expected = ORDERED_FACETS
			.map(f => f.name)
			.filter(name => !CONFIG_MODIFIER_FACETS.includes(name));
		for (const name of expected) {
			expect(described, `facet "${name}" has no UniversalAxisFacet`).toContain(name);
		}
	});

	it('describes nothing that is not a registered facet', () => {
		const registered = new Set(ORDERED_FACETS.map(f => f.name));
		for (const axis of UNIVERSAL_AXIS_FACETS.map(f => f.axis)) {
			expect(registered, `axis "${axis}" has no facet`).toContain(axis);
		}
	});

	// Emission order is part of the output: `content-place` and `cover` both
	// write `--cover-scrim-dir`, and the later declaration wins in CSS. A
	// contract that listed them the other way round would read as a lie.
	it('lists the axes in registry order', () => {
		const registryOrder = ORDERED_FACETS
			.map(f => f.name)
			.filter(name => !CONFIG_MODIFIER_FACETS.includes(name));
		expect(UNIVERSAL_AXIS_FACETS.map(f => f.axis)).toEqual(registryOrder);
	});
});

describe('FACET_ATTRIBUTES', () => {
	// Derived from the registry, not hand-maintained in the engine — adding an
	// axis with a fixed attribute name is a file plus a registry entry.
	it('is the union of every facet’s declared attributes', () => {
		const declared = ORDERED_FACETS.flatMap(f => [...(f.attributes ?? [])]);
		expect([...FACET_ATTRIBUTES].sort()).toEqual([...new Set(declared)].sort());
	});

	it('covers the axes whose attributes the transform consumes', () => {
		for (const attr of ['width', 'spacing', 'inset', 'elevation', 'prominence', 'reveal', 'stagger', 'density']) {
			expect(FACET_ATTRIBUTES.has(attr)).toBe(true);
		}
	});

	// Pinned deliberately: `reading` and `dropcap` reach the rendered element
	// today, unlike every other axis attribute. Preserved by WORK-526 rather
	// than quietly changed — the asymmetry looks like an oversight, but fixing
	// it is a behaviour change and belongs in its own item.
	it('excludes reading and dropcap, which currently pass through', () => {
		expect(FACET_ATTRIBUTES.has('reading')).toBe(false);
		expect(FACET_ATTRIBUTES.has('dropcap')).toBe(false);
	});
});

describe('pass-through attributes', () => {
	const config: ThemeConfig = {
		prefix: 'rf', tokenPrefix: '--rf', icons: {},
		runes: { Card: { block: 'card', sections: { body: 'body' }, modifiers: { tone: { source: 'attribute' } } } },
	};
	const transform = createTransform(config);
	const render = (attrs: Record<string, any>) =>
		transform(makeTag('div', { 'data-rune': 'card', ...attrs }, [])) as SerializedTag;

	it('strips every registry-owned attribute', () => {
		for (const attr of FACET_ATTRIBUTES) {
			expect(render({ [attr]: 'x' }).attributes).not.toHaveProperty(attr);
		}
	});

	it('strips an attribute-sourced config modifier', () => {
		expect(render({ tone: 'warm' }).attributes).not.toHaveProperty('tone');
	});

	it('strips the internal field channels', () => {
		const out = render({});
		expect(out.attributes).not.toHaveProperty('data-rune-fields');
	});

	it('passes an unrecognised author attribute through untouched', () => {
		expect(render({ 'data-analytics': 'hero-cta' }).attributes['data-analytics']).toBe('hero-cta');
	});

	it('strips a facet attribute even when the facet resolved to nothing', () => {
		// `width="content"` is suppressed — no axis, no class — but must still
		// not reach the element. This is why the declaration is static.
		const out = render({ width: 'content' });
		expect(out.attributes).not.toHaveProperty('width');
		expect(out.attributes['data-width']).toBeUndefined();
	});
});
