import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createSchema, NodeStream, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

function tagText(nodes: any[]): string {
	return nodes.map((n: any) => {
		if (typeof n === 'string') return n;
		if (Markdoc.Tag.isTag(n)) return tagText(n.children);
		return '';
	}).join('').trim();
}

const difficultyType = ['easy', 'medium', 'hard'] as const;

class RecipeModel extends Model {
	@attribute({ type: String, required: false })
	prepTime: string = '';

	@attribute({ type: String, required: false })
	cookTime: string = '';

	@attribute({ type: Number, required: false })
	servings: number | undefined = undefined;

	@attribute({ type: String, required: false, matches: difficultyType.slice() })
	difficulty: typeof difficultyType[number] = 'medium';

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['list', 'tag', 'blockquote'] })
	body: NodeStream;

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const body = this.body.transform();

		const prepTimeMeta = new Tag('meta', { content: this.prepTime });
		const cookTimeMeta = new Tag('meta', { content: this.cookTime });
		const servingsMeta = new Tag('meta', { content: this.servings != null ? String(this.servings) : '' });
		const difficultyMeta = new Tag('meta', { content: this.difficulty });

		// Separate unordered lists (ingredients), ordered lists (steps), and blockquotes (tips)
		const allNodes = body.toArray();
		const ingredients: any[] = [];
		const steps: any[] = [];
		const tips: any[] = [];

		for (const node of allNodes) {
			if (Markdoc.Tag.isTag(node)) {
				if (node.name === 'ul' && ingredients.length === 0) {
					ingredients.push(...(node.children || []));
				} else if (node.name === 'ol' && steps.length === 0) {
					steps.push(...(node.children || []));
				} else if (node.name === 'blockquote') {
					tips.push(node);
				}
			}
		}

		// Annotate ingredient lis with recipeIngredient property
		for (const li of ingredients) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes.property = 'recipeIngredient';
			}
		}

		// Annotate step lis as HowToStep with recipeInstructions property
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes.typeof = 'HowToStep';
				li.attributes.property = 'recipeInstructions';
				li.children.push(new Tag('meta', { property: 'text', content: tagText(li.children) }));
			}
		}

		const sectionProps = pageSectionProperties(header);
		const ingredientsList = new Tag('ul', {}, ingredients);
		const stepsList = new Tag('ol', {}, steps);
		const tipsDiv = new Tag('div', {}, tips);

		const children: any[] = [
			prepTimeMeta,
			cookTimeMeta,
			servingsMeta,
			difficultyMeta,
			header.wrap('header').next(),
			ingredientsList,
			stepsList,
		];

		if (tips.length > 0) {
			children.push(tipsDiv);
		}

		return createComponentRenderable(schema.Recipe, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				...sectionProps,
				prepTime: prepTimeMeta,
				cookTime: cookTimeMeta,
				servings: servingsMeta,
				difficulty: difficultyMeta,
			},
			refs: {
				ingredients: ingredientsList,
				steps: stepsList,
				tips: tipsDiv,
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
	}
}

export const recipe = createSchema(RecipeModel);
