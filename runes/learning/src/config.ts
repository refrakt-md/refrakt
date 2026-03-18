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
					{ tag: 'span', ref: 'meta-item', metaText: 'estimatedTime', transform: 'duration', textPrefix: 'Estimated time: ', condition: 'estimatedTime' },
					{ tag: 'span', ref: 'meta-item', metaText: 'difficulty', textPrefix: 'Difficulty: ', condition: 'difficulty' },
				],
			},
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', tool: 'inline', step: 'inline' },
	},
	Recipe: {
		block: 'recipe',
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
					{ tag: 'span', ref: 'meta-item', metaText: 'prepTime', transform: 'duration', textPrefix: 'Prep: ', condition: 'prepTime' },
					{ tag: 'span', ref: 'meta-item', metaText: 'cookTime', transform: 'duration', textPrefix: 'Cook: ', condition: 'cookTime' },
					{ tag: 'span', ref: 'meta-item', metaText: 'servings', textPrefix: 'Serves: ', condition: 'servings' },
					{ tag: 'span', ref: 'badge', metaText: 'difficulty', condition: 'difficulty' },
				],
			},
		},
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', ingredient: 'inline', step: 'inline', media: 'image' },
	},
	RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
};
