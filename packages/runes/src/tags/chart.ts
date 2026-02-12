import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';
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

		if (child.name === 'table') {
			for (const tableChild of child.children) {
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

class ChartModel extends Model {
	@attribute({ type: String, required: false, matches: chartType.slice() })
	type: typeof chartType[number] = 'bar';

	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: Boolean, required: false })
	stacked: boolean = false;

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const typeMeta = new Tag('meta', { content: this.type });
		const titleMeta = new Tag('meta', { content: this.title });
		const stackedMeta = new Tag('meta', { content: String(this.stacked) });

		// Extract table data and serialize as JSON
		const tableData = extractTableData(children.toArray());
		const dataMeta = new Tag('meta', { content: JSON.stringify(tableData) });

		return createComponentRenderable(schema.Chart, {
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
	}
}

export const chart = createSchema(ChartModel);
