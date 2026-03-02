import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class RealmSectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.RealmSection, {
			tag: 'div',
			properties: { name: nameTag },
			refs: { body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

class RealmModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: true })
	name: string = '';

	@attribute({ type: String, required: false })
	type: string = 'place';

	@attribute({ type: String, required: false })
	scale: string = '';

	@attribute({ type: String, required: false })
	tags: string = '';

	@attribute({ type: String, required: false })
	parent: string = '';

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

			return new Ast.Node('tag', { name }, item.children.slice(1), 'realm-section');
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
		const realmTypeMeta = new Tag('meta', { content: this.type });
		const scaleMeta = new Tag('meta', { content: this.scale });
		const tagsMeta = new Tag('meta', { content: this.tags });
		const parentMeta = new Tag('meta', { content: this.parent });

		// Extract scene image from header
		const scene = header.tag('img').limit(1);
		const hasScene = scene.count() > 0;
		const sceneDiv = hasScene ? scene.wrap('div') : undefined;

		const sections = itemStream.tag('div').typeof('RealmSection');
		const hasSections = sections.count() > 0;

		const children: any[] = [nameTag, realmTypeMeta, scaleMeta, tagsMeta, parentMeta];
		if (sceneDiv) children.push(sceneDiv.next());

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			children.push(sectionsContainer.next());

			return createComponentRenderable(schema.Realm, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					realmType: realmTypeMeta,
					scale: scaleMeta,
					tags: tagsMeta,
					parent: parentMeta,
					section: sections,
				},
				refs: {
					...(sceneDiv ? { scene: sceneDiv } : {}),
					sections: sectionsContainer,
				},
				children,
			});
		} else {
			const body = itemStream.wrap('div');
			children.push(body.next());

			return createComponentRenderable(schema.Realm, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					realmType: realmTypeMeta,
					scale: scaleMeta,
					tags: tagsMeta,
					parent: parentMeta,
				},
				refs: {
					...(sceneDiv ? { scene: sceneDiv } : {}),
					body,
				},
				children,
			});
		}
	}
}

export const realmSection = createSchema(RealmSectionModel);
export const realm = createSchema(RealmModel);
