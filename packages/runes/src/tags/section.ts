import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

const alignType = ['start', 'center', 'end'] as const;

/**
 * A generic page section: the shared section header (eyebrow → headline → blurb
 * → image) followed by an arbitrary body. Unlike `feature`/`reveal`/`tabs`, the
 * body is content-agnostic — anything (a `bento`, a grid of cards, prose) — so a
 * preamble-less grid primitive can be introduced with a title and intro.
 */
export const section = createContentModelSchema({
	attributes: {
		align: { type: String, required: false, matches: alignType.slice(), description: 'Header alignment: start (default), center, or end' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'eyebrow', match: 'paragraph', optional: true },
			{ name: 'headline', match: 'heading', optional: true },
			{ name: 'blurb', match: 'paragraph', optional: true },
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const headerAstNodes = [resolved.eyebrow, resolved.headline, resolved.blurb].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		const align = (attrs.align as string) || 'start';
		const alignMeta = new Tag('meta', { content: align });

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const children = [alignMeta, ...headerContent, body.next()];

		return createComponentRenderable({ rune: 'section',
			tag: 'section',
			property: 'contentSection',
			properties: {
				align: alignMeta,
			},
			refs: {
				...pageSectionProperties(header),
				body,
			},
			children,
		});
	},
});
