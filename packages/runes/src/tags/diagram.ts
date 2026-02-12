import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const languageType = ['mermaid', 'plantuml', 'ascii'] as const;

class DiagramModel extends Model {
	@attribute({ type: String, required: false, matches: languageType.slice() })
	language: typeof languageType[number] = 'mermaid';

	@attribute({ type: String, required: false })
	title: string = '';

	transform(): RenderableTreeNodes {
		const languageMeta = new Tag('meta', { content: this.language });
		const titleMeta = new Tag('meta', { content: this.title });

		// Extract source directly from AST node children (before transformation)
		// to avoid hljs failing on unknown languages like mermaid
		let source = '';
		for (const child of this.node.children) {
			if (child.type === 'fence') {
				source = child.attributes.content || '';
				break;
			}
		}

		const sourceMeta = new Tag('meta', { content: source });

		return createComponentRenderable(schema.Diagram, {
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
	}
}

export const diagram = createSchema(DiagramModel);
