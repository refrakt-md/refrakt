import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

const difficultyType = ['easy', 'medium', 'hard'] as const;

class HowToModel extends Model {
	@attribute({ type: String, required: false })
	estimatedTime: string = '';

	@attribute({ type: String, required: false, matches: difficultyType.slice() })
	difficulty: string = '';

	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['list', 'tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		if (this.headingLevel !== undefined) {
			return super.processChildren(headingsToList({ level: this.headingLevel })(nodes));
		}
		return super.processChildren(nodes);
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const body = this.body.transform();

		const estimatedTimeMeta = new Tag('meta', { content: this.estimatedTime });
		const difficultyMeta = new Tag('meta', { content: this.difficulty });

		// Separate unordered lists (tools/materials) and ordered lists (steps)
		const allNodes = body.toArray();
		const tools: any[] = [];
		const steps: any[] = [];

		for (const node of allNodes) {
			if (Markdoc.Tag.isTag(node)) {
				if (node.name === 'ul') {
					tools.push(...(node.children || []));
				} else if (node.name === 'ol') {
					steps.push(...(node.children || []));
				}
			}
		}

		const toolsList = new Tag('ul', {}, tools);
		const stepsList = new Tag('ol', {}, steps);

		const children: any[] = [
			estimatedTimeMeta,
			difficultyMeta,
			header.wrap('header').next(),
		];

		if (tools.length > 0) {
			children.push(toolsList);
		}
		children.push(stepsList);

		return createComponentRenderable(schema.HowTo, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				estimatedTime: estimatedTimeMeta,
				difficulty: difficultyMeta,
			},
			refs: {
				tools: toolsList,
				steps: stepsList,
			},
			children,
		});
	}
}

export const howto = createSchema(HowToModel);
