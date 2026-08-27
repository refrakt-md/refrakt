import { describe, it, expect } from 'vitest';
import { modifiersFacet, contextModifiersFacet, staticModifiersFacet } from '../../src/facets/modifiers.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetTheme } from '../../src/facets/types.js';
import type { RuneConfig } from '../../src/types.js';

const THEME: FacetTheme = { tints: {}, backgrounds: {}, frames: {} };

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

const ctx = (
	config: RuneConfig,
	attrs: Record<string, any> = {},
	metas: Array<[string, string]> = [],
	extra: Partial<FacetContext> = {},
): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'card', ...attrs }, metas.map(([f, c]) => meta(f, c))),
	config,
	block: 'rf-card',
	rune: 'card',
	fields: {},
	theme: THEME,
	axis: () => undefined,
	...extra,
});

describe('modifiers facet', () => {
	it('contributes nothing when the rune declares none', () => {
		expect(modifiersFacet.resolve(ctx({ block: 'card' }))).toBeNull();
	});

	it('reads an attribute-sourced modifier', () => {
		const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'attribute' } } };
		const result = modifiersFacet.resolve(ctx(config, { tone: 'warm' }));
		expect(result?.axes).toEqual({ tone: 'warm' });
		expect(result?.classes).toEqual(['rf-card--warm']);
	});

	it('reads a meta-sourced modifier from a data-field child', () => {
		const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'meta' } } };
		expect(modifiersFacet.resolve(ctx(config, {}, [['tone', 'cool']]))?.axes).toEqual({ tone: 'cool' });
	});

	it('prefers the typed field bag over the meta child', () => {
		const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'meta' } } };
		const result = modifiersFacet.resolve(ctx(config, {}, [['tone', 'cool']], { fields: { tone: 'warm' } }));
		expect(result?.axes).toEqual({ tone: 'warm' });
	});

	it('ignores a non-scalar field value and falls back to the meta child', () => {
		const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'meta' } } };
		const result = modifiersFacet.resolve(ctx(config, {}, [['tone', 'cool']], { fields: { tone: { a: 1 } } }));
		expect(result?.axes).toEqual({ tone: 'cool' });
	});

	it('applies the declared default', () => {
		const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'attribute', default: 'warm' } } };
		expect(modifiersFacet.resolve(ctx(config))?.axes).toEqual({ tone: 'warm' });
	});

	it('suppresses the BEM class with noBemClass, keeping the axis', () => {
		const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'attribute', noBemClass: true } } };
		const result = modifiersFacet.resolve(ctx(config, { tone: 'warm' }));
		expect(result?.axes).toEqual({ tone: 'warm' });
		expect(result?.classes).toBeUndefined();
	});

	describe('value mapping', () => {
		it('translates the value in place', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { level: { source: 'attribute', valueMap: { '1': 'high' } } },
			};
			expect(modifiersFacet.resolve(ctx(config, { level: '1' }))?.axes).toEqual({ level: 'high' });
		});

		it('leaves the BEM class on the raw value, not the mapped one', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { level: { source: 'attribute', valueMap: { '1': 'high' } } },
			};
			expect(modifiersFacet.resolve(ctx(config, { level: '1' }))?.classes).toEqual(['rf-card--1']);
		});

		it('passes an unmapped value through unchanged', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { level: { source: 'attribute', valueMap: { '1': 'high' } } },
			};
			expect(modifiersFacet.resolve(ctx(config, { level: '9' }))?.axes).toEqual({ level: '9' });
		});

		it('sends the mapped value to a separate attribute with mapTarget', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { level: { source: 'attribute', valueMap: { '1': 'high' }, mapTarget: 'severity' } },
			};
			const result = modifiersFacet.resolve(ctx(config, { level: '1' }));
			expect(result?.axes).toEqual({ level: '1' });           // the axis keeps the raw value
			expect(result?.dataAttrs).toEqual({ 'data-severity': 'high' });
		});

		it('does not double-prefix a mapTarget already starting with data-', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { level: { source: 'attribute', valueMap: { '1': 'high' }, mapTarget: 'data-severity' } },
			};
			expect(modifiersFacet.resolve(ctx(config, { level: '1' }))?.dataAttrs)
				.toEqual({ 'data-severity': 'high' });
		});
	});

	describe('present-but-empty', () => {
		// `title=""` must be distinguishable from an absent title so
		// `renderWhenEmpty` fields can tell the two apart.
		it('records the empty value as an axis', () => {
			const config: RuneConfig = { block: 'card', modifiers: { title: { source: 'attribute' } } };
			expect(modifiersFacet.resolve(ctx(config, { title: '' }))?.axes).toEqual({ title: '' });
		});

		it('emits no BEM class, which would be a dangling `block--`', () => {
			const config: RuneConfig = { block: 'card', modifiers: { title: { source: 'attribute' } } };
			expect(modifiersFacet.resolve(ctx(config, { title: '' }))?.classes).toBeUndefined();
		});

		it('skips mapping for an empty value', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { title: { source: 'attribute', valueMap: { '': 'blank' }, mapTarget: 'x' } },
			};
			expect(modifiersFacet.resolve(ctx(config, { title: '' }))?.dataAttrs).toBeUndefined();
		});

		// Absent is not the same as present-and-empty: no axis at all, so a
		// `renderWhenEmpty` field can tell the two apart. The attribute name is
		// still claimed for stripping, which is why this is not a null result.
		it('emits no axis for an absent modifier', () => {
			const config: RuneConfig = { block: 'card', modifiers: { title: { source: 'attribute' } } };
			expect(modifiersFacet.resolve(ctx(config))?.axes).toBeUndefined();
		});
	});

	describe('attribute stripping', () => {
		it('claims attribute-sourced names so they do not pass through', () => {
			const config: RuneConfig = {
				block: 'card',
				modifiers: { tone: { source: 'attribute' }, size: { source: 'meta' } },
			};
			expect(modifiersFacet.resolve(ctx(config, { tone: 'warm' }))?.stripAttrs).toEqual(['tone']);
		});

		it('claims the name even when the modifier resolved to nothing', () => {
			const config: RuneConfig = { block: 'card', modifiers: { tone: { source: 'attribute' } } };
			expect(modifiersFacet.resolve(ctx(config))?.stripAttrs).toEqual(['tone']);
		});

		it('leaves meta-sourced names alone — they were never attributes', () => {
			const config: RuneConfig = { block: 'card', modifiers: { size: { source: 'meta' } } };
			expect(modifiersFacet.resolve(ctx(config, {}, [['size', 'lg']]))?.stripAttrs).toBeUndefined();
		});
	});

	it('preserves config declaration order across axes and classes', () => {
		const config: RuneConfig = {
			block: 'card',
			modifiers: { a: { source: 'attribute' }, b: { source: 'attribute' }, c: { source: 'attribute' } },
		};
		const result = modifiersFacet.resolve(ctx(config, { a: '1', b: '2', c: '3' }));
		expect(Object.keys(result!.axes!)).toEqual(['a', 'b', 'c']);
		expect(result?.classes).toEqual(['rf-card--1', 'rf-card--2', 'rf-card--3']);
	});
});

describe('context-modifiers facet', () => {
	const config: RuneConfig = { block: 'card', contextModifiers: { grid: 'in-grid' } };

	it('adds the modifier when nested in a matching parent', () => {
		expect(contextModifiersFacet.resolve(ctx(config, {}, [], { parentRune: 'grid' }))?.classes)
			.toEqual(['rf-card--in-grid']);
	});

	it('contributes nothing under a different parent', () => {
		expect(contextModifiersFacet.resolve(ctx(config, {}, [], { parentRune: 'list' }))).toBeNull();
	});

	it('contributes nothing at the top level', () => {
		expect(contextModifiersFacet.resolve(ctx(config))).toBeNull();
	});

	it('contributes nothing when the rune declares none', () => {
		expect(contextModifiersFacet.resolve(ctx({ block: 'card' }, {}, [], { parentRune: 'grid' }))).toBeNull();
	});
});

describe('static-modifiers facet', () => {
	it('always applies its declared suffixes, in order', () => {
		const config: RuneConfig = { block: 'card', staticModifiers: ['boxed', 'flush'] };
		expect(staticModifiersFacet.resolve(ctx(config))?.classes)
			.toEqual(['rf-card--boxed', 'rf-card--flush']);
	});

	it('contributes nothing when the list is absent or empty', () => {
		expect(staticModifiersFacet.resolve(ctx({ block: 'card' }))).toBeNull();
		expect(staticModifiersFacet.resolve(ctx({ block: 'card', staticModifiers: [] }))).toBeNull();
	});
});
