import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';

const languageType = ['mermaid', 'plantuml', 'ascii'] as const;

export const diagram = createContentModelSchema({
	attributes: {
		language: {
			type: String,
			required: false,
			matches: languageType.slice(),
			description: 'Diagram language: mermaid, plantuml, or ascii',
		},
		title: { type: String, required: false, description: 'Title displayed above the diagram' },
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'source', match: 'fence' }],
	},
	transform(resolved, attrs) {
		const language = attrs.language ?? 'mermaid';
		const title = attrs.title ?? '';

		const sourceNode = asNodes(resolved.source)[0];
		const source = sourceNode?.attributes?.content || '';

		const languageMeta = new Tag('meta', { content: language });

		const children: InstanceType<typeof Tag>[] = [];

		let titleEl: InstanceType<typeof Tag> | undefined;
		if (title) {
			titleEl = new Tag('figcaption', {}, [title]);
			children.push(titleEl);
		}

		let sourcePre: InstanceType<typeof Tag> | undefined;
		const containerChildren: InstanceType<typeof Tag>[] = [];
		if (source) {
			sourcePre = new Tag('pre', {}, [new Tag('code', {}, [source])]);
			containerChildren.push(sourcePre);
		}
		const containerDiv = new Tag('div', {}, containerChildren);
		children.push(containerDiv);

		if (source) {
			children.push(new Tag('template', { 'data-content': 'source' }, [source]));
		}

		const node = createComponentRenderable({
			rune: 'diagram',
			tag: 'figure',
			properties: {
				language: languageMeta,
			},
			refs: {
				title: titleEl,
				container: containerDiv,
				source: sourcePre,
			},
			children,
		});
		node.name = 'rf-diagram';
		return node;
	},
});
