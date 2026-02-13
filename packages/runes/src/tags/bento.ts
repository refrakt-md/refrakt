import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

class BentoCellModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	size: string = 'small';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const sizeMeta = new Tag('meta', { content: this.size });
		const body = this.transformChildren().wrap('div');

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

	@group({ include: ['tag'] })
	cellgroup: NodeStream;

	convertHeadings(nodes: Node[]) {
		const baseLevel = this.headingLevel;
		const cells: Node[] = [];
		let currentHeading: Node | null = null;
		let currentChildren: Node[] = [];

		const flush = () => {
			if (currentHeading) {
				const level = currentHeading.attributes?.level ?? baseLevel;
				const name = Array.from(currentHeading.walk())
					.filter(n => n.type === 'text')
					.map(t => t.attributes.content).join(' ');
				const diff = level - baseLevel;
				const size = diff === 0 ? 'large' : diff === 1 ? 'medium' : 'small';
				cells.push(new Ast.Node('tag', { name, size }, currentChildren, 'bento-cell'));
			}
		};

		for (const node of nodes) {
			if (node.type === 'heading' && node.attributes.level >= baseLevel) {
				flush();
				currentHeading = node;
				currentChildren = [];
			} else {
				currentChildren.push(node);
			}
		}
		flush();

		return cells;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const cellStream = this.cellgroup.transform();
		const gapMeta = new Tag('meta', { content: this.gap });
		const columnsMeta = new Tag('meta', { content: String(this.columns) });

		const cells = cellStream.tag('div').typeof('BentoCell');
		const grid = cells.wrap('div');

		return createComponentRenderable(schema.Bento, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				cell: cells,
			},
			refs: { grid },
			children: [gapMeta, columnsMeta, grid.next()],
		});
	}
}

export const bentoCell = createSchema(BentoCellModel);

export const bento = createSchema(BentoModel);
