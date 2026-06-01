import type { RuneConfig } from '@refrakt-md/transform';
import { ratioToFr, resolveValign, resolveGap } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	HowTo: {
		block: 'howto',
		defaultDensity: 'full',
		sequence: 'numbered',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', content: 'body' },
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			estimatedTime: { source: 'meta' },
			difficulty: { source: 'meta', default: 'medium' },
		},
		metaFields: {
			estimatedTime: { metaType: 'temporal', label: 'Est. time', condition: 'estimatedTime', transform: 'duration' },
			difficulty: {
				metaType: 'category', label: 'Difficulty', condition: 'difficulty',
				sentimentMap: { beginner: 'positive', intermediate: 'neutral', advanced: 'caution' },
			},
		},
		zones: {
			metadata: { fields: ['estimatedTime', 'difficulty'] },
		},
		zoneLayouts: { metadata: 'chip-row' },
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', tool: 'inline', step: 'inline' },
	},
	Recipe: {
		block: 'recipe',
		defaultDensity: 'full',
		sequence: 'numbered',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
		mediaSlots: { media: 'cover' },
		rootAttributes: { 'data-media-position': 'top' },
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			prepTime: { source: 'meta', noBemClass: true },
			cookTime: { source: 'meta', noBemClass: true },
			servings: { source: 'meta', noBemClass: true },
			difficulty: { source: 'meta', default: 'medium' },
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
		metaFields: {
			prepTime: { metaType: 'temporal', label: 'Prep', condition: 'prepTime', transform: 'duration' },
			cookTime: { metaType: 'temporal', label: 'Cook', condition: 'cookTime', transform: 'duration' },
			servings: { metaType: 'quantity', label: 'Serves', condition: 'servings' },
			difficulty: {
				metaType: 'category', label: 'Difficulty', condition: 'difficulty',
				sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' },
			},
		},
		zones: {
			metadata: { fields: ['prepTime', 'cookTime', 'servings', 'difficulty'] },
		},
		zoneLayouts: { metadata: 'chip-row' },
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', ingredient: 'inline', step: 'inline', media: 'image' },
	},
	RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
};
