import { describe, it, expect } from 'vitest';
import { widthFacet, contentMeasureFacet, spacingFacet, insetFacet } from '../../src/facets/box.js';
import { densityFacet } from '../../src/facets/density.js';
import { readingFacet, dropcapFacet } from '../../src/facets/reading.js';
import { motionFacet } from '../../src/facets/motion.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetTheme } from '../../src/facets/types.js';
import type { RuneConfig } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const THEME: FacetTheme = { tints: {}, backgrounds: {}, frames: {} };

const ctx = (
	attrs: Record<string, any> = {},
	config: RuneConfig = { block: 'card' },
	extra: Partial<FacetContext> = {},
): FacetContext => ({
	tag: makeTag('div', { 'data-rune': 'card', ...attrs }, []),
	config,
	block: `rf-${config.block}`,
	rune: 'card',
	fields: {},
	theme: THEME,
	axis: () => undefined,
	...extra,
});

describe('width facet', () => {
	it('contributes nothing by default', () => {
		expect(widthFacet.resolve(ctx())).toBeNull();
	});

	it('suppresses the `content` default so unmarked output is unchanged', () => {
		expect(widthFacet.resolve(ctx({ width: 'content' }))).toBeNull();
	});

	it('emits an axis and a BEM modifier', () => {
		expect(widthFacet.resolve(ctx({ width: 'wide' })))
			.toEqual({ axes: { width: 'wide' }, classes: ['rf-card--wide'] });
	});

	it('falls back to the rune default', () => {
		expect(widthFacet.resolve(ctx({}, { block: 'hero', defaultWidth: 'full' }))?.axes)
			.toEqual({ width: 'full' });
	});

	it('lets the author override the rune default', () => {
		const config: RuneConfig = { block: 'hero', defaultWidth: 'full' };
		expect(widthFacet.resolve(ctx({ width: 'wide' }, config))?.axes).toEqual({ width: 'wide' });
	});

	it('suppresses an authored `content` even when the rune defaults wider', () => {
		const config: RuneConfig = { block: 'hero', defaultWidth: 'full' };
		expect(widthFacet.resolve(ctx({ width: 'content' }, config))).toBeNull();
	});
});

describe('spacing and inset facets', () => {
	it('suppress their `default` value', () => {
		expect(spacingFacet.resolve(ctx({ spacing: 'default' }))).toBeNull();
		expect(insetFacet.resolve(ctx({ inset: 'default' }))).toBeNull();
	});

	it('emit prefixed BEM modifiers, unlike width', () => {
		expect(spacingFacet.resolve(ctx({ spacing: 'loose' }))?.classes).toEqual(['rf-card--spacing-loose']);
		expect(insetFacet.resolve(ctx({ inset: 'none' }))?.classes).toEqual(['rf-card--inset-none']);
	});

	it('take no rune-level default', () => {
		expect(spacingFacet.resolve(ctx())).toBeNull();
		expect(insetFacet.resolve(ctx())).toBeNull();
	});
});

describe('content-measure facet', () => {
	// Config-derived, not author-driven — not every axis reads an attribute.
	it('emits only when the rune anchors', () => {
		expect(contentMeasureFacet.resolve(ctx({}, { block: 'card', contentMeasure: 'anchored' })))
			.toEqual({ axes: { 'content-measure': 'anchored' } });
	});

	it('stays silent at the `fill` default', () => {
		expect(contentMeasureFacet.resolve(ctx())).toBeNull();
		expect(contentMeasureFacet.resolve(ctx({}, { block: 'card', contentMeasure: 'fill' }))).toBeNull();
	});

	it('ignores an author attribute', () => {
		expect(contentMeasureFacet.resolve(ctx({ 'content-measure': 'anchored' }))).toBeNull();
	});
});

describe('density facet', () => {
	it('defaults to full', () => {
		expect(densityFacet.resolve(ctx())?.state).toEqual({ density: 'full' });
	});

	it('takes the rune default', () => {
		expect(densityFacet.resolve(ctx({}, { block: 'card', defaultDensity: 'compact' }))?.state)
			.toEqual({ density: 'compact' });
	});

	// The only axis that reads config other than its own.
	it('inherits the parent rune’s childDensity', () => {
		const parentConfig: RuneConfig = { block: 'grid', childDensity: 'minimal' };
		expect(densityFacet.resolve(ctx({}, { block: 'card' }, { parentConfig }))?.state)
			.toEqual({ density: 'minimal' });
	});

	it('lets the parent context beat the rune’s own default', () => {
		const parentConfig: RuneConfig = { block: 'grid', childDensity: 'minimal' };
		const config: RuneConfig = { block: 'card', defaultDensity: 'compact' };
		expect(densityFacet.resolve(ctx({}, config, { parentConfig }))?.state)
			.toEqual({ density: 'minimal' });
	});

	it('lets the author beat everything', () => {
		const parentConfig: RuneConfig = { block: 'grid', childDensity: 'minimal' };
		const config: RuneConfig = { block: 'card', defaultDensity: 'compact' };
		expect(densityFacet.resolve(ctx({ density: 'full' }, config, { parentConfig }))?.state)
			.toEqual({ density: 'full' });
	});

	it('publishes state, never an emitted axis — the engine owns the attribute', () => {
		expect(densityFacet.resolve(ctx())?.axes).toBeUndefined();
	});
});

describe('reading facet', () => {
	it('defaults to the ui register', () => {
		expect(readingFacet.resolve(ctx())?.state).toEqual({ reading: 'ui' });
	});

	it('takes the rune default', () => {
		expect(readingFacet.resolve(ctx({}, { block: 'article', defaultReading: 'prose' }))?.state)
			.toEqual({ reading: 'prose' });
	});

	it('lets the author override', () => {
		const config: RuneConfig = { block: 'article', defaultReading: 'prose' };
		expect(readingFacet.resolve(ctx({ reading: 'fine' }, config))?.state).toEqual({ reading: 'fine' });
	});
});

describe('dropcap facet', () => {
	const withRegister = (register: string, attrs: Record<string, any> = { dropcap: true }): FacetContext =>
		ctx(attrs, { block: 'article' }, { axis: (name) => (name === 'reading' ? register : undefined) });

	it('does not run unless requested', () => {
		expect(dropcapFacet.appliesTo?.(withRegister('prose', {}))).toBe(false);
	});

	// The dependency that previously held only because two blocks sat five lines
	// apart is now declared.
	it('declares its dependency on reading', () => {
		expect(dropcapFacet.after).toEqual(['reading']);
	});

	it('is honoured on a prose body', () => {
		expect(dropcapFacet.resolve(withRegister('prose'))).toEqual({ state: { dropcap: 'true' } });
	});

	for (const register of ['ui', 'fine']) {
		it(`is dropped with a warning on the ${register} register`, () => {
			const result = dropcapFacet.resolve(withRegister(register));
			expect(result?.state).toBeUndefined();
			expect(result?.warnings?.[0].code).toBe('dropcap-off-register');
			expect(result?.warnings?.[0].message).toContain(`reading="${register}"`);
		});
	}

	it('falls back to the default register when reading resolved nothing', () => {
		const result = dropcapFacet.resolve(ctx({ dropcap: true }));
		expect(result?.warnings?.[0].message).toContain('reading="ui"');
	});
});

describe('motion facet', () => {
	it('contributes nothing without reveal or stagger', () => {
		expect(motionFacet.resolve(ctx())).toBeNull();
	});

	it('emits the reveal axis with no BEM class', () => {
		const result = motionFacet.resolve(ctx({ reveal: 'fade' }));
		expect(result?.axes).toEqual({ reveal: 'fade' });
		expect(result?.classes).toBeUndefined();
	});

	it('emits stagger as a bare marker', () => {
		expect(motionFacet.resolve(ctx({ stagger: true }))?.axes).toEqual({ stagger: '' });
	});

	it('carries the stagger flag to the second phase', () => {
		expect(motionFacet.resolve(ctx({ stagger: true }))?.carry).toBe(true);
		expect(motionFacet.resolve(ctx({ reveal: 'fade' }))?.carry).toBeUndefined();
	});

	describe('postAssemble — stagger indices', () => {
		const item = (name: string) => makeTag('div', { 'data-name': name }, []);
		const config: RuneConfig = { block: 'card', staggerItems: 'item' };

		it('stamps document-order indices on the cascade items', () => {
			const children = [item('item'), item('item'), item('item')];
			motionFacet.postAssemble!(ctx({ stagger: true }, config), children, true);
			expect(children.map(c => (c as SerializedTag).attributes.style))
				.toEqual(['--rf-reveal-index: 0', '--rf-reveal-index: 1', '--rf-reveal-index: 2']);
		});

		it('matches on data-field as well as data-name', () => {
			const children = [makeTag('div', { 'data-field': 'item' }, [])];
			motionFacet.postAssemble!(ctx({ stagger: true }, config), children, true);
			expect((children[0] as SerializedTag).attributes.style).toBe('--rf-reveal-index: 0');
		});

		it('merges onto an existing inline style', () => {
			const children = [makeTag('div', { 'data-name': 'item', style: 'color: red' }, [])];
			motionFacet.postAssemble!(ctx({ stagger: true }, config), children, true);
			expect((children[0] as SerializedTag).attributes.style).toBe('color: red; --rf-reveal-index: 0');
		});

		it('descends through wrappers, continuing the count', () => {
			const children = [makeTag('div', {}, [item('item'), item('item')]), item('item')];
			motionFacet.postAssemble!(ctx({ stagger: true }, config), children, true);
			const wrapped = (children[0] as SerializedTag).children as SerializedTag[];
			expect(wrapped.map(c => c.attributes.style)).toEqual(['--rf-reveal-index: 0', '--rf-reveal-index: 1']);
			expect((children[1] as SerializedTag).attributes.style).toBe('--rf-reveal-index: 2');
		});

		// A nested same-named cascade belongs to that child rune's own pass.
		it('does not descend into a matched item', () => {
			const nested = item('item');
			const children = [makeTag('div', { 'data-name': 'item' }, [nested])];
			motionFacet.postAssemble!(ctx({ stagger: true }, config), children, true);
			expect(nested.attributes.style).toBeUndefined();
		});

		it('is a no-op when the rune declares no cascade items', () => {
			const children = [item('item')];
			motionFacet.postAssemble!(ctx({ stagger: true }, { block: 'card' }), children, true);
			expect((children[0] as SerializedTag).attributes.style).toBeUndefined();
		});

		it('is a no-op when stagger was not requested', () => {
			const children = [item('item')];
			motionFacet.postAssemble!(ctx({ reveal: 'fade' }, config), children, undefined);
			expect((children[0] as SerializedTag).attributes.style).toBeUndefined();
		});
	});
});
