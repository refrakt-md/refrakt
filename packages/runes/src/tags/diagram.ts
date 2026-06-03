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

		// Extract source directly from resolved AST node
		// to avoid hljs failing on unknown languages like mermaid
		const sourceNode = asNodes(resolved.source)[0];
		const source = sourceNode?.attributes?.content || '';

		// `language` rides the bag only (→ `data-language` via the modifier).
		const languageMeta = new Tag('meta', { content: language });

		// SPEC-081: build the SSR fallback structure here (deterministic from
		// authored data) and emit the `rf-diagram` custom element; the behaviors
		// web component hydrates it. No postTransform.
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

		// Hidden source for the web component to read.
		if (source) {
			children.push(new Tag('div', { 'data-content': 'source', style: 'display:none' }, [source]));
		}

		const node = createComponentRenderable({ rune: 'diagram',
			tag: 'figure',
			properties: {
				language: languageMeta,
			},
			refs: {
				...(titleEl ? { title: titleEl } : {}),
				container: containerDiv,
				...(sourcePre ? { source: sourcePre } : {}),
			},
			children,
		});
		// Emit as the `rf-diagram` custom element (the web component upgrades it).
		node.name = 'rf-diagram';
		return node;
	},
});
