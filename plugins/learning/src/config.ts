import type { RuneConfig } from '@refrakt-md/transform';
import { resolveValign } from '@refrakt-md/transform';

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
		defaultElevation: 'flat',
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
		defaultElevation: 'flat',
		sequence: 'numbered',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
		mediaSlots: { media: 'cover' },
		modifiers: {
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			prepTime: { source: 'meta', noBemClass: true },
			cookTime: { source: 'meta', noBemClass: true },
			servings: { source: 'meta', noBemClass: true },
			difficulty: { source: 'meta', default: 'medium' },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
			'content-place': { source: 'meta', noBemClass: true },
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
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
		// SPEC-089 — cover (header scope): regroup the flat slots into a `cover-band`
		// (media + the preamble header overlay) with the long body flowing below.
		// The transform stays flat; only the assembled structure changes (SPEC-091).
		variants: {
			'media-position': {
				cover: {
					staticModifiers: ['cover'],
					rootAttributes: { 'data-cover-scope': 'header' },
					layout: {
						root: ['cover-band', 'content'],
						// The cover-band carries the dark colour-scheme so the overlaid
						// preamble reads light against the scrimmed media — scoped to the
						// band, leaving the body below on the page palette (SPEC-089).
						'cover-band': { tag: 'div', attrs: { 'data-color-scheme': 'dark' }, children: ['media', 'preamble'] },
						// Keep the body wrapper named `content` so it reuses the recipe
						// content-column CSS (padding, section gap, ingredient/step/tip
						// styling); only the preamble lifts out into the band.
						content: { tag: 'div', children: ['metadata', 'ingredients', 'steps', 'tips'] },
					},
				},
			},
		},
		autoLabel: { ...pageSectionAutoLabel, media: 'media' },
		editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', ingredient: 'inline', step: 'inline', media: 'image' },
	},
	RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
};
