import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	pageSectionProperties,
	unwrapParagraphImages,
} from '@refrakt-md/runes';

const difficultyType = ['easy', 'medium', 'hard'] as const;

const bodyFields = [
	{ name: 'header', match: 'heading|paragraph|image' as const, greedy: true, optional: true },
	{ name: 'body', match: 'list|tag' as const, greedy: true, optional: true },
];

export const howToSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
} as const;

export const howToSchema = {
	type: 'HowTo',
	properties: { headline: 'name', blurb: 'description', estimatedTime: 'totalTime' },
	children: {
		tool: { type: 'HowToTool', property: 'tool', text: { tool: 'name' }, textTag: 'p' },
		step: { type: 'HowToStep', property: 'step', text: { step: 'text' }, textTag: 'p' },
	},
} as const;

export const howto = createContentModelSchema({
	schema: howToSchema,
	sections: howToSections,
	attributes: {
		estimatedTime: {
			type: String,
			required: false,
			default: '',
			description: 'Estimated total time to complete all steps (e.g. "30 min")',
		},
		difficulty: {
			type: String,
			required: false,
			matches: difficultyType.slice(),
			description: 'Skill level: easy, medium, or hard',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: bodyFields,
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
			),
		);
		const body = renderNodes(resolved.body, config);

		const estimatedTimeMeta = new Tag('meta', { content: attrs.estimatedTime });
		const difficultyMeta = new Tag('meta', { content: attrs.difficulty ?? '' });

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

		for (const li of tools) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'tool';
		}
		for (const li of steps) {
			if (Markdoc.Tag.isTag(li)) li.attributes['data-name'] = 'step';
		}

		const sectionProps = pageSectionProperties(header);
		const toolsList = new Tag('ul', {}, tools);
		const stepsList = new Tag('ol', {}, steps);

		const children: any[] = [
			...header.toArray(),
			...(tools.length > 0 ? [toolsList] : []),
			stepsList,
		];

		return createComponentRenderable({
			rune: 'how-to',
			tag: 'article',
			properties: {
				estimatedTime: estimatedTimeMeta,
				difficulty: difficultyMeta,
			},
			refs: {
				...sectionProps,
				tools: toolsList,
				steps: stepsList,
			},
			children,
		});
	},
});
