import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';

const variantType = ['card', 'inline', 'quote'] as const;

export const testimonial = createContentModelSchema({
	attributes: {
		rating: { type: Number, required: false, description: 'Star rating value (1-5) shown alongside the testimonial' },
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Visual style: card with border, inline with text flow, or quote with large quotation marks' },
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
						authorNameTag = new Tag('span', {}, [nameText]);

						// Get the role text after the strong tag
						const idx = node.children.indexOf(child);
						const rest = node.children.slice(idx + 1)
							.filter((c: any) => typeof c === 'string')
							.join('')
							.replace(/^\s*[-–—]\s*/, '')
							.trim();

						if (rest) {
							authorRoleTag = new Tag('span', {}, [rest]);
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

		// Schema.org nested entities for Person author and Rating
		if (authorNameTag) {
			const authorMetas: any[] = [
				new Tag('meta', { property: 'name', content: authorNameTag.children.filter((c: any) => typeof c === 'string').join('') }),
			];
			if (authorRoleTag) {
				authorMetas.push(new Tag('meta', { property: 'jobTitle', content: authorRoleTag.children.filter((c: any) => typeof c === 'string').join('') }));
			}
			resultChildren.push(new Tag('span', { typeof: 'Person', property: 'author' }, authorMetas));
		}
		if (rating !== undefined) {
			resultChildren.push(new Tag('span', { typeof: 'Rating', property: 'reviewRating' }, [
				new Tag('meta', { property: 'ratingValue', content: rating }),
			]));
		}

		return createComponentRenderable({ rune: 'testimonial', schemaOrgType: 'Review',
			tag: 'article',
			properties: {
				rating: ratingMeta,
			},
			refs: {
				quote: quoteTag,
				'author-name': authorNameTag,
				'author-role': authorRoleTag,
				avatar: avatarTag,
			},
			schema: {
				reviewBody: quoteTag,
			},
			children: resultChildren,
		});
	},
});
