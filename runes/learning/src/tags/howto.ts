import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createSchema, NodeStream, pageSectionProperties, headingsToList } from '@refrakt-md/runes';
import { schema } from '../types.js';

function tagText(nodes: any[]): string {
	return nodes.map((n: any) => {
		if (typeof n === 'string') return n;
		if (Markdoc.Tag.isTag(n)) return tagText(n.children);
		return '';
	}).join('').trim();
}

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

		// Annotate tool lis as HowToTool
		for (const li of tools) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes.typeof = 'HowToTool';
				li.attributes.property = 'tool';
				li.children.push(new Tag('meta', { property: 'name', content: tagText(li.children) }));
			}
		}

		// Annotate step lis as HowToStep
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes.typeof = 'HowToStep';
				li.attributes.property = 'step';
				li.children.push(new Tag('meta', { property: 'text', content: tagText(li.children) }));
			}
		}

		const sectionProps = pageSectionProperties(header);
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
				...sectionProps,
				estimatedTime: estimatedTimeMeta,
				difficulty: difficultyMeta,
			},
			refs: {
				tools: toolsList,
				steps: stepsList,
			},
			schema: {
				name: sectionProps.headline,
				description: sectionProps.blurb,
				totalTime: estimatedTimeMeta,
			},
			children,
		});
	}
}

export const howto = createSchema(HowToModel);
