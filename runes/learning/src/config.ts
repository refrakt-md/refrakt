import type { RuneConfig } from '@refrakt-md/transform';
import { ratioToFr, resolveValign, resolveGap } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'header',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	HowTo: {
		block: 'howto',
		defaultDensity: 'full',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			estimatedTime: { source: 'meta' },
			difficulty: { source: 'meta', default: 'medium' },
		},
		structure: {
			meta: {
				tag: 'div', before: true,
				conditionAny: ['estimatedTime', 'difficulty'],
				children: [
					{ tag: 'span', ref: 'meta-item', metaText: 'estimatedTime', transform: 'duration', textPrefix: 'Estimated time: ', condition: 'estimatedTime', metaType: 'temporal', metaRank: 'primary' },
					{ tag: 'span', ref: 'meta-item', metaText: 'difficulty', textPrefix: 'Difficulty: ', condition: 'difficulty', metaType: 'category', metaRank: 'primary', sentimentMap: { beginner: 'positive', intermediate: 'neutral', advanced: 'caution' } },
				],
			},
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', tool: 'inline', step: 'inline' },
	},
	Recipe: {
		block: 'recipe',
		defaultDensity: 'full',
		modifiers: {
			layout: { source: 'meta', default: 'stacked' },
			prepTime: { source: 'meta' },
			cookTime: { source: 'meta' },
			servings: { source: 'meta' },
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
		structure: {
			meta: {
				tag: 'div', before: true,
				conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
				children: [
					{ tag: 'span', ref: 'meta-item', metaText: 'prepTime', transform: 'duration', textPrefix: 'Prep: ', condition: 'prepTime', metaType: 'temporal', metaRank: 'primary' },
					{ tag: 'span', ref: 'meta-item', metaText: 'cookTime', transform: 'duration', textPrefix: 'Cook: ', condition: 'cookTime', metaType: 'temporal', metaRank: 'primary' },
					{ tag: 'span', ref: 'meta-item', metaText: 'servings', textPrefix: 'Serves: ', condition: 'servings', metaType: 'quantity', metaRank: 'primary' },
					{ tag: 'span', ref: 'badge', metaText: 'difficulty', condition: 'difficulty', metaType: 'category', metaRank: 'primary', sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' } },
				],
			},
		},
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', ingredient: 'inline', step: 'inline', media: 'image' },
	},
	RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
};
