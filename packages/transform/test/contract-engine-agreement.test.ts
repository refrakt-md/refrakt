import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { generateStructureContract } from '../src/contracts.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

/**
 * Contract ↔ engine agreement (WORK-525).
 *
 * `refrakt contracts --check` only proves the checked-in file matches what
 * `generateStructureContract` produces *today* — it compares the generator
 * against itself. Nothing has ever compared the generator against the engine,
 * so a change to one that the other does not mirror produces a confidently
 * wrong contract with CI green.
 *
 * These tests close that gap for the claims that can be verified without
 * authoring content: transform a rune, then assert the engine's actual output
 * matches what the contract promised about it.
 *
 * Scope: the modifier families, plus root identity. The contract's other
 * sections (elements, inlineStyles, childOrder, projection) describe the
 * assembly pipeline, which needs real content to exercise — a fixture corpus,
 * filed separately rather than faked here.
 */

const config: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		Card: {
			block: 'card',
			modifiers: {
				tone: { source: 'attribute' },
				size: { source: 'attribute', default: 'md' },
				quiet: { source: 'attribute', noBemClass: true },
				level: { source: 'attribute', valueMap: { '1': 'high' }, mapTarget: 'severity' },
				camelName: { source: 'attribute' },
			},
			staticModifiers: ['boxed', 'flush'],
		},
		Nested: {
			block: 'nested',
			contextModifiers: { card: 'in-card' },
		},
		Plain: { block: 'plain' },
	},
};

const CONTRACT = generateStructureContract(config);
const transform = createTransform(config);

const render = (rune: string, attrs: Record<string, any> = {}, parent?: SerializedTag): SerializedTag => {
	const tag = makeTag('div', { 'data-rune': rune, ...attrs }, []);
	if (!parent) return transform(tag) as SerializedTag;
	const wrapper = { ...parent, children: [tag] };
	const out = transform(wrapper) as SerializedTag;
	return out.children[0] as SerializedTag;
};

const classesOf = (tag: SerializedTag) => String(tag.attributes.class ?? '').split(/\s+/).filter(Boolean);

describe('contract ↔ engine agreement', () => {
	describe('root identity', () => {
		for (const [name, contract] of Object.entries(CONTRACT.runes)) {
			it(`${name}: the engine emits the declared root selector and data-rune`, () => {
				const out = render(contract.dataRune);
				expect(classesOf(out)).toContain(contract.root.slice(1));
				expect(out.attributes['data-rune']).toBe(contract.dataRune);
			});
		}
	});

	describe('modifiers', () => {
		const cardModifiers = CONTRACT.runes.Card.modifiers!;

		it('emits the declared data attribute for each modifier', () => {
			for (const [name, declared] of Object.entries(cardModifiers)) {
				const out = render('card', { [name]: 'x' });
				expect(out.attributes[declared.dataAttribute]).toBeDefined();
			}
		});

		it('emits the declared class pattern, with {value} substituted', () => {
			const declared = cardModifiers.tone;
			const out = render('card', { tone: 'warm' });
			expect(classesOf(out)).toContain(declared.classPattern!.slice(1).replace('{value}', 'warm'));
		});

		it('omits the class for a modifier the contract declares no pattern for', () => {
			// `noBemClass` is expressed in the contract as an absent classPattern.
			expect(cardModifiers.quiet.classPattern).toBeUndefined();
			const out = render('card', { quiet: 'yes' });
			expect(classesOf(out)).not.toContain('rf-card--yes');
		});

		it('applies the declared default when the author sets nothing', () => {
			const declared = cardModifiers.size;
			expect(declared.default).toBe('md');
			const out = render('card');
			expect(out.attributes[declared.dataAttribute]).toBe('md');
		});

		it('routes a mapped value to the declared mapTarget', () => {
			const declared = cardModifiers.level;
			expect(declared.mapTarget).toBe('severity');
			const out = render('card', { level: '1' });
			expect(out.attributes[`data-${declared.mapTarget}`]).toBe(declared.valueMap!['1']);
		});

		it('kebab-cases a camelCase modifier name the same way in both', () => {
			const declared = cardModifiers.camelName;
			expect(declared.dataAttribute).toBe('data-camel-name');
			const out = render('card', { camelName: 'v' });
			expect(out.attributes['data-camel-name']).toBe('v');
		});
	});

	describe('static modifiers', () => {
		it('emits every declared selector, unconditionally', () => {
			const out = render('card');
			for (const declared of CONTRACT.runes.Card.staticModifiers!) {
				expect(classesOf(out)).toContain(declared.selector.slice(1));
			}
		});
	});

	describe('context modifiers', () => {
		it('emits the declared selector when nested in the named parent', () => {
			const declared = CONTRACT.runes.Nested.contextModifiers!.card;
			const nested = render('nested', {}, makeTag('div', { 'data-rune': 'card' }, []));
			expect(classesOf(nested)).toContain(declared.selector.slice(1));
		});

		it('does not emit it at the top level', () => {
			expect(classesOf(render('nested'))).not.toContain('rf-nested--in-card');
		});
	});

	describe('absence is also a claim', () => {
		it('a rune the contract gives no modifiers emits none', () => {
			expect(CONTRACT.runes.Plain.modifiers).toBeUndefined();
			const out = render('plain', { tone: 'warm' });
			expect(classesOf(out)).toEqual(['rf-plain']);
		});
	});
});
