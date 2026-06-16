import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, pageSectionProperties, resolveImageScheme } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';

const layoutType = ['grid', 'list'] as const;

export const castMember = createContentModelSchema({
	attributes: {
		name: { type: String, required: false, description: 'Display name of the cast member.' },
		role: { type: String, required: false, description: 'Job title or role held by this member.' },
		image: { type: String, required: false, description: 'Portrait image URL.' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const nameTag = new Tag('span', {}, [attrs.name ?? '']);
		const roleTag = new Tag('span', {}, [attrs.role ?? '']);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		const children: any[] = [];

		// Create portrait image from attribute (extracted by item model or set
		// explicitly). A `placeholder:`/`icon:` scheme src resolves to an inline
		// <svg>; anything else is a normal <img> (SPEC-106).
		let portraitTag: Markdoc.Tag | undefined;
		if (attrs.image) {
			const resolved = resolveImageScheme(attrs.image as string, { alt: attrs.name ?? '', config });
			portraitTag = resolved ?? new Tag('img', { src: attrs.image, alt: attrs.name ?? '' });
			children.push(portraitTag);
		}

		children.push(nameTag, roleTag, body.next());

		return createComponentRenderable({ rune: 'cast-member', schemaOrgType: 'Person',
			tag: 'li',
			refs: {
				name: nameTag,
				role: roleTag,
				body: body.tag('div'),
			},
			schema: {
				name: nameTag,
				jobTitle: roleTag,
				...(portraitTag ? { image: portraitTag } : {}),
			},
			children,
		});
	},
});

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
						{ name: 'image', match: 'image' as const, optional: true, extract: 'src' },
						{ name: 'role', match: 'text' as const, pattern: /\s*[-–—]\s*(.+)$/, optional: true },
						{ name: 'name', match: 'text' as const, pattern: 'remainder' as const },
					],
				},
				emitTag: 'cast-member',
				emitAttributes: { name: '$name', role: '$role', image: '$image' },
			} as any,
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const header = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		// List-shorthand emits cast-member tags via the itemModel; explicit
		// {% cast-member %} children come through `items`. Both feed the same list.
		const allMembers = [...asNodes(resolved.members), ...asNodes(resolved.items)];
		const body = new RenderableNodeCursor(
			Markdoc.transform(allMembers, config) as RenderableTreeNode[],
		);

		const layoutMeta = new Tag('meta', { content: attrs.layout ?? 'grid' });

		const members = body.tag('li').typeof('CastMember');
		const membersList = new Tag('ul', {}, members.toArray());

		const children: any[] = [layoutMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(membersList);

		return createComponentRenderable({ rune: 'cast',
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
