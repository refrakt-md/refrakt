/**
 * SPEC-158 — the identity guard is path-granular.
 *
 * ADR-028's guard was key-granular, and two of the things that need protecting
 * are not keys: `metaFields.*.metaType` is a sub-field, and a layout `attrs`
 * map can write an attribute an identity field derives without touching the
 * field. `sequence` was simply missing. Each case below is dropped and
 * reported, never thrown (D5): the rest of the override still merges.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mergeThemeConfig, type IdentityViolation } from '../src/merge.js';
import { findReservedFields, derivedAttributeOwner } from '../src/identity-fields.js';
import { validateThemeConfig } from '../src/validate.js';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function themeConfig(runes: Record<string, RuneConfig>): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

function collect(): { violations: IdentityViolation[]; sink: (v: IdentityViolation) => void } {
	const violations: IdentityViolation[] = [];
	return { violations, sink: (v) => violations.push(v) };
}

afterEach(() => vi.restoreAllMocks());

describe('findReservedFields resolves paths (D1)', () => {
	it('expands a wildcard segment to concrete paths, in key order', () => {
		expect(
			findReservedFields({
				metaFields: { status: { metaType: 'category' }, owner: { label: 'Owner' } },
			}),
		).toEqual(['metaFields.status.metaType']);
	});

	it('keeps presence semantics per segment — an explicit undefined is still a violation', () => {
		expect(findReservedFields({ metaFields: { status: { metaType: undefined } } })).toEqual([
			'metaFields.status.metaType',
		]);
		expect(findReservedFields({ sequence: undefined })).toEqual(['sequence']);
	});

	it('does not match a wildcard path through a missing or non-object segment', () => {
		expect(findReservedFields({ metaFields: undefined })).toEqual([]);
		expect(findReservedFields({ layout: { root: ['metaType'] } })).toEqual([]);
	});
});

describe('`sequence` is identity; `sequenceDirection` is not (D2)', () => {
	const playlist: RuneConfig = {
		block: 'playlist',
		modifiers: { direction: { source: 'meta' }, collapse: { source: 'meta' } },
		sequence: 'numbered',
		sequenceDirection: { fromModifier: 'direction', default: 'vertical' },
	};

	it('drops and reports a theme override of `sequence`, naming the rune and the field', () => {
		// ADR-030 rule 3: on a playlist the number *is* the track number — an
		// identifier a listener says out loud. Restyling a playlist as a
		// timeline (`connected`) does not change how it looks; it deletes the
		// track numbers. Whether the ordinal is information is a fact about the
		// content, so the rune owns it, and the theme does not.
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Playlist: playlist }),
			{ runes: { Playlist: { sequence: 'connected' } } },
			undefined,
			sink,
		);

		expect(merged.runes.Playlist.sequence).toBe('numbered');
		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({
			rune: 'Playlist',
			field: 'sequence',
			path: 'runes.Playlist.sequence',
		});
		expect(violations[0].message).toContain('identity field "sequence"');
	});

	it('`sequenceDirection` stays overridable — rule 3 hands responsive collapse to the theme', () => {
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Playlist: playlist }),
			{
				runes: {
					Playlist: {
						sequence: 'connected',
						sequenceDirection: { fromModifier: 'collapse', default: 'horizontal' },
					},
				},
			},
			undefined,
			sink,
		);

		// The split, in one place: the marker is the rune's, its direction the theme's.
		expect(merged.runes.Playlist.sequence).toBe('numbered');
		expect(merged.runes.Playlist.sequenceDirection).toEqual({
			fromModifier: 'collapse',
			default: 'horizontal',
		});
		expect(violations.map((v) => v.field)).toEqual(['sequence']);
	});
});

describe('`metaFields.*.metaType` is identity; label and sentimentMap are not (D3)', () => {
	const work: RuneConfig = {
		block: 'work',
		metaFields: {
			status: { metaType: 'status', label: 'Status', sentimentMap: { done: 'positive' } },
			priority: { metaType: 'category', label: 'Priority' },
		},
	};

	it('drops metaType while that entry’s label and sentimentMap merge, on one override', () => {
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Work: work }),
			{
				runes: {
					Work: {
						metaFields: {
							status: {
								metaType: 'category',
								label: 'State',
								sentimentMap: { done: 'neutral', blocked: 'negative' },
							},
						},
					},
				},
			},
			undefined,
			sink,
		);

		expect(merged.runes.Work.metaFields?.status).toEqual({
			metaType: 'status',
			label: 'State',
			sentimentMap: { done: 'neutral', blocked: 'negative' },
		});
		// The sibling field is untouched.
		expect(merged.runes.Work.metaFields?.priority).toEqual(work.metaFields?.priority);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({
			rune: 'Work',
			field: 'metaFields.status.metaType',
			path: 'runes.Work.metaFields.status.metaType',
		});
	});

	it('an entry that omits metaType keeps the declared one — omission cannot erase it', () => {
		// `metaFields` merges per entry, so an override entry replaces the base
		// entry. Without reasserting the declared type, leaving it out would
		// untype the field as surely as restating it.
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Work: work }),
			{ runes: { Work: { metaFields: { status: { label: 'State' } } } } },
			undefined,
			sink,
		);
		expect(merged.runes.Work.metaFields?.status).toEqual({ metaType: 'status', label: 'State' });
		expect(violations).toEqual([]);
	});

	it('does not mutate the override it was handed', () => {
		const override = { metaFields: { status: { metaType: 'category' as const, label: 'X' } } };
		mergeThemeConfig(
			themeConfig({ Work: work }),
			{ runes: { Work: override } },
			undefined,
			() => {},
		);
		expect(override.metaFields.status.metaType).toBe('category');
	});
});

describe('a layout `attrs` map may not set an identity-derived attribute (D4)', () => {
	const card: RuneConfig = {
		block: 'card',
		modifiers: { mode: { source: 'meta' } },
		sections: { body: 'body' },
		layout: { root: ['band'] },
	};

	for (const [attribute, field] of [
		['data-section', 'sections'],
		['typeof', 'schema'],
		['property', 'schema'],
	] as const) {
		it(`refuses \`${attribute}\` with the path and attribute named; other attributes stand`, () => {
			const { violations, sink } = collect();
			const merged = mergeThemeConfig(
				themeConfig({ Card: card }),
				{
					runes: {
						Card: {
							layout: {
								band: {
									tag: 'div',
									children: ['body'],
									attrs: { [attribute]: 'x', 'data-color-scheme': 'dark' },
								},
							},
						},
					},
				},
				undefined,
				sink,
			);

			expect(merged.runes.Card.layout?.band).toEqual({
				tag: 'div',
				children: ['body'],
				attrs: { 'data-color-scheme': 'dark' },
			});
			expect(violations).toHaveLength(1);
			expect(violations[0]).toMatchObject({
				rune: 'Card',
				field,
				attribute,
				path: `runes.Card.layout.band.attrs.${attribute}`,
			});
			expect(violations[0].message).toContain(`"${attribute}"`);
		});
	}

	it('does not refuse `data-zone-layout` — an arrangement is presentation (SPEC-156 D5)', () => {
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({ Card: card }),
			{
				runes: {
					Card: {
						layout: {
							band: { tag: 'div', children: ['body'], attrs: { 'data-zone-layout': 'bar' } },
						},
					},
				},
			},
			undefined,
			sink,
		);
		expect(violations).toEqual([]);
		expect(merged.runes.Card.layout?.band).toMatchObject({ attrs: { 'data-zone-layout': 'bar' } });
		expect(derivedAttributeOwner('data-zone-layout', ['mode'])).toBeUndefined();
	});

	it('derives the refusal from the field, including a declared modifier’s attribute', () => {
		expect(derivedAttributeOwner('data-section')).toBe('sections');
		expect(derivedAttributeOwner('data-sequence')).toBe('sequence');
		expect(derivedAttributeOwner('data-meta-type')).toBe('metaFields.*.metaType');
		expect(derivedAttributeOwner('data-prep-time', ['prepTime'])).toBe('modifiers');
		expect(derivedAttributeOwner('data-prep-time')).toBeUndefined();
	});

	it('reaches a variant delta’s layout and a rune’s own first declaration', () => {
		const { violations, sink } = collect();
		const merged = mergeThemeConfig(
			themeConfig({}),
			{
				runes: {
					Hero: {
						block: 'hero',
						modifiers: { layout: { source: 'meta' } },
						layout: { band: { tag: 'div', children: [], attrs: { typeof: 'Thing' } } },
						variants: {
							layout: {
								split: {
									layout: {
										band: { tag: 'div', children: [], attrs: { 'data-section': 'media', id: 'b' } },
									},
								},
							},
						},
					},
				},
			},
			undefined,
			sink,
		);
		expect(violations.map((v) => v.path)).toEqual([
			'runes.Hero.layout.band.attrs.typeof',
			'runes.Hero.variants.layout.split.layout.band.attrs.data-section',
		]);
		expect(merged.runes.Hero.layout?.band).toMatchObject({ attrs: {} });
		expect(merged.runes.Hero.variants?.layout.split.layout?.band).toMatchObject({
			attrs: { id: 'b' },
		});
	});

	it('`refrakt plugin validate` reports the same refusal as an error', () => {
		const res = validateThemeConfig(
			themeConfig({
				Card: {
					block: 'card',
					layout: { band: { tag: 'div', children: [], attrs: { property: 'name' } } },
				},
			}),
		);
		expect(res.valid).toBe(false);
		expect(res.errors.map((e) => e.path)).toContain('runes.Card.layout.band.attrs.property');
	});

	it('is enforced at config normalisation — once per config, never per render', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { violations, sink } = collect();
		const config = mergeThemeConfig(
			themeConfig({ Card: { block: 'card', layout: { root: ['band'] } } }),
			{
				runes: {
					Card: {
						layout: {
							band: { tag: 'div', children: ['body'], attrs: { 'data-section': 'media' } },
						},
					},
				},
			},
			undefined,
			sink,
		);
		expect(violations).toHaveLength(1);

		const transform = createTransform(config);
		const tree = () =>
			makeTag('section', { 'data-rune': 'card' }, [makeTag('div', { 'data-name': 'body' }, ['x'])]);
		for (let i = 0; i < 3; i++) {
			const out = transform(tree()) as SerializedTag;
			const band = out.children.find(
				(c) => (c as SerializedTag)?.attributes?.['data-name'] === 'band',
			) as SerializedTag;
			expect(band.attributes['data-section']).toBeUndefined();
		}
		// Rendering three times reports nothing more: the config is already clean.
		expect(violations).toHaveLength(1);
		expect(warn).not.toHaveBeenCalled();
	});
});
