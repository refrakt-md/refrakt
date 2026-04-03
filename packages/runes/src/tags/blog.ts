import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

const { Tag } = Markdoc;

const sortOptions = ['date-desc', 'date-asc', 'title-asc', 'title-desc'] as const;
const layoutOptions = ['list', 'grid', 'compact'] as const;

export const blog = createContentModelSchema({
	attributes: {
		folder: { type: String, required: true, description: 'Content folder path to list blog posts from (e.g. "/blog")' },
		sort: { type: String, required: false, default: 'date-desc', matches: sortOptions.slice(), description: 'Sort order: date-desc, date-asc, title-asc, title-desc' },
		filter: { type: String, required: false, default: '', description: 'Filter expression to match against frontmatter fields (e.g. "tag:javascript" or "draft:false")' },
		limit: { type: Number, required: false, description: 'Maximum number of posts to display' },
		layout: { type: String, required: false, default: 'list', matches: layoutOptions.slice(), description: 'Display layout: list, grid, or compact' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'headline', match: 'heading', optional: true },
			{ name: 'blurb', match: 'paragraph', optional: true },
		],
	},
	transform(resolved, attrs, config) {
		const headerAstNodes = [
			resolved.headline,
			resolved.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Meta tags for attributes consumed by the identity transform
		const folderMeta = new Tag('meta', { content: attrs.folder });
		const sortMeta = new Tag('meta', { content: attrs.sort || 'date-desc' });
		const filterMeta = new Tag('meta', { content: attrs.filter || '' });
		const limitMeta = new Tag('meta', { content: attrs.limit != null ? String(attrs.limit) : '' });
		const layoutMeta = new Tag('meta', { content: attrs.layout || 'list' });

		// Placeholder for post list — pipeline postProcess will inject actual posts
		const postList = new Tag('div', {}, []);

		const sectionProps = pageSectionProperties(header);
		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];

		const children: any[] = [
			folderMeta,
			sortMeta,
			filterMeta,
			limitMeta,
			layoutMeta,
			...headerContent,
			postList,
		];

		return createComponentRenderable({ rune: 'blog', schemaOrgType: 'Blog',
			tag: 'section',
			property: 'contentSection',
			properties: {
				folder: folderMeta,
				sort: sortMeta,
				filter: filterMeta,
				limit: limitMeta,
				layout: layoutMeta,
			},
			refs: {
				...sectionProps,
				posts: postList,
			},
			children,
		});
	},
});
