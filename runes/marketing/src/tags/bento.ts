import Markdoc from '@markdoc/markdoc';
import type { Node, Tag as TagType, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, RenderableNodeCursor, pageSectionProperties, asNodes } from '@refrakt-md/runes';

/** Check if a node is a paragraph containing an icon tag. */
function isIconParagraph(node: Node): boolean {
	if (node.type !== 'paragraph') return false;
	return Array.from(node.walk()).some(c => c.type === 'tag' && c.tag === 'icon');
}

/** Split children into icon paragraphs and body content. */
function splitBentoCellChildren(nodes: unknown[]): unknown[] {
	// Pass through — splitting happens in transform
	return nodes as Node[];
}

export const bentoCell = createContentModelSchema({
	attributes: {
		name: { type: String, required: false },
		size: { type: String, required: false },
		span: { type: String, required: false },
	},
	contentModel: {
		type: 'custom',
		processChildren: splitBentoCellChildren,
		description: 'Passes children through for icon/body splitting in transform.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Split into icon paragraphs and body content
		const iconNodes: Node[] = [];
		const bodyNodes: Node[] = [];
		for (const node of allChildren) {
			if (isIconParagraph(node)) {
				iconNodes.push(node);
			} else {
				bodyNodes.push(node);
			}
		}

		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const sizeMeta = new Tag('meta', { content: attrs.size ?? 'small' });

		// Transform icon paragraphs, extracting just the icon tag
		const iconRendered: RenderableTreeNode[] = [];
		for (const node of iconNodes) {
			const iconTag = Array.from(node.walk()).find(n => n.type === 'tag' && n.tag === 'icon');
			if (iconTag) {
				iconRendered.push(Markdoc.transform(iconTag, config) as RenderableTreeNode);
			} else {
				iconRendered.push(Markdoc.transform(node, config) as RenderableTreeNode);
			}
		}
		const iconContent = new RenderableNodeCursor(iconRendered);

		const body = new RenderableNodeCursor(
			Markdoc.transform(bodyNodes, config) as RenderableTreeNode[],
		).wrap('div');
		const hasIcon = iconContent.count() > 0;

		const properties: Record<string, any> = { name: nameTag, size: sizeMeta };
		const refs: Record<string, RenderableNodeCursor<TagType>> = { body: body.tag('div') };
		const children: any[] = [];

		if (hasIcon) {
			const iconWrapper = iconContent.wrap('div');
			properties.iconSource = iconContent.tags('svg', 'span');
			refs.icon = iconWrapper;
			children.push(iconWrapper.next());
		}

		children.push(nameTag, sizeMeta);

		if (attrs.span) {
			const spanMeta = new Tag('meta', { content: attrs.span });
			properties.span = spanMeta;
			children.push(spanMeta);
		}

		children.push(body.next());

		return createComponentRenderable({ rune: 'bento-cell',
			tag: 'div',
			properties,
			refs,
			children,
		});
	},
});

function tieredSize(headingLevel: number, level: number): string {
	const diff = level - headingLevel;
	if (headingLevel === 1) {
		if (diff === 0) return 'full';
		if (diff === 1) return 'large';
		if (diff === 2) return 'medium';
		return 'small';
	}
	if (diff === 0) return 'large';
	if (diff === 1) return 'medium';
	return 'small';
}

function spanForLevel(level: number, columns: number): number {
	return Math.max(1, Math.min(columns, columns + 1 - level));
}

function convertHeadings(
	nodes: Node[],
	headingLevel: number,
	sizing: string,
	columns: number,
): Node[] {
	const baseLevel = headingLevel;
	const isSpanMode = sizing === 'span';
	// In span mode, default to 6 columns (matches 6 heading levels)
	const effectiveColumns = isSpanMode && columns === 4 ? 6 : columns;

	const preamble: Node[] = [];
	const cells: Node[] = [];
	let currentHeading: Node | null = null;
	let currentChildren: Node[] = [];
	let seenFirstCellHeading = false;

	const flush = () => {
		if (currentHeading) {
			const level = currentHeading.attributes?.level ?? baseLevel;
			const name = Array.from(currentHeading.walk())
				.filter(n => n.type === 'text')
				.map(t => t.attributes.content).join(' ');

			const iconTag = Array.from(currentHeading.walk()).find(n => n.type === 'tag' && n.tag === 'icon');
			const cellChildren = iconTag
				? [new Ast.Node('paragraph', {}, [iconTag]), ...currentChildren]
				: [...currentChildren];

			if (isSpanMode) {
				const spanValue = spanForLevel(level, effectiveColumns);
				cells.push(new Ast.Node('tag', { name, size: 'span', span: String(spanValue) }, cellChildren, 'bento-cell'));
			} else {
				const size = tieredSize(baseLevel, level);
				cells.push(new Ast.Node('tag', { name, size }, cellChildren, 'bento-cell'));
			}
		}
	};

	for (const node of nodes) {
		if (node.type === 'heading' && node.attributes.level >= baseLevel) {
			seenFirstCellHeading = true;
			flush();
			currentHeading = node;
			currentChildren = [];
		} else if (!seenFirstCellHeading) {
			preamble.push(node);
		} else {
			currentChildren.push(node);
		}
	}
	flush();

	return [...preamble, ...cells];
}

export const bento = createContentModelSchema({
	attributes: {
		gap: { type: String, required: false, description: 'Space between grid cells (CSS length value)' },
		columns: { type: Number, required: false, description: 'Number of columns in the bento grid' },
		sizing: { type: String, required: false, matches: ['tiered', 'span'], description: 'Cell sizing mode: tiered assigns sizes by heading depth, span sets column span' },
	},
	contentModel: (attrs) => ({
		type: 'custom' as const,
		processChildren: (nodes) => convertHeadings(
			nodes as Node[],
			2,
			attrs.sizing ?? 'tiered',
			attrs.columns ?? 4,
		),
		description: 'Converts headings to bento grid cells with size based on heading level. Supports tiered sizing (large/medium/small) and span mode (column span based on level).',
	}),
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Separate header content (pre-heading paragraphs) from cell tag nodes
		const headerAst: Node[] = [];
		const cellAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag' && (child as any).tag === 'bento-cell') {
				cellAst.push(child);
			} else {
				headerAst.push(child);
			}
		}

		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAst, config) as RenderableTreeNode[],
		);
		const cellStream = new RenderableNodeCursor(
			Markdoc.transform(cellAst, config) as RenderableTreeNode[],
		);

		const sizing = (attrs.sizing as string) ?? 'tiered';
		const columns = (attrs.columns as number) ?? 4;
		const effectiveColumns = sizing === 'span' && columns === 4 ? 6 : columns;

		const gapMeta = new Tag('meta', { content: (attrs.gap as string) ?? '1rem' });
		const columnsMeta = new Tag('meta', { content: String(effectiveColumns) });
		const sizingMeta = new Tag('meta', { content: sizing });

		const cells = cellStream.tag('div').typeof('BentoCell');
		const grid = cells.wrap('div');

		const children = header.count() > 0
			? [header.wrap('header').next(), gapMeta, columnsMeta, sizingMeta, grid.next()]
			: [gapMeta, columnsMeta, sizingMeta, grid.next()];

		return createComponentRenderable({ rune: 'bento',
			tag: 'section',
			property: 'contentSection',
			properties: {
				gap: gapMeta,
				columns: columnsMeta,
				sizing: sizingMeta,
				cell: cells,
			},
			refs: { ...pageSectionProperties(header), grid },
			children,
		});
	},
});
