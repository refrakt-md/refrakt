import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, pageSectionProperties } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

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
			schema: {
				name: nameTag,
				jobTitle: roleTag,
			},
			children: [nameTag, roleTag, body.next()],
		});
	}
}

// Convert list items with "Name - Role" pattern into cast-member tags
function convertCastChildren(nodes: unknown[]): unknown[] {
	const converted: Node[] = [];

	for (const node of nodes as Node[]) {
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

	return converted;
}

export const castMember = createSchema(CastMemberModel);

export const cast = createContentModelSchema({
	attributes: {
		layout: { type: String, required: false, matches: layoutType.slice() },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertCastChildren,
		description: 'Converts list items with "Name — Role" pattern into cast-member tags.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Separate header content from tag nodes
		const headerAst: Node[] = [];
		const bodyAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag') {
				bodyAst.push(child);
			} else if (child.type === 'heading' || child.type === 'paragraph' || child.type === 'image') {
				headerAst.push(child);
			}
		}

		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAst, config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(bodyAst, config) as RenderableTreeNode[],
		);

		const layoutMeta = new Tag('meta', { content: attrs.layout ?? 'grid' });

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
	},
});
