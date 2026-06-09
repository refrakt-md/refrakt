import type { RuneConfig, SerializedTag } from '@refrakt-md/transform';
import { isTag, makeTag, readMeta, resolveValign } from '@refrakt-md/transform';

// ─── RuneConfig entries ───

const pageSectionAutoLabel = {
	header: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Hero: {
		block: 'hero',
		defaultDensity: 'full',
		defaultWidth: 'full',
		modifiers: {
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			align: { source: 'meta', default: 'center' },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
		},
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
		mediaSlots: { media: 'hero' },
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', action: 'link', command: 'code', media: 'image' },
	},
	CallToAction: { block: 'cta', defaultDensity: 'full', defaultWidth: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, contextModifiers: { 'hero': 'in-hero', 'pricing': 'in-pricing' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', action: 'link', command: 'code' } },
	Bento: {
		block: 'bento',
		defaultDensity: 'full',
		childDensity: 'compact',
		modifiers: {
			columns: { source: 'meta', default: '6', noBemClass: true },
			gap: { source: 'meta', default: '1rem', noBemClass: true },
			'row-height': { source: 'meta', noBemClass: true },
			'content-height': { source: 'meta', noBemClass: true },
			'media-ratio': { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			columns: '--bento-columns',
			gap: '--bento-gap',
		},
	},
	BentoCell: {
		block: 'bento-cell',
		parent: 'Bento', requiresParent: 'Bento',
		modifiers: {
			size: { source: 'meta', default: 'medium', noBemClass: true },
			cols: { source: 'meta', noBemClass: true },
			rows: { source: 'meta', noBemClass: true },
			'content-height': { source: 'meta', noBemClass: true },
			'media-ratio': { source: 'meta', noBemClass: true },
		},
		sections: { media: 'media' },
		// SPEC-081/091: the transform emits flat slots; `layout` builds the
		// skeleton — media beside/above a `content` wrapper grouping title/body/
		// footer. A base `layout` is the prerequisite for the cover variant
		// ({% ref "SPEC-089" /%}).
		layout: {
			root: ['media', 'content'],
			content: { tag: 'div', children: ['title', 'body', 'footer'] },
		},
		// SPEC-089 — cover (full scope) works via the shared cover layer keyed on
		// `data-media-position="cover"` (set by bento.ts), so no variant is needed
		// here (media-position is not an engine modifier on the cell); height comes
		// from the grid row track.
		styles: {
			cols: '--cell-cols',
			rows: '--cell-rows',
		},
		editHints: { title: 'inline' },
	},
	Feature: {
		block: 'feature',
		defaultDensity: 'full',
		defaultWidth: 'full',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
		mediaSlots: { media: 'cover' },
		modifiers: {
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			align: { source: 'meta', default: 'center' },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		// SPEC-091: the grid-vs-stack of the definitions list is a config variant
		// keyed on media-position, replacing the old transform branch. Stacked
		// media (top/bottom, the default) tiles definitions as a grid; beside
		// media (start/end) leaves them stacked in the content column.
		variants: {
			'media-position': {
				top: { staticModifiers: ['definitions-grid'] },
				bottom: { staticModifiers: ['definitions-grid'] },
			},
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
		},
		contextModifiers: { 'hero': 'in-hero', 'grid': 'in-grid' },
		autoLabel: { ...pageSectionAutoLabel, dl: 'definitions' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', title: 'inline', description: 'inline', icon: 'icon' },
	},
	Definition: { block: 'definition', parent: 'Feature', requiresParent: 'Feature' },
	Steps: { block: 'steps', defaultDensity: 'full', sequence: 'numbered', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
	Step: {
		block: 'step',
		parent: 'Steps', requiresParent: 'Steps',
		modifiers: {
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
		},
		mediaSlots: { media: 'cover' },
		editHints: { content: 'none', media: 'image' },
	},
	Pricing: { block: 'pricing', defaultDensity: 'full', defaultWidth: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
	Tier: { block: 'tier', parent: 'Pricing', requiresParent: 'Pricing', editHints: { name: 'inline', price: 'inline' } },
	FeaturedTier: { block: 'tier', parent: 'Pricing', requiresParent: 'Pricing', staticModifiers: ['featured'], editHints: { name: 'inline', price: 'inline' } },
	Testimonial: {
		block: 'testimonial',
		defaultDensity: 'compact',
		sections: { avatar: 'media' },
		mediaSlots: { avatar: 'portrait' },
		modifiers: {
			variant: { source: 'meta', default: 'card' },
			rating: { source: 'meta', noBemClass: true },
			ratingTotal: { source: 'meta', noBemClass: true, default: '5' },
		},
		autoLabel: { blockquote: 'quote' },
		// Rating is a single `rating` field — `value` filled marks out of
		// `total`, rendered by the shared `[data-meta-type=rating]` treatment.
		metaFields: {
			rating: { rating: { total: 'ratingTotal' }, condition: 'rating' },
		},
		blocks: {
			rating: { fields: ['rating'], layout: 'bar' },
		},
		layout: { root: ['rating', 'quote', 'author-name', 'author-role', 'avatar'] },
		editHints: { 'author-name': 'inline', 'author-role': 'inline', avatar: 'image', quote: 'inline' },
	},
	Comparison: {
		block: 'comparison',
		defaultDensity: 'full',
		// SPEC-081: the rune transform builds the table/cards structure directly;
		// `layout` adds the `rf-comparison--{layout}` modifier class.
		modifiers: {
			layout: { source: 'meta', default: 'table' },
		},
	},
	ComparisonColumn: { block: 'comparison-column', parent: 'Comparison', editHints: { name: 'inline' } },
	ComparisonRow: {
		block: 'comparison-row',
		parent: 'Comparison',
		modifiers: {
			rowType: {
				source: 'meta',
				default: 'text',
				valueMap: {
					check: 'checked',
					cross: 'unchecked',
				},
				mapTarget: 'data-checked',
			},
		},
		editHints: { label: 'inline', body: 'inline' },
	},
};
