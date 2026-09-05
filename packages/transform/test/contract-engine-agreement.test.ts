import { describe, it, expect, vi } from 'vitest';
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
 * Scope: the modifier families, root identity, and the universal axes
 * (WORK-527). The contract's other sections (elements, inlineStyles,
 * childOrder, projection) describe the assembly pipeline, which needs real
 * content to exercise — a fixture corpus, filed separately rather than faked
 * here.
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

// ─── Universal axes (WORK-527) ────────────────────────────────────────────
//
// Before WORK-527 the contract said nothing at all about these — no
// `[data-elevation]`, no `.rf-card--tinted`, no `.rf-hero--has-bg`. Now that it
// does, the claims need the same engine check as the modifier families, or the
// new section is just a second thing that can drift.

const axisConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	tints: { forest: { light: { bg: '#e8f0e8' } } },
	runes: {
		// Every gate open: a header role, a body role, a media zone, cascade items,
		// an anchored measure, and the two cover-mode modifiers.
		Panel: {
			block: 'panel',
			sections: { title: 'header', body: 'body', figure: 'media' },
			defaultElevation: 'raised',
			defaultDensity: 'compact',
			defaultReading: 'prose',
			staggerItems: 'item',
			contentMeasure: 'anchored',
			modifiers: {
				'media-position': { source: 'meta', noBemClass: true },
				'content-place': { source: 'meta', noBemClass: true },
			},
		},
		// Every gate shut: no sections, no modifiers, no defaults.
		Chip: { block: 'chip' },
	},
};

const AXIS_CONTRACT = generateStructureContract(axisConfig);
const UNIVERSAL = AXIS_CONTRACT.universalAxes;
const axisTransform = createTransform(axisConfig);

const meta = (field: string, content: string) => makeTag('meta', { 'data-field': field, content }, []);

/** Render a rune with a `[data-name]` child for each named section, so the
 *  axes that land on a section (`reading`, `dropcap`) have somewhere to go. */
const renderAxis = (
	rune: string,
	attrs: Record<string, any> = {},
	metas: Array<[string, string]> = [],
	names: string[] = ['title', 'body', 'figure', 'item'],
): SerializedTag => {
	const children = [
		...metas.map(([f, c]) => meta(f, c)),
		...names.map(n => makeTag('div', { 'data-name': n }, [])),
	];
	return axisTransform(makeTag('div', { 'data-rune': rune, ...attrs }, children)) as SerializedTag;
};

const findByName = (tag: SerializedTag, name: string): SerializedTag | undefined => {
	for (const child of tag.children) {
		if (typeof child !== 'object' || child === null || !('attributes' in child)) continue;
		const t = child as SerializedTag;
		if (t.attributes?.['data-name'] === name) return t;
		const nested = findByName(t, name);
		if (nested) return nested;
	}
	return undefined;
};

describe('contract ↔ engine agreement: universal axes', () => {
	describe('the top-level description', () => {
		it('gives every axis a description, a source and its inputs', () => {
			for (const [axis, declared] of Object.entries(UNIVERSAL)) {
				expect(declared.description, `${axis}: no description`).toBeTruthy();
				expect(['attribute', 'meta', 'config']).toContain(declared.source);
				expect(declared.inputs.length, `${axis}: no inputs`).toBeGreaterThan(0);
			}
		});

		it('uses the {block} placeholder in every declared selector', () => {
			for (const [axis, declared] of Object.entries(UNIVERSAL)) {
				for (const selector of declared.selectors ?? []) {
					expect(selector, `${axis}: ${selector} is not block-relative`).toContain('{block}');
				}
				if (declared.classPattern) expect(declared.classPattern).toContain('{block}');
			}
		});

		it('expands {token} only where a token vocabulary is declared', () => {
			for (const [axis, declared] of Object.entries(UNIVERSAL)) {
				const usesToken = [...declared.inputs, ...(declared.customProperties ?? [])]
					.some(s => s.includes('{token}'));
				if (usesToken) expect(declared.tokens, `${axis}: {token} with no tokens`).toBeTruthy();
			}
		});
	});

	describe('elevation', () => {
		const declared = () => UNIVERSAL.elevation;

		it('emits the declared data attribute for every value in the vocabulary', () => {
			for (const value of declared().values!) {
				const out = renderAxis('panel', { elevation: value });
				expect(out.attributes[declared().dataAttributes![0]]).toBe(value);
			}
		});

		it('applies the rune default the contract records', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes!.axes!.elevation.default).toBe('raised');
			expect(renderAxis('panel').attributes['data-elevation']).toBe('raised');
		});

		it('emits nothing on a rune the contract records no default for', () => {
			expect(AXIS_CONTRACT.runes.Chip.universalAxes?.axes?.elevation).toBeUndefined();
			expect(renderAxis('chip').attributes['data-elevation']).toBeUndefined();
		});
	});

	describe('prominence', () => {
		it('emits on the rune the contract leaves available', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes?.unavailable?.prominence).toBeUndefined();
			const out = renderAxis('panel', { prominence: 'display' });
			expect(out.attributes['data-prominence']).toBe('display');
		});

		it('emits nothing on the rune the contract marks unavailable', () => {
			expect(AXIS_CONTRACT.runes.Chip.universalAxes!.unavailable!.prominence).toBeTruthy();
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const out = renderAxis('chip', { prominence: 'display' }, [], []);
			expect(out.attributes['data-prominence']).toBeUndefined();
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});
	});

	describe('tint', () => {
		it('emits the block-substituted selector the rune contract names', () => {
			for (const rune of ['Panel', 'Chip'] as const) {
				const selector = AXIS_CONTRACT.runes[rune].universalAxes!.axes!.tint.selectors![0];
				const out = renderAxis(AXIS_CONTRACT.runes[rune].dataRune, {}, [['tint', 'forest']]);
				expect(classesOf(out)).toContain(selector.slice(1));
			}
		});

		it('emits the declared data attributes and custom properties', () => {
			const declared = UNIVERSAL.tint;
			const out = renderAxis('panel', {}, [['tint', 'forest']]);
			expect(out.attributes['data-tint']).toBe('forest');
			const prop = declared.customProperties![0].replace('{token}', declared.tokens![0]);
			expect(String(out.attributes.style)).toContain(prop);
		});
	});

	describe('bg', () => {
		it('emits the block-substituted selector and the declared root attribute', () => {
			const selector = AXIS_CONTRACT.runes.Panel.universalAxes!.axes!.bg.selectors![0];
			const out = renderAxis('panel', {}, [['bg-src', '/hero.jpg']]);
			expect(classesOf(out)).toContain(selector.slice(1));
			expect(out.attributes['data-bg']).toBe('');
		});

		it('injects the declared layer element', () => {
			const out = renderAxis('panel', {}, [['bg-src', '/hero.jpg']]);
			expect(UNIVERSAL.bg.elements).toContain('[data-name="bg"]');
			expect(findByName(out, 'bg')).toBeDefined();
		});
	});

	describe('box axes', () => {
		it('emits the declared class pattern, with {block} and {value} substituted', () => {
			const cases: Array<[string, string]> = [['width', 'wide'], ['spacing', 'loose'], ['inset', 'tight']];
			for (const [axis, value] of cases) {
				const pattern = UNIVERSAL[axis].classPattern!;
				const expected = pattern.slice(1).replace('{block}', 'rf-panel').replace('{value}', value);
				const out = renderAxis('panel', { [axis]: value });
				expect(classesOf(out), `${axis}=${value}`).toContain(expected);
				expect(out.attributes[UNIVERSAL[axis].dataAttributes![0]]).toBe(value);
			}
		});

		it('honours the suppressed default the condition describes', () => {
			expect(renderAxis('panel', { width: 'content' }).attributes['data-width']).toBeUndefined();
			expect(renderAxis('panel', { spacing: 'default' }).attributes['data-spacing']).toBeUndefined();
			expect(renderAxis('panel', { inset: 'default' }).attributes['data-inset']).toBeUndefined();
		});

		it('emits content-measure exactly where the contract records it', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes!.axes!['content-measure'].default).toBe('anchored');
			expect(renderAxis('panel').attributes['data-content-measure']).toBe('anchored');
			expect(AXIS_CONTRACT.runes.Chip.universalAxes?.axes?.['content-measure']).toBeUndefined();
			expect(renderAxis('chip').attributes['data-content-measure']).toBeUndefined();
		});
	});

	describe('density', () => {
		it('is always present, as the condition claims', () => {
			expect(renderAxis('panel').attributes['data-density']).toBeDefined();
			expect(renderAxis('chip').attributes['data-density']).toBeDefined();
		});

		it('falls back to the declared top-level default when the rune sets none', () => {
			expect(AXIS_CONTRACT.runes.Chip.universalAxes?.axes?.density).toBeUndefined();
			expect(renderAxis('chip').attributes['data-density']).toBe(UNIVERSAL.density.default);
		});

		it('uses the rune default the contract records', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes!.axes!.density.default).toBe('compact');
			expect(renderAxis('panel').attributes['data-density']).toBe('compact');
		});
	});

	describe('reading and dropcap', () => {
		it('land on the declared target, not the rune root', () => {
			expect(UNIVERSAL.reading.target).toBe('[data-section="body"]');
			const out = renderAxis('panel', { dropcap: 'true' });
			expect(out.attributes['data-reading']).toBeUndefined();
			const body = findByName(out, 'body')!;
			expect(body.attributes['data-reading']).toBe('prose');
			expect(body.attributes['data-dropcap']).toBe('true');
		});

		it('are absent on the rune the contract marks unavailable', () => {
			const unavailable = AXIS_CONTRACT.runes.Chip.universalAxes!.unavailable!;
			expect(unavailable.reading).toBeTruthy();
			expect(unavailable.dropcap).toBeTruthy();
			const out = renderAxis('chip', { reading: 'prose', dropcap: 'true' }, [], ['body']);
			expect(findByName(out, 'body')!.attributes['data-reading']).toBeUndefined();
			expect(findByName(out, 'body')!.attributes['data-dropcap']).toBeUndefined();
		});
	});

	describe('motion', () => {
		it('emits the declared data attributes', () => {
			const out = renderAxis('panel', { reveal: 'fade', stagger: 'true' });
			for (const attr of UNIVERSAL.motion.dataAttributes!) {
				expect(out.attributes[attr], attr).toBeDefined();
			}
		});

		it('stamps the declared custom property on the rune\'s recorded stagger target', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes!.axes!.motion.target).toContain('item');
			const out = renderAxis('panel', { stagger: 'true' });
			const item = findByName(out, 'item')!;
			expect(String(item.attributes.style)).toContain(UNIVERSAL.motion.customProperties![0]);
		});

		it('stamps nothing on a rune the contract records no stagger target for', () => {
			expect(AXIS_CONTRACT.runes.Chip.universalAxes?.axes?.motion).toBeUndefined();
			const out = renderAxis('chip', { stagger: 'true' }, [], ['item']);
			expect(findByName(out, 'item')!.attributes.style).toBeUndefined();
		});
	});

	describe('frame', () => {
		it('lands on the surface the rune contract names', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes!.axes!.frame.target).toBe('[data-section="media"]');
			const out = renderAxis('panel', {}, [['frame', 'polaroid'], ['frame-aspect', '4/3']]);
			expect(out.attributes['data-frame']).toBeUndefined();
			expect(findByName(out, 'figure')!.attributes['data-frame']).toBe('polaroid');
		});

		it('emits nothing on the rune the contract marks unavailable', () => {
			expect(AXIS_CONTRACT.runes.Chip.universalAxes!.unavailable!.frame).toBeTruthy();
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const out = renderAxis('chip', {}, [['frame', 'polaroid']], []);
			expect(out.attributes['data-frame']).toBeUndefined();
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});
	});

	describe('substrate', () => {
		it('defaults to the rune root, as the condition claims', () => {
			expect(AXIS_CONTRACT.runes.Panel.universalAxes?.axes?.substrate).toBeUndefined();
			const out = renderAxis('panel', {}, [['substrate', 'dots'], ['substrate-size', 'md']]);
			expect(out.attributes['data-substrate']).toBe('dots');
			expect(String(out.attributes.style)).toContain(UNIVERSAL.substrate.customProperties![0]);
		});
	});

	describe('cover and content-place', () => {
		it('are available on the rune that declares the gating modifiers', () => {
			const unavailable = AXIS_CONTRACT.runes.Panel.universalAxes?.unavailable ?? {};
			expect(unavailable.cover).toBeUndefined();
			expect(unavailable['content-place']).toBeUndefined();
			const out = renderAxis('panel', {}, [
				['media-position', 'cover'],
				['content-place', 'start center'],
				['scrim', 'top'],
			]);
			expect(String(out.attributes.style)).toContain('--cover-place-block');
			expect(String(out.attributes.style)).toContain('--cover-scrim-dir');
		});

		it('emit nothing on the rune the contract marks them unavailable on', () => {
			const unavailable = AXIS_CONTRACT.runes.Chip.universalAxes!.unavailable!;
			expect(unavailable.cover).toBeTruthy();
			expect(unavailable['content-place']).toBeTruthy();
			const out = renderAxis('chip', {}, [['media-position', 'cover'], ['scrim', 'top']], []);
			expect(out.attributes.style).toBeUndefined();
			expect(out.attributes['data-scrim-type']).toBeUndefined();
		});
	});

	describe('every recorded unavailability is honest', () => {
		// A rune-level `unavailable` entry claims the axis emits nothing on that
		// rune. Drive each one through the engine with its inputs set and assert
		// none of its declared attributes come back.
		//
		// Scoped to the rune root for an axis that declares a `target`, because an
		// attribute name is not owned by one facet: `scrim` is an input to both
		// `cover` (which marks the root) and `bg` (which builds a scrim *element*
		// carrying `data-scrim`). A tree-wide scan cannot tell those apart, so it
		// would fail on `cover` for output `bg` legitimately produced. The
		// child-surface half is covered by the targeted reading/dropcap/frame
		// tests above.
		const attrsIn = (tag: SerializedTag, out: Set<string>): Set<string> => {
			for (const k of Object.keys(tag.attributes ?? {})) out.add(k);
			for (const child of tag.children ?? []) {
				if (child && typeof child === 'object' && 'attributes' in child) attrsIn(child as SerializedTag, out);
			}
			return out;
		};

		for (const [runeName, contract] of Object.entries(AXIS_CONTRACT.runes)) {
			for (const axis of Object.keys(contract.universalAxes?.unavailable ?? {})) {
				it(`${runeName}: ${axis} emits none of its declared attributes`, () => {
					const declared = UNIVERSAL[axis];
					const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
					const attrInputs = declared.source === 'attribute'
						? Object.fromEntries(declared.inputs.map(i => [i, 'x']))
						: {};
					const metaInputs: Array<[string, string]> = declared.source === 'meta'
						? declared.inputs.filter(i => !i.includes('{')).map(i => [i, 'x'] as [string, string])
						: [];
					const out = renderAxis(contract.dataRune, attrInputs, metaInputs);
					const present = declared.target
						? new Set(Object.keys(out.attributes ?? {}))
						: attrsIn(out, new Set());
					for (const attr of declared.dataAttributes ?? []) {
						expect(present, `${attr} present despite "${contract.universalAxes!.unavailable![axis]}"`)
							.not.toContain(attr);
					}
					warn.mockRestore();
				});
			}
		}
	});
});
