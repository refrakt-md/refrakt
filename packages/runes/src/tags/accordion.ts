import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

class AccordionItemModel extends Model {
	@attribute({ type: String, required: true })
	name: string;

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('summary', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.AccordionItem, {
			tag: 'details',
			properties: {
				name: nameTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, body.next()],
		});
	}
}

class AccordionModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: Boolean, required: false })
	multiple: boolean = true;

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	itemgroup: NodeStream;

	convertHeadings(nodes: Node[]) {
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
		if (!level) return nodes;
		const converted = headingsToList({ level })(nodes);
		const n = converted.length - 1;
		const tags = converted[n].children.map(item => {
			const heading = item.children[0];
			const name = Array.from(heading.walk()).filter(n => n.type === 'text').map(t => t.attributes.content).join(' ');
			return new Ast.Node('tag', { name }, item.children.slice(1), 'accordion-item');
		});

		converted.splice(n, 1, ...tags);
		return converted;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const itemStream = this.itemgroup.transform();

		const items = itemStream.tag('details').typeof('AccordionItem');
		const itemsContainer = items.wrap('div');

		const children = header.count() > 0
			? [header.wrap('header').next(), itemsContainer.next()]
			: [itemsContainer.next()];

		return createComponentRenderable(schema.Accordion, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				item: items,
			},
			refs: { items: itemsContainer },
			children,
		});
	}
}

export const accordionItem = createSchema(AccordionItemModel);

export const accordion = createSchema(AccordionModel);
