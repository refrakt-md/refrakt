import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, Tag as TagType, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createContentModelSchema, createSchema, NodeStream, RenderableNodeCursor, pageSectionProperties, asNodes } from '@refrakt-md/runes';
import { schema } from '../types.js';

class BentoCellModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	size: string = 'small';

	@attribute({ type: String, required: false })
	span: string = '';

	@group({ include: [{ node: 'paragraph', descendantTag: 'icon' }] })
	iconGroup: NodeStream;

	processChildren(nodes: Node[]) {
		const result = super.processChildren(nodes);
		// Remove icon paragraphs from children — they're captured by @group(iconGroup)
		// but @group doesn't remove them, so transformChildren() would include them in the body
		return result.filter(n => {
			if (n.type !== 'paragraph') return true;
			return !Array.from(n.walk()).some(c => c.type === 'tag' && c.tag === 'icon');
		});
	}

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const sizeMeta = new Tag('meta', { content: this.size });

		const iconContent = this.iconGroup
			.useNode('paragraph', (node, config) => {
				const iconTag = Array.from(node.walk()).find(n => n.type === 'tag' && n.tag === 'icon');
				if (iconTag) return Markdoc.transform(iconTag, config);
				return Markdoc.transform(node, config);
			})
			.transform();

		const body = this.transformChildren().wrap('div');
		const hasIcon = iconContent.count() > 0;

		const properties: Record<string, any> = { name: nameTag, size: sizeMeta };
		const refs: Record<string, RenderableNodeCursor<TagType>> = { body: body.tag('div') };
		const children: any[] = [];

		if (hasIcon) {
			const iconWrapper = iconContent.wrap('div');
			properties.icon = iconContent.tags('svg', 'span');
			refs.icon = iconWrapper;
			children.push(iconWrapper.next());
		}

		children.push(nameTag, sizeMeta);

		if (this.span) {
			const spanMeta = new Tag('meta', { content: this.span });
			properties.span = spanMeta;
			children.push(spanMeta);
		}

		children.push(body.next());

		return createComponentRenderable(schema.BentoCell, {
			tag: 'div',
			properties,
			refs,
			children,
		});
	}
}

export const bentoCell = createSchema(BentoCellModel);

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

		const gapMeta = new Tag('meta', { 'data-field': 'gap', content: (attrs.gap as string) ?? '1rem' });
		const columnsMeta = new Tag('meta', { 'data-field': 'columns', content: String(effectiveColumns) });
		const sizingMeta = new Tag('meta', { 'data-field': 'sizing', content: sizing });

		const cells = cellStream.tag('div').typeof('BentoCell');
		const grid = cells.wrap('div');

		const children = header.count() > 0
			? [header.wrap('header').next(), gapMeta, columnsMeta, sizingMeta, grid.next()]
			: [gapMeta, columnsMeta, sizingMeta, grid.next()];

		return createComponentRenderable(schema.Bento, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				cell: cells,
			},
			refs: { ...pageSectionProperties(header), grid },
			children,
		});
	},
});
