import type { RuneConfig, SerializedTag } from '@refrakt-md/transform';
import { isTag, makeTag, readMeta, resolveGap, ratioToFr, resolveValign } from '@refrakt-md/transform';

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
			layout: { source: 'meta', default: 'stacked' },
			align: { source: 'meta', default: 'center' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
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
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description' },
		modifiers: {
			columns: { source: 'meta', default: '4' },
			gap: { source: 'meta', default: '1rem' },
			sizing: { source: 'meta', default: 'tiered' },
		},
		styles: {
			columns: '--bento-columns',
			gap: '--bento-gap',
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' },
	},
	BentoCell: {
		block: 'bento-cell',
		parent: 'Bento',
		modifiers: {
			size: { source: 'meta', default: 'medium' },
			span: { source: 'meta', noBemClass: true },
		},
		styles: {
			span: '--cell-span',
		},
		autoLabel: { name: 'title' },
		editHints: { title: 'inline', icon: 'icon' },
	},
	Feature: {
		block: 'feature',
		defaultDensity: 'full',
		defaultWidth: 'full',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
		mediaSlots: { media: 'cover' },
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			align: { source: 'meta', default: 'center' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
		},
		contextModifiers: { 'hero': 'in-hero', 'grid': 'in-grid' },
		autoLabel: { ...pageSectionAutoLabel, dl: 'definitions' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', title: 'inline', description: 'inline', icon: 'icon' },
	},
	Definition: { block: 'definition', parent: 'Feature' },
	Steps: { block: 'steps', defaultDensity: 'full', sequence: 'numbered', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
	Step: {
		block: 'step',
		parent: 'Steps',
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
		},
		mediaSlots: { media: 'cover' },
		editHints: { content: 'none', media: 'image' },
	},
	Pricing: { block: 'pricing', defaultDensity: 'full', defaultWidth: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
	Tier: { block: 'tier', parent: 'Pricing', editHints: { name: 'inline', price: 'inline' } },
	FeaturedTier: { block: 'tier', parent: 'Pricing', staticModifiers: ['featured'], editHints: { name: 'inline', price: 'inline' } },
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
