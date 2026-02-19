import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

// Extract plain text from an AST node
function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

// Parse "name: value" format
function parseNameValue(text: string): { name: string; value: string } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;
	return {
		name: text.slice(0, colonIndex).trim(),
		value: text.slice(colonIndex + 1).trim(),
	};
}

type SectionType = 'spacing' | 'radius' | 'shadows';

class SpacingModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];
		let currentSection: SectionType | '' = '';

		for (const node of nodes) {
			if (node.type === 'heading') {
				const heading = extractText(node).toLowerCase();
				if (heading.includes('spacing')) currentSection = 'spacing';
				else if (heading.includes('radius') || heading.includes('radii')) currentSection = 'radius';
				else if (heading.includes('shadow')) currentSection = 'shadows';
				else currentSection = '';

				if (currentSection) {
					converted.push(new Ast.Node('tag', {
						sectionType: currentSection,
					}, [], 'spacing-section-marker'));
				}
			} else if (node.type === 'list' && currentSection) {
				for (const item of node.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseNameValue(text);
						if (entry) {
							// Special handling for scale values (comma-separated)
							if (entry.name === 'scale') {
								converted.push(new Ast.Node('tag', {
									section: currentSection,
									entryType: 'scale',
									value: entry.value,
								}, [], 'spacing-entry'));
							} else {
								converted.push(new Ast.Node('tag', {
									section: currentSection,
									entryType: 'named',
									name: entry.name,
									value: entry.value,
								}, [], 'spacing-entry'));
							}
						}
					}
				}
			}
		}

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const body = this.body.transform();

		const titleMeta = new Tag('meta', { content: this.title });
		const sectionsDiv = new Tag('div', {}, body.toArray());

		return createComponentRenderable(schema.Spacing, {
			tag: 'section',
			properties: {
				title: titleMeta,
			},
			refs: {
				sections: sectionsDiv,
			},
			children: [titleMeta, sectionsDiv],
		});
	}
}

export const spacing = createSchema(SpacingModel);
