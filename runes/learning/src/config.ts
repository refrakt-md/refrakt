import type { RuneConfig } from '@refrakt-md/transform';

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
	},
	Recipe: {
		block: 'recipe',
		contentWrapper: { tag: 'div', ref: 'content' },
		modifiers: {
			prepTime: { source: 'meta' },
			cookTime: { source: 'meta' },
			servings: { source: 'meta' },
			difficulty: { source: 'meta', default: 'medium' },
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
	},
	RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
};
