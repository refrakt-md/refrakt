import { describe, it, expect, vi, afterEach } from 'vitest';
import { mergeThemeConfig, mergeRuneConfig, type IdentityViolation } from '../src/merge.js';
import { validateThemeConfig } from '../src/validate.js';
import { IDENTITY_FIELDS, VARIANT_DELTA_RESERVED_FIELDS, findReservedFields } from '../src/identity-fields.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';

// ADR-028 / SPEC-125 Phase 2 — `block`, `modifiers` and `sections` are rune
// identity on *every* merge path into RuneConfig, not just on SPEC-091 variant
// deltas. A theme may restructure and re-decorate a rune; it may not redefine
// what the rune is, because that would change what the same markdown means.

const baseCard: RuneConfig = {
	block: 'card',
	modifiers: { mode: { source: 'meta' } },
	sections: { media: 'media', body: 'body' },
	layout: { root: ['media', 'content'] },
};

function themeConfig(runes: Record<string, RuneConfig>): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

function collect(): { violations: IdentityViolation[]; sink: (v: IdentityViolation) => void } {
	const violations: IdentityViolation[] = [];
	return { violations, sink: (v) => violations.push(v) };
}

describe('the identity rule is expressed once', () => {
	it('the variant-delta set is the identity set plus `variants`', () => {
		expect([...IDENTITY_FIELDS]).toEqual(['block', 'modifiers', 'sections']);
		expect([...VARIANT_DELTA_RESERVED_FIELDS]).toEqual([...IDENTITY_FIELDS, 'variants']);
	});

	it('findReservedFields reports presence, including an explicit undefined', () => {
		// `{ sections: undefined }` still shadows the base under a spread merge,
		// so presence — not truthiness — is the test.
		expect(findReservedFields({ sections: undefined, layout: {} })).toEqual(['sections']);
		expect(findReservedFields({ layout: {} })).toEqual([]);
	});
});

describe('ADR-028 — theme overrides may not redefine a rune', () => {
	afterEach(() => vi.restoreAllMocks());

	for (const field of IDENTITY_FIELDS) {
		it(`drops and reports a theme override of \`${field}\``, () => {
			const { violations, sink } = collect();
			const merged = mergeThemeConfig(
				themeConfig({ Card: baseCard }),
				{ runes: { Card: { [field]: field === 'block' ? 'other' : {} } as Partial<RuneConfig> } },
				undefined,
				sink,
			);

			// The rune's own declaration stands.
			expect(merged.runes.Card[field]).toEqual(baseCard[field]);

			expect(violations).toHaveLength(1);
			expect(violations[0].rune).toBe('Card');
			expect(violations[0].field).toBe(field);
			expect(violations[0].path).toBe(`runes.Card.${field}`);
			expect(violations[0].message).toContain(`identity field "${field}"`);
			expect(violations[0].message).toContain('Card');
		});
	}

	it('an override that disables a section role cannot silently kill `reading`', () => {
		// The motivating case: `runes: { Card: { sections: {} } }` would strip
		// data-section="body" from every card in a site, and with it data-reading.
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Card: baseCard }),
			{ runes: { Card: { sections: {} } } },
			undefined,
			sink,
		);
		expect(merged.runes.Card.sections).toEqual({ media: 'media', body: 'body' });
		expect(violations.map((v) => v.field)).toEqual(['sections']);
	});

	it('reports every violating field in one override', () => {
		const { violations, sink } = collect();
		mergeThemeConfig(
			themeConfig({ Card: baseCard }),
			{ runes: { Card: { block: 'other', sections: {}, staticModifiers: ['x'] } } },
			undefined,
			sink,
		);
		expect(violations.map((v) => v.field)).toEqual(['block', 'sections']);
	});

	it('warns on the console when no sink is supplied', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mergeThemeConfig(themeConfig({ Warned: baseCard }), { runes: { Warned: { block: 'other' } } });
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0][0]).toContain('runes.Warned.block');
	});
});

describe('ADR-028 — what a theme may still do', () => {
	it('merges every permitted field', () => {
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Card: baseCard }),
			{
				runes: {
					Card: {
						layout: { content: { tag: 'div', children: ['body'] } },
						structure: { header: { tag: 'header' } },
						styles: { mode: '--card-mode' },
						contentWrapper: { tag: 'div', ref: 'content' },
						staticModifiers: ['themed'],
						autoLabel: { p: 'body' },
						editHints: { body: 'inline' },
						projection: { source: 'registry' } as RuneConfig['projection'],
					},
				},
			},
			undefined,
			sink,
		);

		const card = merged.runes.Card;
		expect(violations).toEqual([]);
		expect(card.structure).toEqual({ header: { tag: 'header' } });
		expect(card.styles).toEqual({ mode: '--card-mode' });
		expect(card.contentWrapper).toEqual({ tag: 'div', ref: 'content' });
		expect(card.staticModifiers).toEqual(['themed']);
		expect(card.autoLabel).toEqual({ p: 'body' });
		expect(card.editHints).toEqual({ body: 'inline' });
		expect(card.projection).toBeTruthy();
		// `layout` still merges by inner key rather than being replaced.
		expect(card.layout?.root).toEqual(['media', 'content']);
		expect(card.layout?.content).toEqual({ tag: 'div', children: ['body'] });
		// …and identity is untouched.
		expect(card.block).toBe('card');
		expect(card.sections).toEqual({ media: 'media', body: 'body' });
	});

	it('still lets a theme add and override variant axes (SPEC-091)', () => {
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({
				Card: { ...baseCard, variants: { mode: { cover: { staticModifiers: ['cover'] } } } },
			}),
			{ runes: { Card: { variants: { mode: { plain: { staticModifiers: ['plain'] } } } } } },
			undefined,
			sink,
		);
		expect(violations).toEqual([]);
		expect(merged.runes.Card.variants?.mode.cover.staticModifiers).toEqual(['cover']);
		expect(merged.runes.Card.variants?.mode.plain.staticModifiers).toEqual(['plain']);
	});

	it('a key with no base entry declares a new rune, not an override', () => {
		// Plugins contribute their runes through the same merge. Declaring your
		// own `sections` is the rune speaking about itself — nothing to guard.
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Card: baseCard }),
			{ runes: { Hero: { block: 'hero', sections: { body: 'body' } } } },
			undefined,
			sink,
		);
		expect(violations).toEqual([]);
		expect(merged.runes.Hero.sections).toEqual({ body: 'body' });
	});
});

describe('the guard is opt-in per merge path', () => {
	it('mergeRuneConfig leaves identity alone unless asked', () => {
		// The engine applies a *validated* variant delta with this same function
		// at transform time; that path must not strip or diagnose anything.
		const merged = mergeRuneConfig(baseCard, { block: 'other' });
		expect(merged.block).toBe('other');
	});
});

describe('the variant-delta path still enforces the same rule', () => {
	function validateDelta(delta: Partial<RuneConfig>) {
		return validateThemeConfig(
			themeConfig({
				Card: { block: 'card', modifiers: { mode: { source: 'meta' } }, variants: { mode: { cover: delta } } },
			}),
		);
	}

	for (const field of VARIANT_DELTA_RESERVED_FIELDS) {
		it(`errors on a delta carrying \`${field}\``, () => {
			const res = validateDelta({ [field]: field === 'block' ? 'other' : {} } as Partial<RuneConfig>);
			expect(res.valid).toBe(false);
			expect(res.errors.some((e) => e.path === `runes.Card.variants.mode.cover.${field}`)).toBe(true);
			expect(res.errors.some((e) => e.message.includes(`identity field "${field}"`))).toBe(true);
		});
	}

	it('accepts a delta that only restructures', () => {
		const res = validateDelta({ staticModifiers: ['cover'], layout: { root: ['band'] } });
		expect(res.valid).toBe(true);
	});
});
