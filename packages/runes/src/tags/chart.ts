import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';

const chartType = ['bar', 'line', 'pie', 'area'] as const;

/** Find the rendered data `<table>` (possibly inside a table wrapper). */
function findTable(nodes: RenderableTreeNode[]): InstanceType<typeof Tag> | undefined {
	for (const n of nodes) {
		if (!Markdoc.Tag.isTag(n)) continue;
		if (n.name === 'table') return n;
		if (n.name === 'div') {
			const inner = n.children.find(c => Markdoc.Tag.isTag(c) && c.name === 'table');
			if (inner && Markdoc.Tag.isTag(inner)) return inner;
		}
	}
	return undefined;
}

export const chart = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, matches: chartType.slice(), description: 'Chart visualization type' },
		title: { type: String, required: false, description: 'Title displayed above the chart' },
		stacked: { type: Boolean, required: false, description: 'Stack data series instead of grouping' },
		'tick-count': { type: Number, required: false, description: 'Approximate number of Y-axis ticks (default 5). Ignored when tick-step is set.' },
		'tick-step': { type: Number, required: false, description: 'Explicit unit-span between Y-axis ticks (e.g. 10, 0.5). Overrides tick-count.' },
		'label-angle': { type: String, required: false, description: 'X-axis label rotation: "auto" (default) rotates -45° when slots are crowded, "0" forces horizontal, or any explicit degree (e.g. "-45", "-90").' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[];

		const type = attrs.type ?? 'bar';
		const title = attrs.title ?? '';
		const stacked = attrs.stacked ?? false;
		const tickCount = attrs['tick-count'];
		const tickStep = attrs['tick-step'];
		const labelAngle = attrs['label-angle'];

		// SPEC-083: the authored `<table>` is the single source of truth — the no-JS
		// fallback AND the data the rf-chart web component parses. No JSON-in-meta.
		const table = findTable(children);
		const emitted: RenderableTreeNode[] = table ? [table] : children;
		if (table) {
			table.attributes['data-name'] = 'data';
			if (title) table.children = [new Tag('caption', {}, [title]), ...table.children];
		}

		// type / stacked / tick-count / tick-step / label-angle ride the bag
		// (→ data-type / data-stacked / data-tick-count / data-tick-step /
		// data-label-angle) for the client; title lives in the table's <caption>.
		const typeMeta = new Tag('meta', { content: type });
		const stackedMeta = new Tag('meta', { content: String(stacked) });
		const tickCountMeta = tickCount != null ? new Tag('meta', { content: String(tickCount) }) : undefined;
		const tickStepMeta = tickStep != null ? new Tag('meta', { content: String(tickStep) }) : undefined;
		const labelAngleMeta = labelAngle != null && labelAngle !== '' ? new Tag('meta', { content: String(labelAngle) }) : undefined;

		const node = createComponentRenderable({ rune: 'chart',
			tag: 'figure',
			properties: {
				type: typeMeta,
				stacked: stackedMeta,
				...(tickCountMeta ? { 'tick-count': tickCountMeta } : {}),
				...(tickStepMeta ? { 'tick-step': tickStepMeta } : {}),
				...(labelAngleMeta ? { 'label-angle': labelAngleMeta } : {}),
			},
			children: emitted,
		});
		// Emit as the rf-chart custom element; the web component enhances the table.
		node.name = 'rf-chart';
		return node;
	},
});
