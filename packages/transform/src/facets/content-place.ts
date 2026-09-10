import type { Facet, FacetStyle } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

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

	// WORK-536 — the second clause is the diagnostic-only path. `content-place`
	// reaches this facet as an *axis*, supplied by the generic modifier facet
	// from a config-declared `content-place` modifier. A rune that declares no
	// such modifier therefore never set the axis, `appliesTo` returned false, and
	// the facet never ran — so it never got the chance to say the request had
	// been dropped. Schema narrowing (WORK-534) does not cover this: scoped
	// defaults and embed overrides (ADR-027) apply attribute bags to runes that
	// never spelled the attribute out, and those bypass Markdoc validation
	// entirely. So the facet now also runs on the bare attribute, purely to warn.
	appliesTo: (ctx) => Boolean(ctx.axis('content-place') ?? ctx.tag.attributes?.['content-place']),

	resolve(ctx) {
		const contentPlace = ctx.axis('content-place');

		if (!contentPlace) {
			return {
				warnings: [{
					code: 'content-place-undeclared',
					message: `[refrakt] \`content-place\` on \`${ctx.rune}\` has nothing to anchor — the rune declares no \`content-place\` modifier, so the value is never read. Ignored.`,
					dedupeKey: ctx.rune,
				}],
			};
		}

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

/** Contract description (WORK-527).
 *
 *  `content-place` is itself a config-declared modifier, so it is described
 *  twice — once in the rune's `modifiers` (the attribute and its BEM/data
 *  output) and once here (the custom properties this facet derives from it).
 *  The two halves are genuinely different output. */
export const contentPlaceAxis: UniversalAxisFacet = {
	axis: 'content-place',
	contract: {
		description: 'The cover overlay anchor (SPEC-089): a 2-axis logical placement (block × inline) that also steers the default scrim so it follows the content edge.',
		source: 'meta',
		inputs: ['content-place'],
		customProperties: ['--cover-place-block', '--cover-place-inline', '--cover-scrim-dir', '--cover-scrim-image', '--cover-scrim-mask'],
		condition: 'active only when `media-position` resolves to `cover`; `auto` emits nothing and is left to the CSS container query. `--cover-scrim-dir` here is overridden by an explicit `scrim` edge, which the `cover` axis declares later.',
	},
	describeForRune: (config) => (config.modifiers?.['content-place']
		? null
		: 'this rune declares no `content-place` modifier'),
};
