import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createSchema, NodeStream, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

class BentoCellModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	size: string = 'small';

	@attribute({ type: String, required: false })
	span: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const sizeMeta = new Tag('meta', { content: this.size });
		const body = this.transformChildren().wrap('div');

		if (this.span) {
			const spanMeta = new Tag('meta', { content: this.span });
			return createComponentRenderable(schema.BentoCell, {
				tag: 'div',
				properties: {
					name: nameTag,
					size: sizeMeta,
					span: spanMeta,
				},
				refs: {
					body: body.tag('div'),
				},
				children: [nameTag, sizeMeta, spanMeta, body.next()],
			});
		}

		return createComponentRenderable(schema.BentoCell, {
			tag: 'div',
			properties: {
				name: nameTag,
				size: sizeMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, sizeMeta, body.next()],
		});
	}
}

class BentoModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number = 2;

	@attribute({ type: String, required: false })
	gap: string = '1rem';

	@attribute({ type: Number, required: false })
	columns: number = 4;

	@attribute({ type: String, required: false })
	sizing: string = 'tiered';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	cellgroup: NodeStream;

	private tieredSize(diff: number): string {
		if (this.headingLevel === 1) {
			// 4-tier: full → large → medium → small
			if (diff === 0) return 'full';
			if (diff === 1) return 'large';
			if (diff === 2) return 'medium';
			return 'small';
		}
		// 3-tier (default): large → medium → small
		if (diff === 0) return 'large';
		if (diff === 1) return 'medium';
		return 'small';
	}

	private get effectiveColumns(): number {
		// In span mode, default to 6 columns (matches 6 heading levels)
		if (this.sizing === 'span' && this.columns === 4) return 6;
		return this.columns;
	}

	private spanForLevel(level: number): number {
		const cols = this.effectiveColumns;
		return Math.max(1, Math.min(cols, cols + 1 - level));
	}

	convertHeadings(nodes: Node[]) {
		const baseLevel = this.headingLevel;
		const isSpanMode = this.sizing === 'span';
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

				if (isSpanMode) {
					const spanValue = this.spanForLevel(level);
					cells.push(new Ast.Node('tag', { name, size: 'span', span: String(spanValue) }, currentChildren, 'bento-cell'));
				} else {
					const diff = level - baseLevel;
					const size = this.tieredSize(diff);
					cells.push(new Ast.Node('tag', { name, size }, currentChildren, 'bento-cell'));
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

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const cellStream = this.cellgroup.transform();
		const cols = this.effectiveColumns;
		const gapMeta = new Tag('meta', { content: this.gap });
		const columnsMeta = new Tag('meta', { content: String(cols) });
		const sizingMeta = new Tag('meta', { content: this.sizing });

		const cells = cellStream.tag('div').typeof('BentoCell');
		const grid = cells.wrap('div');

		const children = header.count() > 0
			? [header.wrap('header').next(), gapMeta, columnsMeta, sizingMeta, grid.next()]
			: [gapMeta, columnsMeta, sizingMeta, grid.next()];

		return createComponentRenderable(schema.Bento, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				cell: cells,
			},
			refs: { grid },
			children,
		});
	}
}

export const bentoCell = createSchema(BentoCellModel);

export const bento = createSchema(BentoModel);
