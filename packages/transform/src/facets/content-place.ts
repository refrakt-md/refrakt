import type { Facet, FacetStyle } from './types.js';

/** `content-place` — SPEC-089, the cover overlay anchor.
 *
 *  A 2-axis logical placement (block × inline); `auto` is left to the container
 *  query in CSS. Active only in cover mode — outside an overlay it has nothing
 *  to anchor, so it is dropped with a warn-once rather than silently honoured.
 *
 *  Declares `after: ['modifiers']` — `media-position` is a config-declared
 *  modifier, so the generic modifier facet is what supplies the axis it
 *  branches on. */
export const contentPlaceFacet: Facet = {
	name: 'content-place',
	after: ['modifiers'],

	appliesTo: (ctx) => Boolean(ctx.axis('content-place')),

	resolve(ctx) {
		const contentPlace = ctx.axis('content-place')!;

		if (ctx.axis('media-position') !== 'cover') {
			return {
				warnings: [{
					code: 'content-place-outside-cover',
					message: `[refrakt] \`content-place\` on \`${ctx.rune}\` is only active in \`media-position="cover"\` — it anchors the overlay, and there's no overlay outside cover. Ignored.`,
					dedupeKey: ctx.rune,
				}],
			};
		}

		if (contentPlace === 'auto') return null;

		const [blockAxis, inlineAxis] = contentPlace.trim().split(/\s+/);
		const styles: FacetStyle[] = [];
		if (blockAxis) styles.push(['--cover-place-block', blockAxis]);
		if (inlineAxis) styles.push(['--cover-place-inline', inlineAxis]);

		// Scrim follows the content edge. The default linear gradient handles
		// `start` (flip to `to bottom`) and `end` (the default `to top`). For
		// `center` a linear gradient can't centre a band, so emit a radial scrim
		// (and a radial mask for the frost variant) keyed off the same percentage
		// stops as the linear default — cover.css falls through to the linear
		// gradient via `var()` defaults when these aren't set.
		if (blockAxis === 'start') {
			styles.push(['--cover-scrim-dir', 'to bottom']);
		} else if (blockAxis === 'center') {
			// `farthest-side` extent makes 100% radius land on the box's edges
			// instead of the (much further) corners — without this, the default
			// `farthest-corner` shape leaves the outer ~30% of width on a wide
			// aspect (e.g. 16:9) entirely outside the gradient, so text near the
			// left/right edges gets no scrim coverage. The dark also stays solid
			// out to 40% radius (matching the linear's `0%, 62%` visual weight
			// without the dramatic falloff radial gives at the corners).
			styles.push(['--cover-scrim-image', 'radial-gradient(ellipse farthest-side at center, rgb(0 0 0 / 0.55) 40%, transparent 100%)']);
			styles.push(['--cover-scrim-mask', 'radial-gradient(ellipse farthest-side at center, #000 50%, transparent 100%)']);
		}

		return { styles };
	},
};
