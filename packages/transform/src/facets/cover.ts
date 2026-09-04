import { readMeta, findNodeByDataName } from '../helpers.js';
import type { Facet, FacetResult } from './types.js';
import type { UniversalAxisFacet } from './describe.js';

/** SPEC-089 — explicit cover-scrim edge → CSS gradient direction (the heaviest
 *  edge is where the named edge sits). Overrides the content-place default. */
const COVER_SCRIM_DIR: Record<string, string> = {
	top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right',
};

/** The scrim meta fields the media well claims in cover mode. */
const SCRIM_META = ['scrim', 'scrim-type', 'scrim-blur', 'scrim-tone'];

/** `cover` — SPEC-089 media-position="cover" chrome.
 *
 *  In cover mode the rune's media fills the surface and its content sits over
 *  it, so the scrim facet is rerouted from the self-surface bg layer to the
 *  media well. This facet owns the cover half of that split: it publishes the
 *  `cover` state the bg layer and `content-place` both branch on, claims the
 *  scrim metas so the strip pass cannot leak them, and flips the overlaid
 *  content to a dark colour scheme once the tree is assembled.
 *
 *  Ordered after `content-place` so its explicit `--cover-scrim-dir` is
 *  declared last and wins in CSS — the override the two comments describe is a
 *  registry constraint here rather than an accident of statement order. */
export const coverFacet: Facet = {
	name: 'cover',
	// `modifiers` supplies `media-position`; `tint` because postAssemble yields
	// to a scheme it already claimed.
	after: ['modifiers', 'content-place', 'tint'],

	appliesTo: (ctx) => ctx.axis('media-position') === 'cover',

	resolve(ctx) {
		const result: FacetResult = {
			// Not emitted: this is branch state for bg and content-place, not an
			// output attribute.
			state: { cover: 'true' },
			// The media well consumes the scrim facet even when no bg layer was
			// built, so claim the metas unconditionally in cover mode.
			consumes: [...SCRIM_META],
			dataAttrs: {},
			styles: [],
		};

		const scrim = readMeta(ctx.tag, 'scrim');

		// `scrim="none"` disables the default scrim; signalled to CSS on the host.
		if (scrim === 'none') {
			result.dataAttrs!['data-scrim'] = 'none';
		}

		// Scrim treatment: gradient (default) or frost (a frosted-glass blur over
		// the media). Both render on the media well's `::after` (cover.css); the
		// type + blur amount ride on the host as data attrs.
		const scrimType = readMeta(ctx.tag, 'scrim-type');
		if (scrimType && scrim !== 'none') {
			result.dataAttrs!['data-scrim-type'] = scrimType;
			if (scrimType === 'frost') {
				const scrimBlur = readMeta(ctx.tag, 'scrim-blur');
				if (scrimBlur) result.dataAttrs!['data-scrim-blur'] = scrimBlur;
			}
		}

		// An explicit scrim direction pins the default-scrim gradient, overriding
		// the content-place-derived direction. Declared after that facet's, so the
		// duplicate declaration resolves this way round in CSS.
		const dir = COVER_SCRIM_DIR[scrim ?? ''];
		if (dir) result.styles!.push(['--cover-scrim-dir', dir]);

		return result;
	},

	postAssemble(ctx, children) {
		// Foreground polarity follows `scrim-tone` (a dark scrim wants light text
		// → a dark scheme; a light scrim wants dark text → a light scheme). The
		// scheme is scoped to the *overlay*, not the rune root, so the card's own
		// surface (the padded edge around the media well) keeps the page palette —
		// only the text sitting on the darkened media flips. Full scope flips the
		// `content` overlay; header scope flips the cover-band (the variant layout
		// carries the scheme via its `attrs`). An explicit tint/scheme wins.
		const scrim = readMeta(ctx.tag, 'scrim');
		if (scrim === 'none') return;
		if (ctx.config.rootAttributes?.['data-cover-scope'] === 'header') return;
		if (ctx.axis('color-scheme')) return;

		const overlay = findNodeByDataName(children, 'content');
		if (!overlay) return;
		overlay.attributes = {
			...overlay.attributes,
			'data-color-scheme': readMeta(ctx.tag, 'scrim-tone') ?? 'dark',
		};
	},
};

/** Contract description (WORK-527).
 *
 *  Cover mode is reached through the `media-position` config modifier, so the
 *  axis is available only on runes that declare one — this is the one universal
 *  axis whose gate is another rune's config modifier rather than a section role
 *  or a target. */
export const coverAxis: UniversalAxisFacet = {
	axis: 'cover',
	contract: {
		description: 'Cover-mode chrome (SPEC-089): with `media-position="cover"` the media fills the surface and the content sits over it, so the scrim is rerouted from the background layer to the media well.',
		source: 'meta',
		inputs: SCRIM_META,
		dataAttributes: ['data-scrim', 'data-scrim-type', 'data-scrim-blur'],
		customProperties: ['--cover-scrim-dir'],
		target: 'the rune root, except `data-color-scheme`, which is scoped to the `[data-name="content"]` overlay so only text on the darkened media flips',
		condition: 'active only when `media-position` resolves to `cover`',
	},
	describeForRune: (config) => (config.modifiers?.['media-position']
		? null
		: 'this rune declares no `media-position` modifier, so it cannot enter cover mode'),
};
