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
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description' },
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
		blocks: {
			metadata: { fields: ['estimatedTime', 'difficulty'], layout: 'definition-list' },
		},
		// SPEC-081: the transform emits flat slots; `layout` builds the skeleton.
		// The metadata def-list nests in the content column below the header —
		// the facts read naturally under the title/blurb (consistent with the
		// storytelling runes).
		layout: {
			root: ['content'],
			content: { tag: 'div', children: ['preamble', 'metadata', 'tools', 'steps'] },
			preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb', 'image'] },
		},
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
		blocks: {
			metadata: { fields: ['prepTime', 'cookTime', 'servings', 'difficulty'], layout: 'definition-list' },
		},
		// Recipe hand-assembles content + media columns for its split layout;
		// the metadata def-list nests inside the content column, below the
		// SPEC-081: the transform emits flat slots; `layout` builds the skeleton —
		// the content column wraps the preamble header + metadata + body slots.
		layout: {
			root: ['media', 'content'],
			content: { tag: 'div', children: ['preamble', 'metadata', 'ingredients', 'steps', 'tips'] },
			preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb'] },
		},
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', ingredient: 'inline', step: 'inline', media: 'image' },
	},
	RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
};
