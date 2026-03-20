import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const variantType = ['slider', 'toggle', 'fade', 'auto'] as const;
const orientationType = ['horizontal', 'vertical'] as const;

export const juxtapose = createContentModelSchema({
	attributes: {
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Interaction mode: slider, toggle, fade, or auto' },
		orientation: { type: String, required: false, matches: orientationType.slice(), description: 'Divider axis for slider/auto variants (horizontal or vertical)' },
		position: { type: Number, required: false, description: 'Initial slider position as a percentage (0-100)' },
		duration: { type: Number, required: false, description: 'Animation duration in milliseconds (fade/auto variants)' },
		labels: { type: String, required: false, description: 'Comma-separated custom labels for the two panels' },
	},
	contentModel: {
		type: 'delimited' as const,
		delimiter: 'hr',
		dynamicZones: true,
		zoneModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	},
	transform(resolved, attrs, config) {
		const zones = (resolved.zones ?? []) as Array<Record<string, unknown>>;
		const labelParts = attrs.labels
			? (attrs.labels as string).split(',').map((s: string) => s.trim())
			: [];

		const panelNodes: RenderableTreeNode[] = zones.map((zone, i) => {
			const body = new RenderableNodeCursor(
				Markdoc.transform(asNodes(zone.body), config) as RenderableTreeNode[],
			);
			const bodyRef = body.wrap('div');

			const label = labelParts[i];
			const nameTag = label ? new Tag('span', {}, [label]) : undefined;

			return createComponentRenderable(schema.JuxtaposePanel, {
				tag: 'div',
				properties: nameTag ? { name: nameTag } : {},
				refs: {
					body: bodyRef.tag('div'),
				},
				children: [...(nameTag ? [nameTag] : []), bodyRef.next()],
			});
		});

		const panels = new RenderableNodeCursor(panelNodes).tag('div').typeof('JuxtaposePanel');
		const panelsContainer = panels.wrap('div');

		// Meta tags for variant configuration
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'slider' });
		const orientationMeta = new Tag('meta', { content: attrs.orientation ?? 'vertical' });
		const positionMeta = new Tag('meta', { content: String(attrs.position ?? 50) });
		const durationMeta = new Tag('meta', { content: String(attrs.duration ?? 1000) });

		return createComponentRenderable(schema.Juxtapose, {
			tag: 'section',
			properties: {
				panel: panels,
				variant: variantMeta,
				orientation: orientationMeta,
				position: positionMeta,
				duration: durationMeta,
			},
			refs: { panels: panelsContainer },
			children: [
				variantMeta,
				orientationMeta,
				positionMeta,
				durationMeta,
				panelsContainer.next(),
			],
		});
	},
});
