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

	transform(): RenderableTreeNodes {
		// Parse headings and list items directly from the original AST
		const sectionChildren: InstanceType<typeof Tag>[] = [];
		let currentSection: SectionType | '' = '';

		for (const child of this.node.children) {
			if (child.type === 'heading') {
				const heading = extractText(child).toLowerCase();
				if (heading.includes('spacing')) currentSection = 'spacing';
				else if (heading.includes('radius') || heading.includes('radii')) currentSection = 'radius';
				else if (heading.includes('shadow')) currentSection = 'shadows';
				else currentSection = '';

				if (currentSection) {
					sectionChildren.push(new Tag('div', { sectionType: currentSection }));
				}
			} else if (child.type === 'list' && currentSection) {
				for (const item of child.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseNameValue(text);
						if (entry) {
							if (entry.name === 'scale') {
								sectionChildren.push(new Tag('div', {
									section: currentSection,
									entryType: 'scale',
									value: entry.value,
								}));
							} else {
								sectionChildren.push(new Tag('div', {
									section: currentSection,
									entryType: 'named',
									name: entry.name,
									value: entry.value,
								}));
							}
						}
					}
				}
			}
		}

		const titleMeta = new Tag('meta', { content: this.title });
		const sectionsDiv = new Tag('div', {}, sectionChildren);

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
