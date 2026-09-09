import { describe, it, expect } from 'vitest';
import { resolveUniversalAttributes, AXIS_ATTRIBUTES, POSTURE_REASONS, UNIVERSAL_ATTRIBUTE_NAMES, tags } from '../src/index.js';
import type { UniversalAttributePosture } from '../src/universal-attributes.js';

// SPEC-125 Phase 3 / WORK-534 — `resolveUniversalAttributes` is the declared
// rule that replaced "whichever constructor the schema happened to use". It has
// three inputs: posture (inline-ness / configurator-ness), the rune's own join
// tables, and the attributes it declares. Everything below tests the rule
// directly; `schema-contract-agreement.test.ts` then checks that the rule and
// the structure contract stay one derivation across all 132 runes.

describe('the axis→attribute map', () => {
	// `AXIS_ATTRIBUTES` is the one hand-maintained part of the derivation, and
	// the failure modes are silent in both directions: an attribute owned by no
	// axis can never be narrowed, one owned by two is narrowed by whichever axis
	// lost. The universal set is the fixed point it must hit.
	it('covers the universal set exactly, with no attribute owned twice', () => {
		const owned = Object.values(AXIS_ATTRIBUTES).flat();
		expect(new Set(owned).size, 'an attribute is owned by two axes').toBe(owned.length);
		expect([...owned].sort()).toEqual([...UNIVERSAL_ATTRIBUTE_NAMES].sort());
	});
});

describe('posture short-circuits every axis', () => {
	for (const posture of ['inline', 'configurator', 'none'] as UniversalAttributePosture[]) {
		it(`\`${posture}\` yields no attributes, with a stated reason per axis`, () => {
			// Structure is deliberately supplied and deliberately ignored: a
			// non-`auto` posture is a statement about the rune's kind, so consulting
			// its anatomy would be answering a different question.
			const res = resolveUniversalAttributes({
				posture,
				structure: { sections: { body: 'body', title: 'title' }, mediaSlots: { media: 'cover' }, frameTarget: 'media' },
			});
			expect(res.available.size).toBe(0);
			expect([...res.unavailable.keys()].sort()).toEqual(Object.keys(AXIS_ATTRIBUTES).sort());
			for (const reason of res.unavailable.values()) expect(reason).toBe(POSTURE_REASONS[posture]);
		});
	}
});

describe('`auto` gates axis by axis on what the rune is made of', () => {
	it('a rune with no declared structure keeps only the ungated axes', () => {
		const { available, unavailable } = resolveUniversalAttributes({});
		// Ungated: they act on the block itself, which every rune has.
		expect([...available].sort()).toEqual(
			[...AXIS_ATTRIBUTES.tint, ...AXIS_ATTRIBUTES.bg, ...AXIS_ATTRIBUTES.width, ...AXIS_ATTRIBUTES.spacing,
				...AXIS_ATTRIBUTES.inset, ...AXIS_ATTRIBUTES.elevation, ...AXIS_ATTRIBUTES.motion, ...AXIS_ATTRIBUTES.substrate].sort(),
		);
		// Gated, and each says why rather than just vanishing.
		for (const axis of ['reading', 'dropcap', 'prominence', 'frame', 'cover']) {
			expect(unavailable.get(axis), `${axis} should be unavailable with a reason`).toBeTruthy();
		}
	});

	it('a body role unlocks the prose axes', () => {
		const { available } = resolveUniversalAttributes({ structure: { sections: { body: 'body' } } });
		expect(available).toContain('reading');
		expect(available).toContain('dropcap');
		expect(available).not.toContain('prominence');
	});

	it('a header-ish role unlocks prominence', () => {
		for (const role of ['header', 'title'] as const) {
			const { available } = resolveUniversalAttributes({ structure: { sections: { x: role } } });
			expect(available, `role \`${role}\``).toContain('prominence');
		}
	});

	it('a frame target unlocks the frame family', () => {
		const bare = resolveUniversalAttributes({});
		expect(bare.available).not.toContain('frame');

		const framed = resolveUniversalAttributes({ structure: { frameTarget: 'media', mediaSlots: { media: 'cover' } } });
		for (const name of AXIS_ATTRIBUTES.frame) expect(framed.available).toContain(name);
	});

	it('the cover axis gates on a declared modifier, not on structure', () => {
		// `scrim*` decorates a cover image, which a rune opts into by declaring a
		// `media-position` attribute. This is the input that made `modifiers` stay
		// in config rather than moving to the join tables (WORK-533).
		const without = resolveUniversalAttributes({ structure: { mediaSlots: { media: 'cover' } } });
		expect(without.available).not.toContain('scrim');

		const with_ = resolveUniversalAttributes({
			structure: { mediaSlots: { media: 'cover' } },
			declaredAttributes: ['media-position'],
		});
		for (const name of AXIS_ATTRIBUTES.cover) expect(with_.available).toContain(name);
	});

	it('an axis is never both available and explained away', () => {
		const res = resolveUniversalAttributes({ structure: { sections: { body: 'body', title: 'title' } } });
		for (const [axis, names] of Object.entries(AXIS_ATTRIBUTES)) {
			if (!res.unavailable.has(axis)) continue;
			for (const name of names) expect(res.available, `${axis}/${name}`).not.toContain(name);
		}
	});
});

describe('the rule is what the shipped schemas actually got', () => {
	// The unit tests above could all pass while `createContentModelSchema` ignored
	// the result. These read the real schemas.
	const attrs = (tag: string) => new Set(Object.keys((tags as Record<string, { attributes?: object }>)[tag]?.attributes ?? {}));

	it('narrows a layout rune and keeps a prose rune whole', () => {
		const grid = attrs('grid');
		expect(grid.size).toBeGreaterThan(0);
		for (const name of [...AXIS_ATTRIBUTES.reading, ...AXIS_ATTRIBUTES.dropcap, ...AXIS_ATTRIBUTES.prominence, ...AXIS_ATTRIBUTES.frame]) {
			expect(grid, `grid should not offer \`${name}\``).not.toContain(name);
		}

		const blog = attrs('blog');
		for (const name of [...AXIS_ATTRIBUTES.reading, ...AXIS_ATTRIBUTES.dropcap, ...AXIS_ATTRIBUTES.prominence]) {
			expect(blog, `blog should offer \`${name}\``).toContain(name);
		}
	});

	it('leaves the ungated axes on every rune that has any universal attribute', () => {
		// Over-narrowing is the worse failure: it rejects markup the engine honours.
		for (const tag of ['grid', 'blog', 'card', 'figure', 'tabs']) {
			for (const name of [...AXIS_ATTRIBUTES.tint, ...AXIS_ATTRIBUTES.width, ...AXIS_ATTRIBUTES.spacing, ...AXIS_ATTRIBUTES.motion]) {
				expect(attrs(tag), `${tag} should offer \`${name}\``).toContain(name);
			}
		}
	});

	it('the six hand-written schemas carry none, as assessed', () => {
		for (const tag of ['badge', 'xref', 'tint', 'bg', 'icon', 'expand']) {
			const declared = attrs(tag);
			for (const name of UNIVERSAL_ATTRIBUTE_NAMES) {
				expect(declared, `${tag} unexpectedly offers \`${name}\``).not.toContain(name);
			}
		}
	});
});
