import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	RenderableNodeCursor,
	SplitLayoutModel,
	pageSectionProperties,
	buildLayoutMetas,
	extractMediaImage,
} from '@refrakt-md/runes';

const difficultyType = ['easy', 'medium', 'hard'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const recipeSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
	media: 'media',
} as const;
export const recipeMediaSlots = { media: 'cover' } as const;

/**
 * SPEC-130 / WORK-570 — retype and wrap, declared.
 *
 * Two shapes in one table. An **ingredient** `<li>` carries no type of its own,
 * so it is a plain property on the recipe and the collector takes its text
 * directly — no wrapper needed, because nothing fixes its object to a typed
 * resource. A **step** `<li>` does become a `HowToStep`, so its text needs the
 * RDFa carrier; see `accordionItemSchema` for why.
 *
 * `textTag: 'p'` reproduces what the rune rendered inside an `<li>`.
 *
 * `mediaImage` is the name WORK-561 gave the media-slot image — `image` was
 * already taken by the header's, and the namespace is flat per rune (ADR-008).
 *
 * No `lists:` here — see the note on `accordionSchema`.
 */
export const recipeSchema = {
	type: 'Recipe',
	properties: {
		headline: 'name',
		blurb: 'description',
		prepTime: 'prepTime',
		cookTime: 'cookTime',
		servings: 'recipeYield',
		mediaImage: 'image',
		ingredient: 'recipeIngredient',
	},
	children: {
		step: {
			type: 'HowToStep',
			property: 'recipeInstructions',
			text: { step: 'text' },
			textTag: 'p',
		},
	},
} as const;

export const recipe = createContentModelSchema({
	schema: recipeSchema,
	sections: recipeSections,
	mediaSlots: recipeMediaSlots,
	base: SplitLayoutModel,
	attributes: {
		prepTime: {
			type: String,
			required: false,
			default: '',
			description: 'Time needed for preparation before cooking (e.g. "15 min")',
		},
		cookTime: {
			type: String,
			required: false,
			default: '',
			description: 'Active cooking or baking time (e.g. "45 min")',
		},
		servings: {
			type: Number,
			required: false,
			description: 'Number of portions the recipe yields',
		},
		difficulty: {
			type: String,
			required: false,
			matches: difficultyType.slice(),
			default: 'medium',
			description: 'Skill level: easy, medium, or hard',
		},
		// SPEC-089 — cover mode (`media-position="cover"`, from splitLayoutAttributes)
		// regroups the preamble header over the media (header scope). `content-place`
		// anchors that overlaid preamble: "<block> <inline>" (e.g. "end start") or "auto".
		'content-place': {
			type: String,
			required: false,
			description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"',
		},
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		// Media-first body shape: `media --- content`. `content` is the primary
		// zone so a recipe without an `---` image lands its whole body in content.
		zones: [
			{
				name: 'media',
				type: 'sequence',
				fields: [{ name: 'media', match: 'any', optional: true, greedy: true }],
			},
			{
				name: 'content',
				primary: true,
				type: 'sequence',
				fields: [
					{ name: 'eyebrow', match: 'paragraph', optional: true },
					{ name: 'headline', match: 'heading', optional: true },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{
						name: 'ingredients',
						match: 'list:unordered',
						optional: true,
						template: '- Ingredient',
					},
					{ name: 'steps', match: 'list:ordered', optional: true, template: '1. Step' },
					{ name: 'tips', match: 'blockquote', greedy: true, optional: true },
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		// Collect header AST nodes (eyebrow, headline, blurb) and transform
		const headerAstNodes = [contentZone.eyebrow, contentZone.headline, contentZone.blurb].filter(
			Boolean,
		) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Transform ingredients (single unordered list node)
		const ingredientsRendered = Markdoc.transform(
			contentZone.ingredients ? [contentZone.ingredients as Node] : [],
			config,
		) as RenderableTreeNode[];
		const ingredients: any[] = [];
		for (const node of ingredientsRendered) {
			if (Markdoc.Tag.isTag(node) && node.name === 'ul') {
				ingredients.push(...(node.children || []));
			}
		}

		// Transform steps (single ordered list node)
		const stepsRendered = Markdoc.transform(
			contentZone.steps ? [contentZone.steps as Node] : [],
			config,
		) as RenderableTreeNode[];
		const steps: any[] = [];
		for (const node of stepsRendered) {
			if (Markdoc.Tag.isTag(node) && node.name === 'ol') {
				steps.push(...(node.children || []));
			}
		}

		// Transform tips (greedy blockquotes)
		const tipsRendered = Markdoc.transform(
			asNodes(contentZone.tips),
			config,
		) as RenderableTreeNode[];
		const tips = tipsRendered.filter((n: any) => Markdoc.Tag.isTag(n) && n.name === 'blockquote');

		// Transform media AST nodes
		const mediaAstNodes = (Array.isArray(mediaZone.media) ? mediaZone.media : []) as Node[];
		const side = new RenderableNodeCursor(
			Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
		);

		// Recipe attribute meta tags
		const prepTimeMeta = new Tag('meta', { content: attrs.prepTime });
		const cookTimeMeta = new Tag('meta', { content: attrs.cookTime });
		const servingsMeta = new Tag('meta', {
			content: attrs.servings != null ? String(attrs.servings) : '',
		});
		const difficultyMeta = new Tag('meta', { content: attrs.difficulty });

		// WORK-570 — the names only; `recipeSchema` stamps the ingredient property,
		// retypes the steps and emits their text wrapper.
		for (const li of ingredients) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'ingredient';
		}
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'step';
		}

		// Layout meta tags
		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		// SPEC-089 cover anchor — emit only when set; the engine reads it as a field.
		const contentPlace = attrs['content-place'] as string | undefined;
		const contentPlaceMeta = contentPlace ? new Tag('meta', { content: contentPlace }) : undefined;

		// Structural wrapping
		const sectionProps = pageSectionProperties(header);
		const ingredientsList = new Tag('ul', {}, ingredients);
		const stepsList = new Tag('ol', {}, steps);
		const tipsDiv = new Tag('div', {}, tips);

		// Unwrap paragraph-wrapped images in the media zone
		const mediaImgTag = extractMediaImage(side);
		const mediaCursor = mediaImgTag ? new RenderableNodeCursor([mediaImgTag]) : side;
		const mediaDiv = mediaCursor.wrap('div');
		const hasMedia = mediaCursor.toArray().length > 0;

		// Use the unwrapped image for SEO structured data
		const seoImage = mediaImgTag;

		// SPEC-081: emit flat `data-name` slots — the `layout` config groups them
		// into the content column + preamble header. (The media column stays a
		// single transform-built wrapper.)
		const children: any[] = [
			prepTimeMeta,
			cookTimeMeta,
			servingsMeta,
			difficultyMeta,
			...layoutChildren,
			...(contentPlaceMeta ? [contentPlaceMeta] : []),
			...(hasMedia ? [mediaDiv.next()] : []),
			...header.toArray(),
			ingredientsList,
			stepsList,
			...(tips.length > 0 ? [tipsDiv] : []),
		];

		return createComponentRenderable({
			rune: 'recipe',
			tag: 'article',
			property: 'contentSection',
			properties: {
				prepTime: prepTimeMeta,
				cookTime: cookTimeMeta,
				servings: servingsMeta,
				difficulty: difficultyMeta,
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				'content-place': contentPlaceMeta,
			},
			refs: {
				...sectionProps,
				ingredients: ingredientsList,
				steps: stepsList,
				tips: tipsDiv,
				media: mediaDiv,
				// WORK-561 — the image survives, so it is a ref. Named `mediaImage`
				// rather than `image` because `sectionProps` (spread above) already
				// contributes an `image` key for the *header's* image, and the flat
				// namespace is unique per rune (ADR-008). `media` is the wrapper;
				// this is the image inside it.
				...(seoImage ? { mediaImage: seoImage } : {}),
			},
			children,
		});
	},
});
