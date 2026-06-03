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

		// SPEC-083: the authored `<table>` is the single source of truth — the no-JS
		// fallback AND the data the rf-chart web component parses. No JSON-in-meta.
		const table = findTable(children);
		const emitted: RenderableTreeNode[] = table ? [table] : children;
		if (table) {
			table.attributes['data-name'] = 'data';
			if (title) table.children = [new Tag('caption', {}, [title]), ...table.children];
		}

		// type / stacked ride the bag (→ data-type / data-stacked for the client);
		// title lives in the table's <caption>, not a field-meta.
		const typeMeta = new Tag('meta', { content: type });
		const stackedMeta = new Tag('meta', { content: String(stacked) });

		const node = createComponentRenderable({ rune: 'chart',
			tag: 'figure',
			properties: {
				type: typeMeta,
				stacked: stackedMeta,
			},
			children: emitted,
		});
		// Emit as the rf-chart custom element; the web component enhances the table.
		node.name = 'rf-chart';
		return node;
	},
});
