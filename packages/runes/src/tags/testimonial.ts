import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const layoutType = ['card', 'inline', 'quote'] as const;

class TestimonialModel extends Model {
	@attribute({ type: Number, required: false })
	rating: number | undefined = undefined;

	@attribute({ type: String, required: false, matches: layoutType.slice() })
	layout: typeof layoutType[number] = 'card';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

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
						authorNameTag = new Tag('span', { property: 'authorName' }, [nameText]);

						// Get the role text after the strong tag
						const idx = node.children.indexOf(child);
						const rest = node.children.slice(idx + 1)
							.filter((c: any) => typeof c === 'string')
							.join('')
							.replace(/^\s*[-–—]\s*/, '')
							.trim();

						if (rest) {
							authorRoleTag = new Tag('span', { property: 'authorRole' }, [rest]);
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

		const ratingMeta = this.rating !== undefined ? new Tag('meta', { content: this.rating }) : undefined;
		const layoutMeta = new Tag('meta', { content: this.layout });

		const resultChildren: any[] = [];
		if (quoteTag) resultChildren.push(quoteTag);
		if (authorNameTag) resultChildren.push(authorNameTag);
		if (authorRoleTag) resultChildren.push(authorRoleTag);
		if (ratingMeta) resultChildren.push(ratingMeta);
		resultChildren.push(layoutMeta);
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
	}
}

export const testimonial = createSchema(TestimonialModel);
