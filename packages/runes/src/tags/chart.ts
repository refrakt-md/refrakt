import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { walkTag } from '../util.js';

const chartType = ['bar', 'line', 'pie', 'area'] as const;

/**
 * Extract table data from rendered Markdoc table tags.
 * Returns { headers: string[], rows: string[][] }
 */
function extractTableData(children: any[]): { headers: string[], rows: string[][] } {
	const headers: string[] = [];
	const rows: string[][] = [];

	for (const child of children) {
		if (!Markdoc.Tag.isTag(child)) continue;

		// Unwrap rf-table-wrapper div if present
		let tableNode = child;
		if (child.name === 'div' && child.attributes.class === 'rf-table-wrapper') {
			const inner = child.children.find((c: any) => Markdoc.Tag.isTag(c) && c.name === 'table');
			if (inner && Markdoc.Tag.isTag(inner)) tableNode = inner;
		}

		if (tableNode.name === 'table') {
			for (const tableChild of tableNode.children) {
				if (!Markdoc.Tag.isTag(tableChild)) continue;

				if (tableChild.name === 'thead') {
					for (const tr of tableChild.children) {
						if (!Markdoc.Tag.isTag(tr) || tr.name !== 'tr') continue;
						for (const th of tr.children) {
							if (Markdoc.Tag.isTag(th)) {
								const text = Array.from(walkTag(th))
									.filter(n => typeof n === 'string')
									.join('');
								headers.push(text.trim());
							}
						}
					}
				}

				if (tableChild.name === 'tbody') {
					for (const tr of tableChild.children) {
						if (!Markdoc.Tag.isTag(tr) || tr.name !== 'tr') continue;
						const row: string[] = [];
						for (const td of tr.children) {
							if (Markdoc.Tag.isTag(td)) {
								const text = Array.from(walkTag(td))
									.filter(n => typeof n === 'string')
									.join('');
								row.push(text.trim());
							}
						}
						rows.push(row);
					}
				}
			}
		}
	}

	return { headers, rows };
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

		const typeMeta = new Tag('meta', { content: attrs.type ?? 'bar' });
		const titleMeta = new Tag('meta', { content: attrs.title ?? '' });
		const stackedMeta = new Tag('meta', { content: String(attrs.stacked ?? false) });

		// Extract table data and serialize as JSON
		const tableData = extractTableData(children);
		const dataMeta = new Tag('meta', { content: JSON.stringify(tableData) });

		return createComponentRenderable({ rune: 'chart',
			tag: 'figure',
			properties: {
				type: typeMeta,
				title: titleMeta,
				stacked: stackedMeta,
			},
			refs: {
				data: dataMeta,
			},
			children: [typeMeta, titleMeta, stackedMeta, dataMeta],
		});
	},
});
