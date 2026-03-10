import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, resolveSequence, RenderableNodeCursor, pageSectionProperties, headingsToList } from '@refrakt-md/runes';
import { schema } from '../types.js';

function tagText(nodes: any[]): string {
	return nodes.map((n: any) => {
		if (typeof n === 'string') return n;
		if (Markdoc.Tag.isTag(n)) return tagText(n.children);
		return '';
	}).join('').trim();
}

const difficultyType = ['easy', 'medium', 'hard'] as const;

const bodyFields = [
	{ name: 'header', match: 'heading|paragraph|image' as const, greedy: true, optional: true },
	{ name: 'body', match: 'list|tag' as const, greedy: true, optional: true },
];

export const howto = createContentModelSchema({
	attributes: {
		estimatedTime: { type: String, required: false, default: '' },
		difficulty: { type: String, required: false, matches: difficultyType.slice() },
		headingLevel: { type: Number, required: false },
	},
	contentModel: {
		type: 'custom',
		description: 'Optionally converts headings to list items, then resolves header/body sequence',
		processChildren(nodes, attrs) {
			let processed = nodes as Node[];
			if (attrs.headingLevel != null) {
				processed = headingsToList({ level: attrs.headingLevel as number })(processed);
			}
			return processed;
		},
	},
	transform(resolved, attrs, config) {
		// Custom model gives us raw children — resolve the header/body sequence manually
		const inner = resolveSequence(resolved.children as Node[], bodyFields);

		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(inner.header), config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(inner.body), config) as RenderableTreeNode[],
		);

		const estimatedTimeMeta = new Tag('meta', { content: attrs.estimatedTime });
		const difficultyMeta = new Tag('meta', { content: attrs.difficulty ?? '' });

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
	},
});
