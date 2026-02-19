import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

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

	transform(): RenderableTreeNodes {
		// Parse headings and list items directly from the original AST
		const gridChildren: InstanceType<typeof Tag>[] = [];
		let currentGroup = '';

		for (const child of this.node.children) {
			if (child.type === 'heading') {
				currentGroup = extractText(child);
				gridChildren.push(new Tag('div', { groupTitle: currentGroup }));
			} else if (child.type === 'list') {
				for (const item of child.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseColorEntry(text);
						if (entry) {
							gridChildren.push(new Tag('div', {
								name: entry.name,
								values: entry.values.join(','),
								group: currentGroup,
							}));
						}
					}
				}
			}
		}

		const titleMeta = new Tag('meta', { content: this.title });
		const showContrastMeta = new Tag('meta', { content: String(this.showContrast) });
		const showA11yMeta = new Tag('meta', { content: String(this.showA11y) });
		const columnsMeta = new Tag('meta', { content: this.columns != null ? String(this.columns) : '' });

		const gridDiv = new Tag('div', {}, gridChildren);

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
