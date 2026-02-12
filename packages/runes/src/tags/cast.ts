import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

const layoutType = ['grid', 'list'] as const;
const NAME_ROLE_PATTERN = /^(.+?)\s*[-–—]\s*(.+)$/;

class CastMemberModel extends Model {
	@attribute({ type: String, required: false })
	name: string = '';

	@attribute({ type: String, required: false })
	role: string = '';

	transform(): RenderableTreeNodes {
		const nameTag = new Tag('span', {}, [this.name]);
		const roleTag = new Tag('span', {}, [this.role]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.CastMember, {
			tag: 'li',
			properties: {
				name: nameTag,
				role: roleTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, roleTag, body.next()],
		});
	}
}

class CastModel extends Model {
	@attribute({ type: String, required: false, matches: layoutType.slice() })
	layout: typeof layoutType[number] = 'grid';

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['list', 'tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		// Convert list items with "Name - Role" pattern into cast-member tags
		const converted: Node[] = [];

		for (const node of nodes) {
			if (node.type === 'list') {
				for (const item of node.children) {
					const textParts: string[] = [];
					for (const child of item.walk()) {
						if (child.type === 'text' && child.attributes.content) {
							textParts.push(child.attributes.content);
						}
					}
					const text = textParts.join(' ').trim();
					const match = text.match(NAME_ROLE_PATTERN);

					if (match) {
						converted.push(new Ast.Node('tag', {
							name: match[1].trim(),
							role: match[2].trim(),
						}, [], 'cast-member'));
					} else {
						converted.push(new Ast.Node('tag', {
							name: text,
							role: '',
						}, [], 'cast-member'));
					}
				}
			} else {
				converted.push(node);
			}
		}

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const body = this.body.transform();
		const layoutMeta = new Tag('meta', { content: this.layout });

		const members = body.tag('li').typeof('CastMember');
		const membersList = new Tag('ul', {}, members.toArray());

		const children: any[] = [layoutMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(membersList);

		return createComponentRenderable(schema.Cast, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				member: members,
				layout: layoutMeta,
			},
			refs: { members: membersList },
			children,
		});
	}
}

export const castMember = createSchema(CastMemberModel);
export const cast = createSchema(CastModel);
