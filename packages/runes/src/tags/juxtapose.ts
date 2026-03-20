import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

const variantType = ['slider', 'toggle', 'fade', 'auto'] as const;
const orientationType = ['horizontal', 'vertical'] as const;

class JuxtaposePanelModel extends Model {
	@attribute({ type: String, required: true })
	name: string;

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.JuxtaposePanel, {
			tag: 'div',
			properties: {
				name: nameTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, body.next()],
		});
	}
}

export const juxtaposePanel = createSchema(JuxtaposePanelModel);

export const juxtapose = createContentModelSchema({
	attributes: {
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Interaction mode: slider, toggle, fade, or auto' },
		orientation: { type: String, required: false, matches: orientationType.slice(), description: 'Divider axis for slider/auto variants (horizontal or vertical)' },
		position: { type: Number, required: false, description: 'Initial slider position as a percentage (0-100)' },
		duration: { type: Number, required: false, description: 'Animation duration in milliseconds (fade/auto variants)' },
		labels: { type: String, required: false, description: 'Comma-separated custom labels for the two panels' },
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		emitTag: 'juxtapose-panel',
		emitAttributes: { name: '$heading' },
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);

		// Combine explicit child tags (preamble items) with emitted section tags
		const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allItems, config) as RenderableTreeNode[],
		);

		const panels = sectionNodes.tag('div').typeof('JuxtaposePanel');
		const panelsContainer = panels.wrap('div');

		// Override panel labels if labels attribute is provided
		if (attrs.labels) {
			const labelParts = attrs.labels.split(',').map((s: string) => s.trim());
			let idx = 0;
			for (const node of panels.nodes) {
				if (Tag.isTag(node) && idx < labelParts.length) {
					// Find the span[property="name"] child and replace its text
					for (const child of node.children) {
						if (Tag.isTag(child) && child.attributes?.property === 'name') {
							child.children = [labelParts[idx]];
						}
					}
					idx++;
				}
			}
		}

		// Meta tags for variant configuration
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'slider' });
		const orientationMeta = new Tag('meta', { content: attrs.orientation ?? 'vertical' });
		const positionMeta = new Tag('meta', { content: String(attrs.position ?? 50) });
		const durationMeta = new Tag('meta', { content: String(attrs.duration ?? 1000) });

		const children = [
			...(headerNodes.count() > 0 ? [headerNodes.wrap('header').next()] : []),
			variantMeta,
			orientationMeta,
			positionMeta,
			durationMeta,
			panelsContainer.next(),
		];

		return createComponentRenderable(schema.Juxtapose, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				panel: panels,
			},
			refs: { ...pageSectionProperties(headerNodes), panels: panelsContainer },
			children,
		});
	},
});
