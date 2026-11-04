import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	asNodes,
	renderNodes,
	headingsToList,
	extractText,
	fieldMetas,
} from '@refrakt-md/runes';

function extractBoldLabel(node: Node): string | null {
	for (const child of node.walk()) {
		if (child.type === 'strong') {
			return Array.from(child.walk())
				.filter((n) => n.type === 'text')
				.map((n) => n.attributes.content)
				.join('');
		}
	}
	return null;
}

function detectRowType(node: Node): string {
	const text = extractText(node);
	if (/^\s*\[x\]/i.test(text)) return 'check';
	if (/^\s*\[\s*\]/.test(text)) return 'cross';

	for (const child of node.walk()) {
		if (child.type === 's') return 'negative';
	}

	return 'text';
}

function getDescriptionChildren(node: Node): Node[] {
	if (!node.children.length) return node.children;

	const firstChild = node.children[0];
	if (firstChild.type !== 'paragraph' && firstChild.type !== 'inline') return node.children;

	const strongIndex = firstChild.children.findIndex((c) => c.type === 'strong');
	if (strongIndex === -1) return node.children;

	const afterStrong = firstChild.children.slice(strongIndex + 1);

	if (afterStrong.length > 0 && afterStrong[0].type === 'text') {
		const text = afterStrong[0].attributes.content;
		const stripped = text.replace(/^\s*[-–—:]\s*/, '');
		if (stripped) {
			afterStrong[0] = new Ast.Node('text', { content: stripped }, []);
		} else {
			afterStrong.shift();
		}
	}

	if (afterStrong.length === 0) {
		return node.children.slice(1);
	}

	const newParagraph = new Ast.Node('paragraph', firstChild.attributes, afterStrong);
	return [newParagraph, ...node.children.slice(1)];
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

const comparisonRow = createContentModelSchema({
	attributes: {
		label: { type: String, required: false },
		rowType: { type: String, required: false },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const labelTag = new Tag('span', {}, [attrs.label ?? '']);
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'comparison-row',
			tag: 'div',
			properties: fieldMetas(attrs, config, {
				rowType: 'text',
			}),
			refs: {
				body: body.tag('div'),
				label: labelTag,
			},
			children: [labelTag, body.next()],
		});
	},
});

const comparisonColumn = createContentModelSchema({
	attributes: {
		name: { type: String, required: false },
		highlighted: { type: Boolean, required: false },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const highlightedMeta = new Tag('meta', { content: String(attrs.highlighted ?? false) });
		const rowStream = renderNodes(resolved.body, config);

		const rowItems = rowStream.tag('div').typeof('ComparisonRow');
		const body = rowItems.wrap('div');

		return createComponentRenderable({
			rune: 'comparison-column',
			tag: 'div',
			properties: {
				highlighted: highlightedMeta,
				row: rowItems,
			},
			refs: {
				body: body.tag('div'),
				name: nameTag,
			},
			children: [nameTag, body.next()],
		});
	},
});

function convertComparisonChildren(
	nodes: unknown[],
	attributes: Record<string, unknown>,
): unknown[] {
	const highlighted = (attributes.highlighted as string) ?? '';

	const converted = headingsToList({ level: 2 })(nodes as Node[]);
	const n = converted.length - 1;
	if (!converted[n] || converted[n].type !== 'list') return nodes;

	const parsedColumns: ParsedColumn[] = [];

	for (const item of converted[n].children) {
		const heading = item.children[0];
		const name = extractText(heading);
		const isHighlighted = name === highlighted;

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
				column.callouts.push({
					label: null,
					rowType: 'callout',
					children: child.children,
				});
			}
		}

		parsedColumns.push(column);
	}

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

	const result: Node[] = converted.slice(0, n);

	result.push(
		new Ast.Node(
			'tag',
			{
				_masterLabels: JSON.stringify(masterLabels),
			},
			[],
			'__comparison-meta',
		),
	);

	for (const col of parsedColumns) {
		const rowNodes: Node[] = [];

		for (const label of masterLabels) {
			const row = col.labeledRows.get(label);
			if (row) {
				rowNodes.push(
					new Ast.Node(
						'tag',
						{
							label,
							rowType: row.rowType,
						},
						row.children,
						'comparison-row',
					),
				);
			} else {
				rowNodes.push(
					new Ast.Node(
						'tag',
						{
							label,
							rowType: 'empty',
						},
						[],
						'comparison-row',
					),
				);
			}
		}

		for (const row of col.secondaryRows) {
			rowNodes.push(
				new Ast.Node(
					'tag',
					{
						label: '',
						rowType: row.rowType,
					},
					row.children,
					'comparison-row',
				),
			);
		}

		for (const row of col.callouts) {
			rowNodes.push(
				new Ast.Node(
					'tag',
					{
						label: '',
						rowType: 'callout',
					},
					row.children,
					'comparison-row',
				),
			);
		}

		result.push(
			new Ast.Node(
				'tag',
				{
					name: col.name,
					highlighted: col.highlighted ? 'true' : 'false',
				},
				rowNodes,
				'comparison-column',
			),
		);
	}

	return result;
}

export { comparisonRow, comparisonColumn };

interface RowData {
	label: string;
	rowType: string;
	body: RenderableTreeNode[];
}
interface ColData {
	name: string;
	highlighted: boolean;
	rows: RowData[];
}

function buildComparisonTable(
	columns: ColData[],
	rowLabels: string[],
	labelsPosition: string,
): InstanceType<typeof Tag> {
	const headerCells: RenderableTreeNode[] = [];
	if (labelsPosition !== 'hidden')
		headerCells.push(new Tag('th', { class: 'rf-comparison__label-col' }, []));
	for (const col of columns) {
		const thChildren: RenderableTreeNode[] = [col.name];
		if (col.highlighted)
			thChildren.push(
				new Tag('span', { class: 'rf-comparison__recommended-badge' }, ['Recommended']),
			);
		headerCells.push(
			new Tag(
				'th',
				col.highlighted ? { class: 'rf-comparison__col-header--highlighted' } : {},
				thChildren,
			),
		);
	}
	const thead = new Tag('thead', {}, [new Tag('tr', {}, headerCells)]);

	const bodyRows: RenderableTreeNode[] = [];
	for (let i = 0; i < rowLabels.length; i++) {
		const cells: RenderableTreeNode[] = [];
		if (labelsPosition !== 'hidden')
			cells.push(
				new Tag('th', { class: 'rf-comparison__row-label', scope: 'row' }, [rowLabels[i]]),
			);
		for (const col of columns) {
			const row = col.rows[i];
			const rType = row ? row.rowType : 'empty';
			const body = row ? row.body : [];

			let cellCls = 'rf-comparison__cell';
			if (col.highlighted) cellCls += ' rf-comparison__cell--highlighted';
			if (rType === 'empty') cellCls += ' rf-comparison__cell--empty';

			const cellChildren: RenderableTreeNode[] = [];
			if (rType === 'check') {
				cellChildren.push(
					new Tag(
						'span',
						{
							class: 'rf-comparison__row-icon rf-comparison__row-icon--check',
							'aria-label': 'Supported',
						},
						['✓'],
					),
				);
			} else if (rType === 'cross') {
				cellChildren.push(
					new Tag(
						'span',
						{
							class: 'rf-comparison__row-icon rf-comparison__row-icon--cross',
							'aria-label': 'Not supported',
						},
						['✗'],
					),
				);
			} else if (rType === 'negative' && body.length) {
				cellChildren.push(new Tag('span', { class: 'rf-comparison__negative' }, body));
			} else if (rType === 'empty') {
				cellChildren.push(
					new Tag('span', { class: 'rf-comparison__cell--empty', 'aria-label': 'Not applicable' }, [
						'—',
					]),
				);
			} else if (rType === 'callout' && body.length) {
				cellChildren.push(new Tag('span', { class: 'rf-comparison__callout-badge' }, body));
			} else if (body.length) {
				cellChildren.push(...body);
			}

			cells.push(new Tag('td', { class: cellCls }, cellChildren));
		}
		bodyRows.push(new Tag('tr', {}, cells));
	}
	const tbody = new Tag('tbody', {}, bodyRows);

	return new Tag('div', { class: 'rf-comparison__table-wrapper' }, [
		new Tag('table', { class: 'rf-comparison__table' }, [thead, tbody]),
	]);
}

function buildComparisonCards(columns: ColData[]): InstanceType<typeof Tag> {
	const cards = columns.map((col) => {
		const cardCls = col.highlighted
			? 'rf-comparison-card rf-comparison-card--highlighted'
			: 'rf-comparison-card';
		const cardChildren: RenderableTreeNode[] = [];
		if (col.highlighted)
			cardChildren.push(new Tag('div', { class: 'rf-comparison-card__badge' }, ['Recommended']));
		cardChildren.push(new Tag('h3', { class: 'rf-comparison-card__name' }, [col.name]));

		const rowItems: RenderableTreeNode[] = [];
		for (const row of col.rows) {
			const rType = row.rowType || 'text';
			if (rType === 'empty') continue;
			const label = row.label;
			const body = row.body;

			let liCls = 'rf-comparison-card__row';
			if (rType === 'negative') liCls += ' rf-comparison-card__row--negative';
			if (rType === 'callout') liCls += ' rf-comparison-card__row--callout';

			const liChildren: RenderableTreeNode[] = [];
			if (rType === 'check') {
				liChildren.push(
					new Tag(
						'span',
						{
							class: 'rf-comparison__row-icon rf-comparison__row-icon--check',
							'aria-label': 'Supported',
						},
						['✓'],
					),
				);
				if (label) liChildren.push(new Tag('strong', {}, [label]));
				liChildren.push(...body);
			} else if (rType === 'cross') {
				liChildren.push(
					new Tag(
						'span',
						{
							class: 'rf-comparison__row-icon rf-comparison__row-icon--cross',
							'aria-label': 'Not supported',
						},
						['✗'],
					),
				);
				if (label) liChildren.push(new Tag('strong', {}, [label]));
				liChildren.push(...body);
			} else if (rType === 'negative') {
				if (label) liChildren.push(new Tag('strong', {}, [label]));
				if (body.length)
					liChildren.push(new Tag('span', { class: 'rf-comparison__negative' }, body));
			} else if (rType === 'callout') {
				liChildren.push(new Tag('div', { class: 'rf-comparison__callout-badge' }, body));
			} else {
				if (label) liChildren.push(new Tag('strong', {}, [label]));
				liChildren.push(...body);
			}

			rowItems.push(new Tag('li', { class: liCls }, liChildren));
		}

		cardChildren.push(new Tag('ul', { class: 'rf-comparison-card__rows' }, rowItems));
		return new Tag('div', { class: cardCls }, cardChildren);
	});

	return new Tag('div', { class: 'rf-comparison__cards' }, cards);
}

export const comparison = createContentModelSchema({
	attributes: {
		title: {
			type: String,
			required: false,
			description: 'Heading displayed above the comparison table',
		},
		highlighted: {
			type: String,
			required: false,
			description: 'Column name to visually emphasize as the recommended choice',
		},
		layout: {
			type: String,
			required: false,
			description: 'Display format for the comparison (e.g. table)',
		},
		labels: {
			type: String,
			required: false,
			description: 'Position of row labels: left column or hidden',
		},
		collapse: {
			type: Boolean,
			required: false,
			description: 'Whether rows collapse into an accordion on small screens',
		},
		verdict: {
			type: String,
			required: false,
			description: 'Summary text shown below the table as a final recommendation',
		},
	},
	contentModel: {
		type: 'custom',
		processChildren: convertComparisonChildren,
		description:
			'Multi-pass heading+list parser with cross-column row alignment. ' +
			'Converts headings to columns, list items to rows with bold labels for alignment, ' +
			'blockquotes to callouts, and builds a master label list for cross-column row matching.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		let masterLabels: string[] = [];
		const columnAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag' && (child as any).tag === '__comparison-meta') {
				masterLabels = JSON.parse(child.attributes._masterLabels || '[]');
			} else if (child.type === 'tag' && (child as any).tag === 'comparison-column') {
				columnAst.push(child);
			}
		}

		const layout = (attrs.layout as string) ?? 'table';
		const labelsPosition = (attrs.labels as string) ?? 'left';
		const verdict = (attrs.verdict as string) ?? '';
		const title = (attrs.title as string) ?? '';

		const columns: ColData[] = columnAst.map((colTag) => ({
			name: (colTag.attributes.name as string) ?? '',
			highlighted: colTag.attributes.highlighted === 'true',
			rows: colTag.children
				.filter((c) => c.type === 'tag' && (c as any).tag === 'comparison-row')
				.map((rowTag) => ({
					label: (rowTag.attributes.label as string) ?? '',
					rowType: (rowTag.attributes.rowType as string) ?? 'text',
					body: Markdoc.transform(rowTag.children, config) as RenderableTreeNode[],
				})),
		}));

		const layoutMeta = new Tag('meta', { content: layout });

		const children: RenderableTreeNode[] = [];
		if (title) children.push(new Tag('h2', { class: 'rf-comparison__title' }, [title]));
		children.push(
			layout === 'cards'
				? buildComparisonCards(columns)
				: buildComparisonTable(columns, masterLabels, labelsPosition),
		);
		if (verdict) children.push(new Tag('p', { class: 'rf-comparison__verdict' }, [verdict]));

		return createComponentRenderable({
			rune: 'comparison',
			tag: 'section',
			properties: {
				layout: layoutMeta,
			},
			children,
		});
	},
});
