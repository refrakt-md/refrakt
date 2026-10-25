import { describe, it, expect } from 'vitest';
import { createTransform, resolveSequenceStyle } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { RuneConfig, ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

/**
 * SPEC-147 / WORK-649 — `sequence` takes a modifier source, the form
 * `sequenceDirection` already had, so a rune whose sequence style depends on a
 * modifier declares it rather than writing a `postTransform` (as `plot` did).
 */

function render(sequence: RuneConfig['sequence'], structure?: string): SerializedTag {
	const config: ThemeConfig = {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {},
		runes: {
			Story: {
				block: 'story',
				modifiers: { structure: { source: 'meta' } },
				sequence,
			},
		},
	};
	const fields = structure === undefined ? {} : { structure };
	const tree = makeTag(
		'section',
		{ 'data-rune': 'story', 'data-rune-fields': JSON.stringify(fields) },
		[makeTag('ol', {}, [makeTag('li', {}, ['one'])])],
	);
	return createTransform(config)(tree) as SerializedTag;
}

const sequenceOf = (out: SerializedTag) =>
	(out.children.find((c) => (c as SerializedTag)?.name === 'ol') as SerializedTag).attributes[
		'data-sequence'
	];

describe('`sequence` from a modifier (SPEC-147)', () => {
	const fromStructure = { fromModifier: 'structure', valueMap: { linear: 'connected' as const } };

	it('maps the modifier value through `valueMap`', () => {
		expect(sequenceOf(render(fromStructure, 'linear'))).toBe('connected');
	});

	it('annotates nothing for an unmapped value with no `default`', () => {
		expect(sequenceOf(render(fromStructure, 'web'))).toBeUndefined();
		expect(sequenceOf(render(fromStructure))).toBeUndefined();
	});

	it('falls back to `default` for an unmapped or unset value', () => {
		const withDefault = { ...fromStructure, default: 'plain' as const };
		expect(sequenceOf(render(withDefault, 'web'))).toBe('plain');
		expect(sequenceOf(render(withDefault))).toBe('plain');
	});

	it('uses the value itself when there is no `valueMap`, as `sequenceDirection` does', () => {
		expect(sequenceOf(render({ fromModifier: 'structure' }, 'numbered'))).toBe('numbered');
		expect(sequenceOf(render({ fromModifier: 'structure', default: 'plain' }))).toBe('plain');
	});

	it('keeps the literal form unchanged', () => {
		expect(sequenceOf(render('numbered', 'linear'))).toBe('numbered');
		expect(resolveSequenceStyle('connected', {})).toBe('connected');
		expect(resolveSequenceStyle(undefined, { structure: 'linear' })).toBeUndefined();
	});
});
