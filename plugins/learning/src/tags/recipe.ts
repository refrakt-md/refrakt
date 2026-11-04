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
	withoutQuoteRole,
} from '@refrakt-md/runes';

const difficultyType = ['easy', 'medium', 'hard'] as const;

export const recipeSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
	media: 'media',
} as const;
export const recipeMediaSlots = { media: 'cover' } as const;

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
		'content-place': {
			type: String,
			required: false,
			description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"',
		},
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
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

		const headerAstNodes = [contentZone.eyebrow, contentZone.headline, contentZone.blurb].filter(
			Boolean,
		) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

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

		const tipsRendered = Markdoc.transform(
			asNodes(contentZone.tips),
			config,
		) as RenderableTreeNode[];
		const tips = tipsRendered
			.filter((n: any) => Markdoc.Tag.isTag(n) && n.name === 'blockquote')
			.map(withoutQuoteRole);

		const mediaAstNodes = (Array.isArray(mediaZone.media) ? mediaZone.media : []) as Node[];
		const side = new RenderableNodeCursor(
			Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
		);

		const prepTimeMeta = new Tag('meta', { content: attrs.prepTime });
		const cookTimeMeta = new Tag('meta', { content: attrs.cookTime });
		const servingsMeta = new Tag('meta', {
			content: attrs.servings != null ? String(attrs.servings) : '',
		});
		const difficultyMeta = new Tag('meta', { content: attrs.difficulty });

		for (const li of ingredients) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'ingredient';
		}
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'step';
		}

		const { metas: layoutMetas } = buildLayoutMetas(attrs);
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		const contentPlace = attrs['content-place'] as string | undefined;
		const contentPlaceMeta = contentPlace ? new Tag('meta', { content: contentPlace }) : undefined;

		const sectionProps = pageSectionProperties(header);
		const ingredientsList = new Tag('ul', {}, ingredients);
		const stepsList = new Tag('ol', {}, steps);
		const tipsDiv = new Tag('div', {}, tips);

		const mediaImgTag = extractMediaImage(side);
		const mediaCursor = mediaImgTag ? new RenderableNodeCursor([mediaImgTag]) : side;
		const mediaDiv = mediaCursor.wrap('div');
		const hasMedia = mediaCursor.toArray().length > 0;

		const seoImage = mediaImgTag;

		const children: any[] = [
			...(hasMedia ? [mediaDiv.next()] : []),
			...header.toArray(),
			ingredientsList,
			stepsList,
			...(tips.length > 0 ? [tipsDiv] : []),
		];

		return createComponentRenderable({
			rune: 'recipe',
			tag: 'article',
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
				mediaImage: seoImage,
			},
			children,
		});
	},
});
