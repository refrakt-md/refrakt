import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

// Extract plain text from an AST node by walking all text children
function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter(n => n.type === 'text')
		.map(n => n.attributes.content)
		.join('');
}

// Extract bold label from a list item (the text inside the first strong node)
function extractBoldLabel(node: Node): string | null {
	for (const child of node.walk()) {
		if (child.type === 'strong') {
			return Array.from(child.walk())
				.filter(n => n.type === 'text')
				.map(n => n.attributes.content)
				.join('');
		}
	}
	return null;
}

// Determine the row type for a list item
function detectRowType(node: Node): string {
	// Check for task list checkbox pattern: [x] or [ ] at start of text
	const text = extractText(node);
	if (/^\s*\[x\]/i.test(text)) return 'check';
	if (/^\s*\[\s*\]/.test(text)) return 'cross';

	// Check for strikethrough (s node)
	for (const child of node.walk()) {
		if (child.type === 's') return 'negative';
	}

	return 'text';
}

// Remove the bold label from item children to get just the description content.
// The description is everything after "**Label** — " or "**Label** "
function getDescriptionChildren(node: Node): Node[] {
	// Return all children as-is — the theme will render them and
	// the bold label provides context. Keeping the full content
	// ensures rich formatting (links, emphasis, etc.) is preserved.
	return node.children;
}

interface ParsedRow {
	label: string | null;
	rowType: string;
	children: Node[];
}

interface ParsedColumn {
	name: string;
	highlighted: boolean;
	labeledRows: Map<string, ParsedRow>;
	secondaryRows: ParsedRow[];
	callouts: ParsedRow[];
}

class ComparisonRowModel extends Model {
	@attribute({ type: String, required: false })
	label: string = '';

	@attribute({ type: String, required: false })
	rowType: string = 'text';

	transform(): RenderableTreeNodes {
		const labelTag = new Tag('span', {}, [this.label]);
		const rowTypeMeta = new Tag('meta', { content: this.rowType });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.ComparisonRow, {
			tag: 'div',
			properties: {
				label: labelTag,
				rowType: rowTypeMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [labelTag, rowTypeMeta, body.next()],
		});
	}
}

class ComparisonColumnModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	highlighted: string = 'false';

	@group({ include: ['tag'] })
	rows: NodeStream;

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const highlightedMeta = new Tag('meta', { content: this.highlighted });
		const rowStream = this.rows.transform();

		const rowItems = rowStream.tag('div').typeof('ComparisonRow');
		const body = rowItems.wrap('div');

		return createComponentRenderable(schema.ComparisonColumn, {
			tag: 'div',
			properties: {
				name: nameTag,
				highlighted: highlightedMeta,
				row: rowItems,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, highlightedMeta, body.next()],
		});
	}
}

class ComparisonModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number = 2;

	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false })
	highlighted: string = '';

	@attribute({ type: String, required: false })
	layout: string = 'table';

	@attribute({ type: String, required: false })
	labels: string = 'left';

	@attribute({ type: String, required: false })
	collapse: string = 'true';

	@attribute({ type: String, required: false })
	verdict: string = '';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	columns: NodeStream;

	convertHeadings(nodes: Node[]) {
		const converted = headingsToList({ level: this.headingLevel })(nodes);
		const n = converted.length - 1;
		if (!converted[n] || converted[n].type !== 'list') return nodes;

		// --- First pass: parse all columns ---
		const parsedColumns: ParsedColumn[] = [];

		for (const item of converted[n].children) {
			const heading = item.children[0];
			const name = extractText(heading);
			const isHighlighted = name === this.highlighted;

			const column: ParsedColumn = {
				name,
				highlighted: isHighlighted,
				labeledRows: new Map(),
				secondaryRows: [],
				callouts: [],
			};

			for (let i = 1; i < item.children.length; i++) {
				const child = item.children[i];

				if (child.type === 'list') {
					// Process list items as comparison rows
					for (const listItem of child.children) {
						if (listItem.type !== 'item') continue;

						const label = extractBoldLabel(listItem);
						const rowType = detectRowType(listItem);
						const children = getDescriptionChildren(listItem);

						const row: ParsedRow = { label, rowType, children };

						if (label) {
							column.labeledRows.set(label, row);
						} else {
							column.secondaryRows.push(row);
						}
					}
				} else if (child.type === 'blockquote') {
					const text = extractText(child);
					column.callouts.push({
						label: null,
						rowType: 'callout',
						children: child.children,
					});
				}
			}

			parsedColumns.push(column);
		}

		// --- Build master label list (preserving first-seen order) ---
		const masterLabels: string[] = [];
		const seenLabels = new Set<string>();

		for (const col of parsedColumns) {
			for (const label of col.labeledRows.keys()) {
				if (!seenLabels.has(label)) {
					seenLabels.add(label);
					masterLabels.push(label);
				}
			}
		}

		// --- Second pass: create aligned tag nodes ---
		const result: Node[] = converted.slice(0, n);

		for (const col of parsedColumns) {
			const rowNodes: Node[] = [];

			// Aligned rows (in master label order)
			for (const label of masterLabels) {
				const row = col.labeledRows.get(label);
				if (row) {
					rowNodes.push(new Ast.Node('tag', {
						label,
						rowType: row.rowType,
					}, row.children, 'comparison-row'));
				} else {
					// Empty placeholder for missing label
					rowNodes.push(new Ast.Node('tag', {
						label,
						rowType: 'empty',
					}, [], 'comparison-row'));
				}
			}

			// Secondary (unlabeled) rows
			for (const row of col.secondaryRows) {
				rowNodes.push(new Ast.Node('tag', {
					label: '',
					rowType: row.rowType,
				}, row.children, 'comparison-row'));
			}

			// Callout rows
			for (const row of col.callouts) {
				rowNodes.push(new Ast.Node('tag', {
					label: '',
					rowType: 'callout',
				}, row.children, 'comparison-row'));
			}

			result.push(new Ast.Node('tag', {
				name: col.name,
				highlighted: col.highlighted ? 'true' : 'false',
			}, rowNodes, 'comparison-column'));
		}

		// Store master labels for the transform phase
		this._masterLabels = masterLabels;

		return result;
	}

	private _masterLabels: string[] = [];

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const columnStream = this.columns.transform();

		const layoutMeta = new Tag('meta', { content: this.layout });
		const labelsMeta = new Tag('meta', { content: this.labels });
		const collapseMeta = new Tag('meta', { content: this.collapse });
		const verdictMeta = new Tag('meta', { content: this.verdict });
		const highlightedMeta = new Tag('meta', { content: this.highlighted });
		const rowLabelsMeta = new Tag('meta', { content: JSON.stringify(this._masterLabels) });

		const columnItems = columnStream.tag('div').typeof('ComparisonColumn');
		const grid = columnItems.wrap('div');

		const titleTag = this.title ? new Tag('h2', {}, [this.title]) : undefined;

		return createComponentRenderable(schema.Comparison, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				layout: layoutMeta,
				labels: labelsMeta,
				collapse: collapseMeta,
				verdict: verdictMeta,
				highlighted: highlightedMeta,
				rowLabels: rowLabelsMeta,
				column: columnItems,
			},
			refs: {
				grid: grid.tag('div'),
			},
			children: [
				...(titleTag ? [titleTag] : []),
				layoutMeta, labelsMeta, collapseMeta, verdictMeta, highlightedMeta, rowLabelsMeta,
				grid.next(),
			],
		});
	}
}

export const comparisonRow = createSchema(ComparisonRowModel);
export const comparisonColumn = createSchema(ComparisonColumnModel);
export const comparison = createSchema(ComparisonModel);
