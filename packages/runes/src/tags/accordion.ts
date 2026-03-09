import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

function tagText(nodes: any[]): string {
	return nodes.map((n: any) => {
		if (typeof n === 'string') return n;
		if (Tag.isTag(n)) return tagText(n.children);
		return '';
	}).join('').trim();
}

class AccordionItemModel extends Model {
	@attribute({ type: String, required: true })
	name: string;

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('summary', {}, [this.name]);
		const body = this.transformChildren().wrap('div');
		const bodyDivs = body.tag('div');

		// For FAQ schema: body div becomes Answer entity with text property
		const bodyNode = bodyDivs.nodes[0];
		const answerText = Tag.isTag(bodyNode) ? tagText(bodyNode.children) : '';
		const textMeta = new Tag('meta', { content: answerText });

		for (const node of bodyDivs.nodes) {
			if (Tag.isTag(node)) {
				node.attributes['typeof'] = 'Answer';
				node.children.push(textMeta);
			}
		}

		return createComponentRenderable(schema.AccordionItem, {
			tag: 'details',
			properties: {
				name: nameTag,
			},
			refs: {
				body: bodyDivs,
			},
			schema: {
				name: nameTag,
				acceptedAnswer: bodyDivs,
				text: textMeta,
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
			schema: {
				mainEntity: items,
			},
			children,
		});
	}
}

export const accordionItem = createSchema(AccordionItemModel);

export const accordion = createSchema(AccordionModel);
