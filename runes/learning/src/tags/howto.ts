import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor, pageSectionProperties } from '@refrakt-md/runes';

const difficultyType = ['easy', 'medium', 'hard'] as const;

const bodyFields = [
	{ name: 'header', match: 'heading|paragraph|image' as const, greedy: true, optional: true },
	{ name: 'body', match: 'list|tag' as const, greedy: true, optional: true },
];

export const howto = createContentModelSchema({
	attributes: {
		estimatedTime: { type: String, required: false, default: '', description: 'Estimated total time to complete all steps (e.g. "30 min")' },
		difficulty: { type: String, required: false, matches: difficultyType.slice(), description: 'Skill level: easy, medium, or hard' },
	},
	contentModel: {
		type: 'sequence',
		fields: bodyFields,
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
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
				li.attributes['data-name'] = 'tool';
				li.attributes.typeof = 'HowToTool';
				li.attributes.property = 'tool';
				li.children = [new Tag('p', { property: 'name' }, li.children)];
			}
		}

		// Annotate step lis as HowToStep
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) {
				li.attributes['data-name'] = 'step';
				li.attributes.typeof = 'HowToStep';
				li.attributes.property = 'step';
				li.children = [new Tag('p', { property: 'text' }, li.children)];
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

		return createComponentRenderable({ rune: 'how-to', schemaOrgType: 'HowTo',
			tag: 'article',
			property: 'contentSection',
			properties: {
				estimatedTime: estimatedTimeMeta,
				difficulty: difficultyMeta,
			},
			refs: {
				...sectionProps,
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
