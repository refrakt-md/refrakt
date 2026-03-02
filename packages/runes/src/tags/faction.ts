import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class FactionSectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.FactionSection, {
			tag: 'div',
			properties: { name: nameTag },
			refs: { body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

class FactionModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: true })
	name: string = '';

	@attribute({ type: String, required: false })
	type: string = '';

	@attribute({ type: String, required: false })
	alignment: string = '';

	@attribute({ type: String, required: false })
	size: string = '';

	@attribute({ type: String, required: false })
	tags: string = '';

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	itemgroup: NodeStream;

	convertHeadings(nodes: Node[]) {
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
		if (!level) return nodes;

		const converted = headingsToList({ level })(nodes);
		const n = converted.length - 1;
		if (!converted[n] || converted[n].type !== 'list') return nodes;

		const tags = converted[n].children.map(item => {
			const heading = item.children[0];
			const name = Array.from(heading.walk())
				.filter(n => n.type === 'text')
				.map(t => t.attributes.content)
				.join(' ');

			return new Ast.Node('tag', { name }, item.children.slice(1), 'faction-section');
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

		const nameTag = new Tag('span', {}, [this.name]);
		const factionTypeMeta = new Tag('meta', { content: this.type });
		const alignmentMeta = new Tag('meta', { content: this.alignment });
		const sizeMeta = new Tag('meta', { content: this.size });
		const tagsMeta = new Tag('meta', { content: this.tags });

		const sections = itemStream.tag('div').typeof('FactionSection');
		const hasSections = sections.count() > 0;

		const children: any[] = [nameTag, factionTypeMeta, alignmentMeta, sizeMeta, tagsMeta];

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			children.push(sectionsContainer.next());

			return createComponentRenderable(schema.Faction, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					factionType: factionTypeMeta,
					alignment: alignmentMeta,
					size: sizeMeta,
					tags: tagsMeta,
					section: sections,
				},
				refs: { sections: sectionsContainer },
				children,
			});
		} else {
			const body = itemStream.wrap('div');
			children.push(body.next());

			return createComponentRenderable(schema.Faction, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					factionType: factionTypeMeta,
					alignment: alignmentMeta,
					size: sizeMeta,
					tags: tagsMeta,
				},
				refs: { body },
				children,
			});
		}
	}
}

export const factionSection = createSchema(FactionSectionModel);
export const faction = createSchema(FactionModel);
