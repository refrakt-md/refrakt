import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { SpaceSeparatedList } from '../attributes.js';
import { flow, GridFlow, gridItems, gridLayout } from '../layouts/index.js';

const GRID_MODES = ['columns', 'auto', 'masonry'];

export const grid = createContentModelSchema({
	attributes: {
		columns: { type: Number, required: false, description: 'Number of grid columns' },
		rows: { type: Number, required: false, description: 'Number of grid rows' },
		flow: { type: String, required: false, matches: flow.slice(), description: 'Direction items fill the grid' },
		spans: { type: SpaceSeparatedList, required: false, description: 'Column span widths for each cell (space-separated)' },
		ratio: { type: String, required: false, description: 'Column width ratio (e.g. "2 1 1")' },
		gap: { type: String, required: false, matches: ['none', 'tight', 'default', 'loose'], description: 'Space between grid cells' },
		valign: { type: String, required: false, matches: ['top', 'center', 'bottom', 'stretch', 'baseline'], description: 'Vertical alignment of cell content' },
		collapse: { type: String, required: false, matches: ['sm', 'md', 'lg', 'never'], description: 'Breakpoint at which grid collapses to a single column' },
		mode: { type: String, required: false, matches: ['columns', 'auto', 'masonry'], default: 'columns', description: 'Grid sizing: fixed columns, auto-fit, or masonry' },
		min: { type: String, required: false, description: 'Minimum cell width for auto-fit mode' },
		aspect: { type: String, required: false, description: 'Aspect ratio for grid cells' },
		stack: { type: String, required: false, matches: ['natural', 'reverse'], description: 'Stacking order when collapsed' },
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		dynamicZones: true,
		zoneModel: {
			type: 'sequence',
			fields: [
				{ name: 'content', match: 'any', greedy: true, optional: true },
			],
		},
	},
	deprecations: {
		layout: {
			newName: 'spans',
			transform: (val: any, attrs: Record<string, any>) => {
				if (typeof val === 'string' && GRID_MODES.includes(val)) {
					attrs.mode = val;
					return undefined;
				}
				return val;
			},
		},
	},
	transform(resolved, attrs, config) {
		const zones = (resolved.zones ?? []) as Array<Record<string, unknown>>;
		const tiles = zones.map(zone =>
			new RenderableNodeCursor(
				Markdoc.transform(asNodes(zone.content), config) as RenderableTreeNode[]
			)
		);

		const layout = gridLayout({
			items: gridItems(attrs.spans as string[], tiles),
			rows: attrs.rows as number | undefined,
			columns: attrs.columns as number | undefined,
			flow: attrs.flow as GridFlow,
		});

		const ratioMeta = attrs.ratio ? new Tag('meta', { content: attrs.ratio }) : undefined;
		const gapMeta = attrs.gap && attrs.gap !== 'default' ? new Tag('meta', { content: attrs.gap }) : undefined;
		const valignMeta = attrs.valign ? new Tag('meta', { content: attrs.valign }) : undefined;
		const collapseMeta = attrs.collapse ? new Tag('meta', { content: attrs.collapse }) : undefined;
		const modeMeta = attrs.mode && attrs.mode !== 'columns' ? new Tag('meta', { content: attrs.mode }) : undefined;
		const minMeta = attrs.min ? new Tag('meta', { content: attrs.min }) : undefined;
		const aspectMeta = attrs.aspect ? new Tag('meta', { content: attrs.aspect }) : undefined;
		const stackMeta = attrs.stack ? new Tag('meta', { content: attrs.stack }) : undefined;

		const metas: any[] = [ratioMeta, gapMeta, valignMeta, collapseMeta, modeMeta, minMeta, aspectMeta, stackMeta].filter(Boolean);

		return createComponentRenderable({ rune: 'grid',
			tag: 'section',
			children: [...metas, layout],
			properties: {
				...(modeMeta ? { mode: modeMeta } : {}),
				ratio: ratioMeta,
				gap: gapMeta,
				valign: valignMeta,
				collapse: collapseMeta,
				...(minMeta ? { min: minMeta } : {}),
				...(aspectMeta ? { aspect: aspectMeta } : {}),
				...(stackMeta ? { stack: stackMeta } : {}),
			},
			refs: {
				cell: new RenderableNodeCursor(layout.children).tag('div'),
			}
		});
	},
});
