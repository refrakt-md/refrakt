import { readMeta } from '../helpers.js';
import type { RuneConfig } from '../types.js';
import type { Facet, FacetContext } from './types.js';
import type { DescribableFacet, FacetContract } from './describe.js';

/** Read a modifier value: prefer the parsed `data-rune-fields` bag (a scalar
 *  there equals the legacy meta's `content`, so the result is unchanged),
 *  falling back to the `<meta data-field>` child when the key is absent or
 *  non-scalar. Mirrors the engine's `readField`. */
function readFieldValue(ctx: FacetContext, name: string, def?: string): string | undefined {
	const v = ctx.fields[name];
	if (v !== undefined && v !== null && typeof v !== 'object') return v as string;
	return readMeta(ctx.tag, name, def);
}

/** `modifiers` — the generic config-declared modifier loop.
 *
 *  Every rune goes through this: for each entry in `config.modifiers` it
 *  resolves a value from the typed field channel or an author attribute, emits
 *  it as an axis (and so as a `data-*` attribute), and adds a BEM modifier
 *  class unless the entry opts out with `noBemClass`.
 *
 *  Registered first, so its axes are visible to every other facet through
 *  `ctx.axis()` — `media-position` and `content-place` were the last two
 *  entries in the migration's seeding scaffolding, and this retires them. */
export const modifiersFacet: Facet = {
	name: 'modifiers',

	resolve(ctx) {
		if (!ctx.config.modifiers) return null;

		const axes: Record<string, string> = {};
		const classes: string[] = [];
		const dataAttrs: Record<string, string> = {};
		const stripAttrs: string[] = [];

		for (const [name, mod] of Object.entries(ctx.config.modifiers)) {
			// An attribute-sourced modifier is consumed: it is expressed as a
			// `data-*` attribute and a BEM class, so it must not pass through.
			if (mod.source === 'attribute') stripAttrs.push(name);

			const value = mod.source === 'meta'
				? readFieldValue(ctx, name, mod.default)
				: ctx.tag.attributes[name] ?? mod.default;

			if (value) {
				axes[name] = value;
				if (!mod.noBemClass) classes.push(`${ctx.block}--${value}`);
				// Value mapping: translate the raw value through `valueMap`, either
				// in place or onto a separate `mapTarget` attribute.
				if (mod.valueMap) {
					const mapped = mod.valueMap[value] ?? value;
					if (mod.mapTarget) {
						const key = mod.mapTarget.startsWith('data-') ? mod.mapTarget : `data-${mod.mapTarget}`;
						dataAttrs[key] = mapped;
					} else {
						axes[name] = mapped;
					}
				}
			} else if (value === '') {
				// Present but empty (e.g. `title=""`) — recorded so `renderWhenEmpty`
				// fields can tell present-empty from absent. No BEM class (it would
				// be a dangling `block--`) and no mapping.
				axes[name] = '';
			}
		}

		return {
			...(Object.keys(axes).length ? { axes } : {}),
			...(classes.length ? { classes } : {}),
			...(Object.keys(dataAttrs).length ? { dataAttrs } : {}),
			...(stripAttrs.length ? { stripAttrs } : {}),
		};
	},
};

/** `context-modifiers` — a BEM modifier added when a rune is nested inside a
 *  matching parent rune. Keyed by the parent's kebab-case `data-rune`. */
export const contextModifiersFacet: Facet = {
	name: 'context-modifiers',

	resolve(ctx) {
		const suffix = ctx.parentRune ? ctx.config.contextModifiers?.[ctx.parentRune] : undefined;
		return suffix ? { classes: [`${ctx.block}--${suffix}`] } : null;
	},
};

/** `static-modifiers` — BEM modifier suffixes a rune always carries. */
export const staticModifiersFacet: Facet = {
	name: 'static-modifiers',

	resolve(ctx) {
		const mods = ctx.config.staticModifiers;
		if (!mods?.length) return null;
		return { classes: mods.map(mod => `${ctx.block}--${mod}`) };
	},
};

// ─── Static contract description (WORK-525) ───────────────────────────────
//
// These three facets are the only ones whose output `refrakt contracts`
// describes, so they are the only ones with a `describe`. It mirrors `resolve`
// from config alone — necessarily a separate function, because a contract has
// no rune instance to transform. `contract-engine-agreement.test.ts` is what
// keeps the two honest; co-location alone would not.

export const modifiersDescribe: DescribableFacet = {
	name: 'modifiers',
	describe(config: RuneConfig, block: string): FacetContract | null {
		if (!config.modifiers || Object.keys(config.modifiers).length === 0) return null;
		const modifiers: NonNullable<FacetContract['modifiers']> = {};
		for (const [name, mod] of Object.entries(config.modifiers)) {
			const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase();
			modifiers[name] = {
				source: mod.source,
				...(mod.default !== undefined ? { default: mod.default } : {}),
				...(mod.noBemClass ? {} : { classPattern: `.${block}--{value}` }),
				dataAttribute: `data-${kebab}`,
				...(mod.valueMap ? { valueMap: mod.valueMap } : {}),
				...(mod.mapTarget ? { mapTarget: mod.mapTarget } : {}),
			};
		}
		return { modifiers };
	},
};

export const contextModifiersDescribe: DescribableFacet = {
	name: 'context-modifiers',
	describe(config: RuneConfig, block: string): FacetContract | null {
		if (!config.contextModifiers || Object.keys(config.contextModifiers).length === 0) return null;
		const contextModifiers: NonNullable<FacetContract['contextModifiers']> = {};
		for (const [parent, suffix] of Object.entries(config.contextModifiers)) {
			contextModifiers[parent] = { suffix, selector: `.${block}--${suffix}` };
		}
		return { contextModifiers };
	},
};

export const staticModifiersDescribe: DescribableFacet = {
	name: 'static-modifiers',
	describe(config: RuneConfig, block: string): FacetContract | null {
		if (!config.staticModifiers?.length) return null;
		return {
			staticModifiers: config.staticModifiers.map(name => ({ name, selector: `.${block}--${name}` })),
		};
	},
};
