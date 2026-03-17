import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, SplitLayoutModel, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

function tagText(nodes: any[]): string {
	return nodes.map((n: any) => {
		if (typeof n === 'string') return n;
		if (Markdoc.Tag.isTag(n)) return tagText(n.children);
		return '';
	}).join('').trim();
}

const difficultyType = ['easy', 'medium', 'hard'] as const;

export const recipe = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		prepTime: { type: String, required: false, default: '' },
		cookTime: { type: String, required: false, default: '' },
		servings: { type: Number, required: false },
		difficulty: { type: String, required: false, matches: difficultyType.slice(), default: 'medium' },
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'content',
				type: 'sequence',
				fields: [
					{ name: 'eyebrow', match: 'paragraph', optional: true },
					{ name: 'headline', match: 'heading', optional: true },
					{ name: 'blurb', match: 'paragraph', optional: true },
						{ name: 'ingredients', match: 'list:unordered', optional: true, template: '- Ingredient' },
					{ name: 'steps', match: 'list:ordered', optional: true, template: '1. Step' },
					{ name: 'tips', match: 'blockquote', greedy: true, optional: true },
				],
			},
			{
				name: 'media',
				type: 'sequence',
				fields: [
					{ name: 'media', match: 'any', optional: true, greedy: true },
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		// Collect header AST nodes (eyebrow, headline, blurb) and transform
		const headerAstNodes = [
			contentZone.eyebrow,
			contentZone.headline,
			contentZone.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Transform ingredients (single unordered list node)
		const ingredientsRendered = Markdoc.transform(
			contentZone.ingredients ? [contentZone.ingredients as Node] : [], config,
		) as RenderableTreeNode[];
		const ingredients: any[] = [];
		for (const node of ingredientsRendered) {
			if (Markdoc.Tag.isTag(node) && node.name === 'ul') {
				ingredients.push(...(node.children || []));
			}
		}

		// Transform steps (single ordered list node)
		const stepsRendered = Markdoc.transform(
			contentZone.steps ? [contentZone.steps as Node] : [], config,
		) as RenderableTreeNode[];
		const steps: any[] = [];
		for (const node of stepsRendered) {
			if (Markdoc.Tag.isTag(node) && node.name === 'ol') {
				steps.push(...(node.children || []));
			}
		}

		// Transform tips (greedy blockquotes)
		const tipsRendered = Markdoc.transform(asNodes(contentZone.tips), config) as RenderableTreeNode[];
		const tips = tipsRendered.filter(
			(n: any) => Markdoc.Tag.isTag(n) && n.name === 'blockquote',
		);

		// Transform media AST nodes
		const mediaAstNodes = (
			Array.isArray(mediaZone.media) ? mediaZone.media : []
		) as Node[];
		const side = new RenderableNodeCursor(
			Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
		);

		// Recipe attribute meta tags
		const prepTimeMeta = new Tag('meta', { content: attrs.prepTime });
		const cookTimeMeta = new Tag('meta', { content: attrs.cookTime });
		const servingsMeta = new Tag('meta', { content: attrs.servings != null ? String(attrs.servings) : '' });
		const difficultyMeta = new Tag('meta', { content: attrs.difficulty });

		// Annotate ingredient lis with data-name and recipeIngredient property
		for (const li of ingredients) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes['data-name'] = 'ingredient';
				li.attributes.property = 'recipeIngredient';
			}
		}

		// Annotate step lis with data-name and HowToStep schema
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes['data-name'] = 'step';
				li.attributes.typeof = 'HowToStep';
				li.attributes.property = 'recipeInstructions';
				li.children.push(new Tag('meta', { property: 'text', content: tagText(li.children) }));
			}
		}

		// Layout meta tags (following hero pattern)
		const layout = (attrs.layout as string) || 'stacked';
		const ratio = (attrs.ratio as string) || '1 1';
		const valign = (attrs.valign as string) || 'top';
		const gap = (attrs.gap as string) || 'default';
		const collapse = attrs.collapse as string | undefined;

		const layoutMeta = new Tag('meta', { content: layout });
		const ratioMeta = layout !== 'stacked' ? new Tag('meta', { content: ratio }) : undefined;
		const valignMeta = layout !== 'stacked' ? new Tag('meta', { content: valign }) : undefined;
		const gapMeta = gap !== 'default' ? new Tag('meta', { content: gap }) : undefined;
		const collapseMeta = collapse ? new Tag('meta', { content: collapse }) : undefined;

		// Structural wrapping
		const sectionProps = pageSectionProperties(header);
		const ingredientsList = new Tag('ul', {}, ingredients);
		const stepsList = new Tag('ol', {}, steps);
		const tipsDiv = new Tag('div', {}, tips);

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const bodyChildren: any[] = [ingredientsList, stepsList];
		if (tips.length > 0) {
			bodyChildren.push(tipsDiv);
		}

		const mainContent = new RenderableNodeCursor([
			...headerContent,
			...bodyChildren,
		]).wrap('div');

		const mediaDiv = side.wrap('div');

		const children: any[] = [
			prepTimeMeta,
			cookTimeMeta,
			servingsMeta,
			difficultyMeta,
			layoutMeta,
			...(ratioMeta ? [ratioMeta] : []),
			...(valignMeta ? [valignMeta] : []),
			...(gapMeta ? [gapMeta] : []),
			...(collapseMeta ? [collapseMeta] : []),
			mainContent.next(),
			...(side.toArray().length > 0 ? [mediaDiv.next()] : []),
		];

		return createComponentRenderable(schema.Recipe, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				prepTime: prepTimeMeta,
				cookTime: cookTimeMeta,
				servings: servingsMeta,
				difficulty: difficultyMeta,
				layout: layoutMeta,
				ratio: ratioMeta,
				valign: valignMeta,
				gap: gapMeta,
				collapse: collapseMeta,
			},
			refs: {
				...sectionProps,
				ingredients: ingredientsList,
				steps: stepsList,
				tips: tipsDiv,
				content: mainContent,
				media: mediaDiv,
			},
			schema: {
				name: sectionProps.headline,
				description: sectionProps.blurb,
				prepTime: prepTimeMeta,
				cookTime: cookTimeMeta,
				recipeYield: servingsMeta,
			},
			children,
		});
	},
});
