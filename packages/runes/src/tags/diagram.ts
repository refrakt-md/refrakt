import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';

const languageType = ['mermaid', 'plantuml', 'ascii'] as const;

export const diagram = createContentModelSchema({
	attributes: {
		language: { type: String, required: false, matches: languageType.slice(), description: 'Diagram language: mermaid, plantuml, or ascii' },
		title: { type: String, required: false, description: 'Title displayed above the diagram' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'source', match: 'fence' },
		],
	},
	transform(resolved, attrs) {
		const language = attrs.language ?? 'mermaid';
		const title = attrs.title ?? '';

		const languageMeta = new Tag('meta', { content: language });
		const titleMeta = new Tag('meta', { content: title });

		// Extract source directly from resolved AST node
		// to avoid hljs failing on unknown languages like mermaid
		const sourceNode = asNodes(resolved.source)[0];
		const source = sourceNode?.attributes?.content || '';

		const sourceMeta = new Tag('meta', { content: source });

		return createComponentRenderable({ rune: 'diagram',
			tag: 'figure',
			properties: {
				language: languageMeta,
				title: titleMeta,
			},
			refs: {
				source: sourceMeta,
			},
			children: [languageMeta, titleMeta, sourceMeta],
		});
	},
});
