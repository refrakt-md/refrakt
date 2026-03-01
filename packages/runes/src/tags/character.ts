import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class StorySectionModel extends Model {
	@attribute({ type: String, required: true })
	name: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.CharacterSection, {
			tag: 'div',
			properties: { name: nameTag },
			refs: { body: body.tag('div') },
			children: [nameTag, body.next()],
		});
	}
}

const roleType = ['protagonist', 'antagonist', 'supporting', 'minor'] as const;
const statusType = ['alive', 'dead', 'unknown', 'missing'] as const;

class CharacterModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: true })
	name: string = '';

	@attribute({ type: String, required: false, matches: roleType.slice() })
	role: typeof roleType[number] = 'supporting';

	@attribute({ type: String, required: false, matches: statusType.slice() })
	status: typeof statusType[number] = 'alive';

	@attribute({ type: String, required: false })
	aliases: string = '';

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

			return new Ast.Node('tag', { name }, item.children.slice(1), 'character-section');
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
		const roleMeta = new Tag('meta', { content: this.role });
		const statusMeta = new Tag('meta', { content: this.status });
		const aliasesMeta = new Tag('meta', { content: this.aliases });
		const tagsMeta = new Tag('meta', { content: this.tags });

		// Extract portrait image from header
		const portrait = header.tag('img').limit(1);
		const hasPortrait = portrait.count() > 0;
		const portraitDiv = hasPortrait ? portrait.wrap('div') : undefined;

		const sections = itemStream.tag('div').typeof('CharacterSection');
		const hasSections = sections.count() > 0;

		const children: any[] = [nameTag, roleMeta, statusMeta, aliasesMeta, tagsMeta];
		if (portraitDiv) children.push(portraitDiv.next());

		if (hasSections) {
			const sectionsContainer = sections.wrap('div');
			children.push(sectionsContainer.next());

			return createComponentRenderable(schema.Character, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					role: roleMeta,
					status: statusMeta,
					aliases: aliasesMeta,
					tags: tagsMeta,
					section: sections,
				},
				refs: {
					...(portraitDiv ? { portrait: portraitDiv } : {}),
					sections: sectionsContainer,
				},
				children,
			});
		} else {
			const body = itemStream.wrap('div');
			children.push(body.next());

			return createComponentRenderable(schema.Character, {
				tag: 'article',
				property: 'contentSection',
				properties: {
					name: nameTag,
					role: roleMeta,
					status: statusMeta,
					aliases: aliasesMeta,
					tags: tagsMeta,
				},
				refs: {
					...(portraitDiv ? { portrait: portraitDiv } : {}),
					body,
				},
				children,
			});
		}
	}
}

export const characterSection = createSchema(StorySectionModel);
export const character = createSchema(CharacterModel);
