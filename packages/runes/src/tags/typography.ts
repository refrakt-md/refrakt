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

// Parse "role: Family Name (weight1, weight2)" format
function parseFontEntry(text: string): { role: string; family: string; weights: number[] } | null {
	const colonIndex = text.indexOf(':');
	if (colonIndex === -1) return null;

	const role = text.slice(0, colonIndex).trim();
	const rest = text.slice(colonIndex + 1).trim();

	// Extract weights from parentheses
	const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (parenMatch) {
		const family = parenMatch[1].trim();
		const weights = parenMatch[2].split(',').map(w => parseInt(w.trim(), 10)).filter(w => !isNaN(w));
		return { role, family, weights };
	}

	// No parentheses — just the family name, default weight 400
	return { role, family: rest, weights: [400] };
}

class TypographyModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false })
	sample: string = 'The quick brown fox jumps over the lazy dog';

	@attribute({ type: Boolean, required: false })
	showSizes: boolean = true;

	@attribute({ type: Boolean, required: false })
	showWeights: boolean = true;

	@attribute({ type: Boolean, required: false })
	showCharset: boolean = false;

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];

		for (const node of nodes) {
			if (node.type === 'list') {
				for (const item of node.children) {
					if (item.type === 'item') {
						const text = extractText(item);
						const entry = parseFontEntry(text);
						if (entry) {
							converted.push(new Ast.Node('tag', {
								role: entry.role,
								family: entry.family,
								weights: entry.weights.join(','),
							}, [], 'typography-specimen'));
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
		const sampleMeta = new Tag('meta', { content: this.sample });
		const showSizesMeta = new Tag('meta', { content: String(this.showSizes) });
		const showWeightsMeta = new Tag('meta', { content: String(this.showWeights) });
		const showCharsetMeta = new Tag('meta', { content: String(this.showCharset) });

		const specimensDiv = new Tag('div', {}, body.toArray());

		return createComponentRenderable(schema.Typography, {
			tag: 'section',
			properties: {
				title: titleMeta,
				sample: sampleMeta,
				showSizes: showSizesMeta,
				showWeights: showWeightsMeta,
				showCharset: showCharsetMeta,
			},
			refs: {
				specimens: specimensDiv,
			},
			children: [titleMeta, sampleMeta, showSizesMeta, showWeightsMeta, showCharsetMeta, specimensDiv],
		});
	}
}

export const typography = createSchema(TypographyModel);
