import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

const variantType = ['card', 'inline', 'quote'] as const;

export const testimonial = createContentModelSchema({
	attributes: {
		rating: { type: Number, required: false },
		variant: { type: String, required: false, matches: variantType.slice() },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	deprecations: {
		layout: { newName: 'variant' },
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		// Extract blockquote as the testimonial quote
		let quoteTag: any;
		let authorNameTag: any;
		let authorRoleTag: any;
		let avatarTag: any;

		for (const node of children.toArray()) {
			if (!Tag.isTag(node)) continue;

			if (node.name === 'blockquote' && !quoteTag) {
				quoteTag = node;
			} else if (node.name === 'p' && !authorNameTag) {
				// Parse "**Name** — Role, Company" pattern from paragraph
				for (const child of node.children) {
					if (Tag.isTag(child) && child.name === 'strong' && !authorNameTag) {
						const nameText = child.children.filter((c: any) => typeof c === 'string').join('');
						authorNameTag = new Tag('span', { 'data-field': 'author-name' }, [nameText]);

						// Get the role text after the strong tag
						const idx = node.children.indexOf(child);
						const rest = node.children.slice(idx + 1)
							.filter((c: any) => typeof c === 'string')
							.join('')
							.replace(/^\s*[-–—]\s*/, '')
							.trim();

						if (rest) {
							authorRoleTag = new Tag('span', { 'data-field': 'author-role' }, [rest]);
						}
					}
				}
			} else if (node.name === 'img' || (node.name === 'p' && (node as any).children.some((c: any) => Tag.isTag(c) && c.name === 'img'))) {
				// Extract image (could be direct or wrapped in p)
				if (node.name === 'img') {
					avatarTag = node;
				} else {
					avatarTag = (node as any).children.find((c: any) => Tag.isTag(c) && c.name === 'img');
				}
			}
		}

		const rating = attrs.rating;
		const variant = attrs.variant ?? 'card';

		const ratingMeta = rating !== undefined ? new Tag('meta', { content: rating }) : undefined;
		const variantMeta = new Tag('meta', { content: variant });

		const resultChildren: any[] = [];
		if (quoteTag) resultChildren.push(quoteTag);
		if (authorNameTag) resultChildren.push(authorNameTag);
		if (authorRoleTag) resultChildren.push(authorRoleTag);
		if (ratingMeta) resultChildren.push(ratingMeta);
		resultChildren.push(variantMeta);
		if (avatarTag) resultChildren.push(avatarTag);

		return createComponentRenderable(schema.Testimonial, {
			tag: 'article',
			properties: {
				quote: quoteTag,
				authorName: authorNameTag,
				authorRole: authorRoleTag,
				rating: ratingMeta,
				avatar: avatarTag,
			},
			children: resultChildren,
		});
	},
});
