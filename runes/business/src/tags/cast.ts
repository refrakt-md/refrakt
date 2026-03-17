import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, pageSectionProperties } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

const layoutType = ['grid', 'list'] as const;

class CastMemberModel extends Model {
	@attribute({ type: String, required: false, description: 'Display name of the cast member.' })
	name: string = '';

	@attribute({ type: String, required: false, description: 'Job title or role held by this member.' })
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

export const castMember = createSchema(CastMemberModel);

export const cast = createContentModelSchema({
	attributes: {
		layout: { type: String, required: false, matches: layoutType.slice(), description: 'Visual arrangement of members: grid for cards, list for a compact roster.' },
	},
	contentModel: {
		type: 'sequence' as const,
		fields: [
			{ name: 'header', match: 'heading|paragraph|image', optional: true, greedy: true },
			{
				name: 'members', match: 'list', optional: true, greedy: true,
				itemModel: {
					fields: [
						{ name: 'role', match: 'text' as const, pattern: /\s*[-–—]\s*(.+)$/, optional: true },
						{ name: 'name', match: 'text' as const, pattern: 'remainder' as const },
					],
				},
				emitTag: 'cast-member',
				emitAttributes: { name: '$name', role: '$role' },
			} as any,
		],
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.members), config) as RenderableTreeNode[],
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
				member: members,
				layout: layoutMeta,
			},
			refs: { ...pageSectionProperties(header), members: membersList },
			children,
		});
	},
});
