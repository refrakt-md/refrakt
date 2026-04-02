import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import type { HeadingInfo } from '../util.js';

export const toc = createContentModelSchema({
	attributes: {
		depth: { type: Number, required: false, default: 3, description: 'Maximum heading depth to include' },
		ordered: { type: Boolean, required: false, default: false, description: 'Use numbered list instead of bullets' },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs, config) {
		const headings: HeadingInfo[] = config.variables?.headings || [];

		// Filter to h2..h{depth+1}
		const maxLevel = (attrs.depth as number) + 1;
		const filtered = headings.filter(h => h.level >= 2 && h.level <= maxLevel);

		const items = filtered.map(h =>
			new Tag('li', { 'data-level': h.level }, [
				new Tag('a', { href: `#${h.id}` }, [h.text]),
			])
		);

		const list = new Tag('ul', {}, items);
		const depthMeta = new Tag('meta', { content: attrs.depth });
		const orderedMeta = new Tag('meta', { content: attrs.ordered });

		return createComponentRenderable({ rune: 'table-of-contents',
			tag: 'nav',
			properties: {
				depth: depthMeta,
				ordered: orderedMeta,
			},
			refs: {
				list,
			},
			children: [depthMeta, orderedMeta, list],
		});
	},
});
