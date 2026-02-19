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

// Parse a color entry from "name: #value" or "name: #val1, #val2, ..."
function parseColorEntry(text: string): { name: string; values: string[] } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;

	const name = text.slice(0, colonIndex).trim();
	const valueStr = text.slice(colonIndex + 1).trim();

	// Check for comma-separated values (neutral scales)
	const values = valueStr.split(',').map(v => v.trim()).filter(Boolean);
	return { name, values };
}

class PaletteModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: Boolean, required: false })
	showContrast: boolean = false;

	@attribute({ type: Boolean, required: false })
	showA11y: boolean = false;

	@attribute({ type: Number, required: false })
	columns: number | undefined = undefined;

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];
		let currentGroup = '';

		for (const node of nodes) {
			if (node.type === 'heading') {
				currentGroup = extractText(node);
				// Emit a group marker tag
				converted.push(new Ast.Node('tag', {
					groupTitle: currentGroup,
				}, [], 'palette-group-marker'));
			} else if (node.type === 'list') {
				for (const item of node.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseColorEntry(text);
						if (entry) {
							converted.push(new Ast.Node('tag', {
								name: entry.name,
								values: entry.values.join(','),
								group: currentGroup,
							}, [], 'palette-entry'));
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
		const showContrastMeta = new Tag('meta', { content: String(this.showContrast) });
		const showA11yMeta = new Tag('meta', { content: String(this.showA11y) });
		const columnsMeta = new Tag('meta', { content: this.columns != null ? String(this.columns) : '' });

		// Collect all rendered children into a grid container
		const gridDiv = new Tag('div', {}, body.toArray());

		return createComponentRenderable(schema.Palette, {
			tag: 'section',
			properties: {
				title: titleMeta,
				showContrast: showContrastMeta,
				showA11y: showA11yMeta,
				columns: columnsMeta,
			},
			refs: {
				grid: gridDiv,
			},
			children: [titleMeta, showContrastMeta, showA11yMeta, columnsMeta, gridDiv],
		});
	}
}

export const palette = createSchema(PaletteModel);
