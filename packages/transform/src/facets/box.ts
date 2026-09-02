import type { Facet } from './types.js';

/** The layout-box axes: `width`, `spacing`, `inset` and `content-measure`.
 *
 *  Grouped in one module because they are the same family — four small,
 *  independent scalars describing how a block rune occupies its track — and
 *  each is a handful of lines. They stay separate *facets*, so the registry
 *  still orders and reports them individually.
 *
 *  All four suppress their default so unmarked output stays byte-identical:
 *  `width="content"`, `spacing="default"` and `inset="default"` emit nothing,
 *  and `content-measure` is emitted only when the rune anchors. */

/** `width` — the track a block rune occupies. */
export const widthFacet: Facet = {
	name: 'width',
	attributes: ['width'],
	resolve(ctx) {
		const value = ctx.tag.attributes?.width ?? ctx.config.defaultWidth;
		if (!value || value === 'content') return null;
		return { axes: { width: value }, classes: [`${ctx.block}--${value}`] };
	},
};

/** `content-measure` — a page-section rune anchors its content to the text
 *  measure when bled to the `wide` track; only the surface/bg widens.
 *
 *  Config-derived rather than author-driven: a reminder that not every axis
 *  reads an attribute. Emitted as a data attribute with no BEM class, and only
 *  when anchored — the `fill` default lets content use the wider track. */
export const contentMeasureFacet: Facet = {
	name: 'content-measure',
	resolve: (ctx) => (ctx.config.contentMeasure === 'anchored'
		? { axes: { 'content-measure': 'anchored' } }
		: null),
};

/** `spacing` — block-level rhythm override. */
export const spacingFacet: Facet = {
	name: 'spacing',
	attributes: ['spacing'],
	resolve(ctx) {
		const value = ctx.tag.attributes?.spacing;
		if (!value || value === 'default') return null;
		return { axes: { spacing: value }, classes: [`${ctx.block}--spacing-${value}`] };
	},
};

/** `inset` — internal padding override. */
export const insetFacet: Facet = {
	name: 'inset',
	attributes: ['inset'],
	resolve(ctx) {
		const value = ctx.tag.attributes?.inset;
		if (!value || value === 'default') return null;
		return { axes: { inset: value }, classes: [`${ctx.block}--inset-${value}`] };
	},
};
