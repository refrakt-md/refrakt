/**
 * The universal attributes every block rune may carry, as schema attributes —
 * narrowed per rune by `resolveUniversalAttributes` (SPEC-125 Phase 3). A
 * module of its own so a composition definition's `defaults` (SPEC-145 D34) can
 * check a value against the attribute it defaults without importing the schema
 * builder.
 */
import type { SchemaAttribute } from '@markdoc/markdoc';

export const universalAttributes: Record<string, SchemaAttribute> = {
	tint: { type: String, required: false, description: 'Color tint preset applied to this block' },
	'tint-mode': {
		type: String,
		required: false,
		matches: ['auto', 'dark', 'light'],
		description: 'Whether the tint adapts to auto, dark, or light mode',
	},
	bg: { type: String, required: false, description: 'Background preset applied to this block' },
	width: {
		type: String,
		required: false,
		matches: ['compact', 'narrow', 'content', 'wide', 'full'],
		description: 'Maximum width constraint for this block',
	},
	reading: {
		type: String,
		required: false,
		matches: ['fine', 'ui', 'prose'],
		description:
			'Reading register for this block’s body (SPEC-108): fine | ui | prose. The theme owns the editorial treatment.',
	},
	dropcap: {
		type: Boolean,
		required: false,
		description:
			'Style the opening letter of a prose body as a drop cap (SPEC-108). Honoured only when the body reads as prose; ignored otherwise.',
	},
	spacing: {
		type: String,
		required: false,
		matches: ['flush', 'tight', 'default', 'loose', 'breathe'],
		description: 'Vertical spacing above and below this block',
	},
	inset: {
		type: String,
		required: false,
		matches: ['flush', 'tight', 'default', 'loose', 'breathe'],
		description: 'Inner padding of this block',
	},
	// SPEC-107 — `elevation` is a depth ladder. The legacy shadow-scale values
	// (none/sm/md/lg) stay in `matches` so authored content still validates during
	// the deprecation window; the engine maps them onto the ladder with a warning.
	elevation: {
		type: String,
		required: false,
		matches: ['sunken', 'flush', 'flat', 'raised', 'floating', 'overlay', 'none', 'sm', 'md', 'lg'],
		description:
			'Surface depth on the SPEC-107 ladder (sunken→overlay); none/sm/md/lg are deprecated aliases',
	},
	prominence: {
		type: String,
		required: false,
		matches: ['quiet', 'normal', 'prominent', 'display'],
		description: 'Section-header emphasis (only on page-section-header family runes)',
	},
	// SPEC-105 — scroll-reveal motion. `reveal` is a closed entrance vocabulary
	// (author declares intent; the theme owns choreography, a behaviour owns
	// timing); an unknown value is a build error via Markdoc `matches`. `stagger`
	// cascades a multi-child block's items in — a silent no-op on single-child runes.
	reveal: {
		type: String,
		required: false,
		matches: ['none', 'fade', 'slide', 'scale', 'blur'],
		description:
			'Scroll-reveal entrance character (none|fade|slide|scale|blur); the theme owns the choreography',
	},
	stagger: {
		type: Boolean,
		required: false,
		description: "Cascade this block's items in as it reveals (no-op on single-child runes)",
	},
	// SPEC-086 — frame: media-surface chrome preset + inline facet overrides.
	frame: {
		type: String,
		required: false,
		description: "Named frame preset presenting this block's media surface",
	},
	'frame-aspect': {
		type: String,
		required: false,
		description: 'Aspect ratio of the framed media, e.g. "16/9"',
	},
	'frame-displace': {
		type: String,
		required: false,
		// `both` was missing until SPEC-132's validation pass reported
		// `{% showcase frame-displace="both" %}` as out-of-enum — while Lumina
		// has styled `[data-displace="both"]` all along. The schema and the
		// stylesheet disagreed, the page rendered correctly, and nothing else in
		// the toolchain compares those two.
		matches: ['top', 'bottom', 'end', 'bottom-end', 'top-end', 'both'],
		description: 'Edge/corner the framed guest moves toward',
	},
	'frame-displace-mode': {
		type: String,
		required: false,
		matches: ['peek', 'bleed'],
		description:
			'How displacement renders: `peek` (default) translates the guest visually inside its frame target; `bleed` uses negative margin on the media zone so following layout pulls up — extends past a section like a hero without leaving a gap above',
	},
	'frame-offset': {
		type: String,
		required: false,
		matches: ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
		description:
			'Displacement distance (non-linear named scale: sm…xl ride the block-spacing tokens, 2xl/3xl/4xl step up to section-spacing for bleed-mode displacements that clear a section edge)',
	},
	'frame-oversize': {
		type: String,
		required: false,
		description: 'How far the guest exceeds its slot (scale factor)',
	},
	'frame-place': {
		type: String,
		required: false,
		description: 'Guest-box alignment in the slot (e.g. "left top")',
	},
	'frame-anchor': {
		type: String,
		required: false,
		description: 'Crop focal point when the guest is cut (object-position)',
	},
	'frame-overflow': {
		type: String,
		required: false,
		matches: ['clip', 'bleed'],
		description:
			'How the frame handles a guest whose content is wider than it: `clip` (default) keeps it inside the rounded frame; `bleed` runs an overflowing guest out to the layout edge on a narrow viewport so it reads as cropped by the screen (a bleed host only — hero/feature)',
	},
	'frame-shadow': {
		type: String,
		required: false,
		matches: ['none', 'sm', 'md', 'lg'],
		description: 'Silhouette drop-shadow strength for the framed media',
	},
	// SPEC-087 — substrate: generated surface pattern + inline facet overrides.
	substrate: {
		type: String,
		required: false,
		matches: ['dots', 'grid', 'lines', 'cross', 'checker', 'none'],
		description: 'Generated surface pattern',
	},
	'substrate-size': {
		type: String,
		required: false,
		matches: ['sm', 'md', 'lg'],
		description: 'Pattern cell size',
	},
	'substrate-opacity': {
		type: String,
		required: false,
		matches: ['sm', 'md', 'lg'],
		description: 'Pattern ink strength',
	},
	'substrate-fill': {
		type: String,
		required: false,
		matches: ['inherit', 'inset'],
		description: 'Surface fill the pattern sits on (full colour stays with tint)',
	},
	'substrate-target': {
		type: String,
		required: false,
		matches: ['self', 'media'],
		description: 'Which surface the pattern fills (overrides the rune/theme default)',
	},
	// SPEC-088 — bg gradient fill facets (token-driven; colours stay token-owned).
	'bg-gradient': {
		type: String,
		required: false,
		matches: ['to-t', 'to-b', 'to-l', 'to-r', 'to-tr', 'to-br', 'to-bl', 'to-tl'],
		description: 'Gradient direction (bounded named set)',
	},
	'bg-from': {
		type: String,
		required: false,
		description: 'Gradient start colour — a semantic token name (→ var(--rf-color-*))',
	},
	'bg-to': {
		type: String,
		required: false,
		description: 'Gradient end colour — a semantic token name',
	},
	'bg-via': {
		type: String,
		required: false,
		description: 'Optional middle gradient stop — a semantic token name',
	},
	'bg-gradient-type': {
		type: String,
		required: false,
		matches: ['linear', 'radial', 'conic'],
		description: 'Gradient type',
	},
	// SPEC-088 — structured scrim (legibility treatment behind overlaid text).
	scrim: {
		type: String,
		required: false,
		matches: ['top', 'bottom', 'left', 'right', 'none'],
		description:
			'Scrim direction (heaviest edge); presence turns the scrim on, "none" opts out of the default cover scrim',
	},
	'scrim-type': {
		type: String,
		required: false,
		matches: ['gradient', 'frost'],
		description: 'Scrim treatment: gradient (default) or frost (backdrop blur)',
	},
	'scrim-strength': {
		type: String,
		required: false,
		matches: ['sm', 'md', 'lg'],
		description: 'Gradient scrim strength',
	},
	'scrim-blur': {
		type: String,
		required: false,
		matches: ['none', 'sm', 'md', 'lg'],
		description: 'Frost scrim blur amount',
	},
	'scrim-tone': {
		type: String,
		required: false,
		matches: ['dark', 'light'],
		description: 'Whether the scrim darkens (for light text) or lightens (for dark text)',
	},
};

/** One universal attribute's definition, or `undefined` for a name that is not one. */
export function universalAttributeDefinition(name: string): SchemaAttribute | undefined {
	return Object.hasOwn(universalAttributes, name) ? universalAttributes[name] : undefined;
}
