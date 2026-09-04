import type { RendererNode, SerializedTag } from '@refrakt-md/types';
import { isTag } from '../helpers.js';
import type { Facet } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/**
 * Stamp `--rf-reveal-index: N` (0,1,2,… in document order) on a staggered
 * container's cascade items — the elements whose `data-field` or `data-name`
 * equals `itemName` (SPEC-105). Mutates the array in place, merging onto any
 * existing inline style. A matched item is NOT descended into: a nested
 * same-named cascade belongs to that child rune's own stagger pass.
 */
function stampStaggerIndex(children: RendererNode[], itemName: string, counter: { n: number }): void {
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!isTag(child)) continue;
		const isItem = child.attributes?.['data-field'] === itemName
			|| child.attributes?.['data-name'] === itemName;
		if (isItem) {
			const existing = child.attributes?.style ? String(child.attributes.style) : '';
			const decl = `--rf-reveal-index: ${counter.n}`;
			children[i] = {
				...child,
				attributes: { ...child.attributes, style: existing ? `${existing}; ${decl}` : decl },
			};
			counter.n++;
		} else if (child.children.length > 0) {
			stampStaggerIndex(child.children, itemName, counter);
		}
	}
}

/** `motion` — SPEC-105 scroll-reveal entrance.
 *
 *  Pure intent → attributes: the author declares the entrance character (a
 *  closed `reveal` vocabulary validated at parse time by the schema's
 *  `matches`), the theme owns the choreography, and a behaviour owns the
 *  timing. Emits `data-reveal` and `data-stagger`, both styled by attribute
 *  with no BEM class.
 *
 *  `stagger` also stamps `--rf-reveal-index` on the rune's cascade items so
 *  each child's entrance offsets from the container's single in-view trigger.
 *  That walks assembled children, so it belongs to `postAssemble`. */
export const motionFacet: Facet = {
	name: 'motion',
	attributes: ['reveal', 'stagger'],

	resolve(ctx) {
		const reveal = ctx.tag.attributes?.reveal;
		const stagger = Boolean(ctx.tag.attributes?.stagger);
		if (!reveal && !stagger) return null;

		const axes: Record<string, string> = {};
		if (reveal) axes.reveal = String(reveal);
		if (stagger) axes.stagger = '';

		return { axes, ...(stagger ? { carry: true } : {}) };
	},

	postAssemble(ctx, children, carry) {
		// Only when the author set `stagger` and the rune declares its cascade
		// items; otherwise a silent no-op.
		if (carry !== true || !ctx.config.staggerItems) return;
		stampStaggerIndex(children, ctx.config.staggerItems, { n: 0 });
	},
};

/** Contract description (WORK-527).
 *
 *  No `values`: the `reveal` vocabulary is enforced by the schema layer's
 *  `matches`, not by the engine, which passes any value through. Restating it
 *  here would create a second source of truth the contract cannot keep honest. */
export const motionAxis: UniversalAxisFacet = {
	axis: 'motion',
	describeAxis: () => ({
		description: 'Scroll-reveal entrance (SPEC-105). The author declares the character, the theme owns the choreography, a behaviour owns the timing.',
		source: 'attribute',
		inputs: ['reveal', 'stagger'],
		dataAttributes: ['data-reveal', 'data-stagger'],
		customProperties: ['--rf-reveal-index'],
		condition: '`--rf-reveal-index` is stamped on the cascade items named by the rune\'s `staggerItems`; without `staggerItems`, `stagger` marks the root and nothing else',
	}),
	describeForRune: (config) => (config.staggerItems
		? { target: `[data-name="${config.staggerItems}"], [data-field="${config.staggerItems}"]` }
		: null),
};
