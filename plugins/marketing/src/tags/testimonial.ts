import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	RenderableNodeCursor,
	isMediaNode,
} from '@refrakt-md/runes';

const variantType = ['card', 'inline', 'quote'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const testimonialSections = { avatar: 'media' } as const;
export const testimonialMediaSlots = { avatar: 'portrait' } as const;

// SPEC-130 / WORK-565 — the rune's schema.org mapping, as data. Beside
// `sections` and `mediaSlots` because it is the same kind of fact: what this
// rune *is*, not how a theme renders it (ADR-028).
//
// The two nested entities were hand-built spans below. `entities:` carries them
// declaratively, and the applier resolves each source by name — `quote` and
// `author-name` survive in the output as refs, while `rating`'s meta is dropped
// by `createComponentRenderable` as pure data and is rebuilt from the field bag.
// That third case is what settled the mechanism's shape.
export const testimonialSchema = {
	type: 'Review',
	properties: { quote: 'reviewBody' },
	entities: {
		author: {
			type: 'Person',
			property: 'author',
			properties: { 'author-name': 'name', 'author-role': 'jobTitle' },
		},
		rating: {
			type: 'Rating',
			property: 'reviewRating',
			properties: { rating: 'ratingValue' },
		},
	},
} as const;

export const testimonial = createContentModelSchema({
	sections: testimonialSections,
	mediaSlots: testimonialMediaSlots,
	schema: testimonialSchema,
	attributes: {
		rating: {
			type: Number,
			required: false,
			description: 'Star rating value (1-5) shown alongside the testimonial',
		},
		variant: {
			type: String,
			required: false,
			matches: variantType.slice(),
			description:
				'Visual style: card with border, inline with text flow, or quote with large quotation marks',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
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
						const rest = node.children
							.slice(idx + 1)
							.filter((c: any) => typeof c === 'string')
							.join('')
							.replace(/^\s*[-–—]\s*/, '')
							.trim();

						if (rest) {
							authorRoleTag = new Tag('span', {}, [rest]);
						}
					}
				}
			} else if (
				isMediaNode(node) ||
				(node.name === 'p' && (node as any).children.some((c: any) => isMediaNode(c)))
			) {
				// Extract the avatar — an <img> or a scheme-resolved <svg>
				// (placeholder:/icon:), direct or wrapped in a paragraph (SPEC-106).
				if (isMediaNode(node)) {
					avatarTag = node;
				} else {
					avatarTag = (node as any).children.find((c: any) => isMediaNode(c));
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

		return createComponentRenderable({
			rune: 'testimonial',
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
			children: resultChildren,
		});
	},
});
