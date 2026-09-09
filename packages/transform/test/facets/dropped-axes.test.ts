import { describe, it, expect } from 'vitest';
import { readingFacet } from '../../src/facets/reading.js';
import { contentPlaceFacet } from '../../src/facets/content-place.js';
import { coverFacet } from '../../src/facets/cover.js';
import { makeTag } from '../../src/helpers.js';
import type { FacetContext, FacetResult } from '../../src/facets/types.js';
import type { RuneConfig } from '../../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

// WORK-536 / SPEC-125 — of the gated universal axes, four reported when they
// were dropped and three said nothing. These are the three, each silent for a
// different reason:
//
//  - `reading` always resolved and published its register as state; the value
//    simply never landed, because only a `body`-role element carries it.
//  - `content-place` was gated by `appliesTo` on an axis a rune without the
//    modifier never sets, so the facet never ran and never got to complain.
//  - in cover mode `scrim-strength` was neither honoured nor consumed, so it
//    vanished from the styling *and* leaked its raw `<meta>` into the output.
//
// Warnings are asserted as returned `FacetWarning` data rather than through a
// console spy: the driver owns emission, and a test that watches the console is
// really testing the driver.

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

function ctx(opts: {
	rune?: string;
	config?: RuneConfig;
	attrs?: Record<string, unknown>;
	children?: unknown[];
	axes?: Record<string, string>;
}): FacetContext {
	const rune = opts.rune ?? 'grid';
	const config = opts.config ?? { block: rune };
	return {
		tag: makeTag('div', { 'data-rune': rune, ...(opts.attrs ?? {}) }, (opts.children ?? []) as never) as SerializedTag,
		config,
		block: `rf-${config.block}`,
		rune,
		fields: {},
		theme: { tints: {}, backgrounds: {}, frames: {} },
		axis: (name: string) => opts.axes?.[name],
	} as FacetContext;
}

const warnings = (result: FacetResult | null) => result?.warnings ?? [];

describe('reading on a rune that declares no prose', () => {
	// WORK-537 moved the gate from the `body` section role onto a declared
	// capability, so `PROSE` is what unlocks the axis — and `NO_PROSE` keeps its
	// body role deliberately, to pin that the role alone is no longer enough.
	const PROSE: RuneConfig = { block: 'textblock', sections: { content: 'body' }, provides: ['prose'] };
	const NO_PROSE: RuneConfig = { block: 'datatable', sections: { table: 'body' } };

	it('warns, naming the register and why nothing carries it', () => {
		const result = readingFacet.resolve(ctx({ rune: 'datatable', config: NO_PROSE, attrs: { reading: 'prose' } }));
		const [warning] = warnings(result);
		expect(warning?.code).toBe('reading-without-prose');
		expect(warning?.message).toContain('reading="prose"');
		expect(warning?.message).toContain('datatable');
		expect(warning?.message).toContain('no prose body');
		expect(warning?.dedupeKey).toBe('datatable:prose');
	});

	it('publishes no register at all, so dropcap sees the same answer', () => {
		const result = readingFacet.resolve(ctx({ rune: 'datatable', config: NO_PROSE, attrs: { reading: 'prose' } }));
		expect(result?.state).toBeUndefined();
	});

	it('resolves normally on a rune that declares prose', () => {
		const result = readingFacet.resolve(ctx({ rune: 'textblock', config: PROSE, attrs: { reading: 'prose' } }));
		expect(warnings(result)).toEqual([]);
		expect(result?.state?.reading).toBe('prose');
	});

	it('a body role alone no longer unlocks it', () => {
		// The proxy SPEC-108 relied on. `NO_PROSE` has a `body` role — on its
		// table — and gets neither the register nor a silent pass.
		expect(NO_PROSE.sections).toBeTruthy();
		expect(readingFacet.resolve(ctx({ rune: 'datatable', config: NO_PROSE }))).toBeNull();
	});

	it('stays silent when nothing was asked for', () => {
		// The default case, and the one that decides whether this channel is
		// usable: every unmarked block in a build resolves to `ui`.
		expect(warnings(readingFacet.resolve(ctx({ rune: 'datatable', config: NO_PROSE })))).toEqual([]);
		expect(warnings(readingFacet.resolve(ctx({ rune: 'textblock', config: PROSE })))).toEqual([]);
	});

	it('stays silent on a value that is not a register at all', () => {
		// A typo falls through the resolution cascade to `ui`; it is Markdoc's
		// job to reject it, not this facet's to guess.
		expect(warnings(readingFacet.resolve(ctx({ rune: 'datatable', config: NO_PROSE, attrs: { reading: 'prosey' } })))).toEqual([]);
	});
});

describe('content-place on a rune that declares no such modifier', () => {
	it('runs on the bare attribute, purely to warn', () => {
		// The path schema narrowing cannot cover: a scoped default or embed
		// override (ADR-027) applies the attribute without the author writing it.
		const c = ctx({ attrs: { 'content-place': 'end center' } });
		expect(contentPlaceFacet.appliesTo?.(c)).toBe(true);

		const [warning] = warnings(contentPlaceFacet.resolve(c));
		expect(warning?.code).toBe('content-place-undeclared');
		expect(warning?.message).toContain('grid');
		expect(warning?.message).toContain('no `content-place` modifier');
		expect(warning?.dedupeKey).toBe('grid');
	});

	it('does not run when the attribute is absent', () => {
		expect(contentPlaceFacet.appliesTo?.(ctx({}))).toBe(false);
	});

	it('keeps the existing outside-cover warning when the modifier IS declared', () => {
		// The pre-existing diagnostic; the two are distinct causes and must stay
		// distinguishable by code.
		const c = ctx({ rune: 'card', axes: { 'content-place': 'end center' } });
		const [warning] = warnings(contentPlaceFacet.resolve(c));
		expect(warning?.code).toBe('content-place-outside-cover');
	});

	it('resolves normally in cover mode', () => {
		const c = ctx({ rune: 'card', axes: { 'content-place': 'end center', 'media-position': 'cover' } });
		const result = contentPlaceFacet.resolve(c);
		expect(warnings(result)).toEqual([]);
		expect(result?.styles).toContainEqual(['--cover-place-block', 'end']);
	});
});

describe('scrim-strength in cover mode', () => {
	const COVER_RUNE: RuneConfig = { block: 'card', modifiers: { 'media-position': { source: 'meta' } } };
	const inCover = (children: unknown[]) => ctx({
		rune: 'card', config: COVER_RUNE, children, axes: { 'media-position': 'cover' },
	});

	it('warns, naming why the media well cannot honour it', () => {
		const result = coverFacet.resolve(inCover([meta('scrim', 'bottom'), meta('scrim-strength', 'lg')]));
		const [warning] = warnings(result);
		expect(warning?.code).toBe('scrim-strength-in-cover');
		expect(warning?.message).toContain('card');
		expect(warning?.message).toContain('no strength control');
		expect(warning?.dedupeKey).toBe('card');
	});

	it('claims the meta so it cannot leak into the rendered tree', () => {
		// The half that is a rendering bug rather than a diagnostic gap: the tag
		// was left unconsumed, so the strip pass let a raw `<meta>` through.
		const result = coverFacet.resolve(inCover([meta('scrim', 'bottom'), meta('scrim-strength', 'lg')]));
		expect(result?.consumes).toContain('scrim-strength');
	});

	it('consumes without warning when the scrim is switched off', () => {
		// `scrim="none"` means the author already said they want no scrim; telling
		// them a scrim facet was ignored is noise.
		const result = coverFacet.resolve(inCover([meta('scrim', 'none'), meta('scrim-strength', 'lg')]));
		expect(warnings(result)).toEqual([]);
		expect(result?.consumes).toContain('scrim-strength');
	});

	it('stays silent when scrim-strength was never set', () => {
		const result = coverFacet.resolve(inCover([meta('scrim', 'bottom')]));
		expect(warnings(result)).toEqual([]);
		expect(result?.consumes).not.toContain('scrim-strength');
	});
});
