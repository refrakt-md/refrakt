import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

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
				...pageSectionProperties(header),
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
			children,
		});
	}
}

export const recipe = createSchema(RecipeModel);
