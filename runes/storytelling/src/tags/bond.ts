import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const bond = createContentModelSchema({
	attributes: {
		from: { type: String, required: true },
		to: { type: String, required: true },
		type: { type: String, required: false },
		status: { type: String, required: false },
		bidirectional: { type: Boolean, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const fromTag = new Tag('span', {}, [attrs.from ?? '']);
		const toTag = new Tag('span', {}, [attrs.to ?? '']);
		const connector = new Tag('div', { 'data-name': 'connector' }, [
			new Tag('span', { 'data-name': 'arrow' }),
		]);
		const bondTypeMeta = new Tag('meta', { content: attrs.type ?? '' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'active' });
		const bidirectionalMeta = new Tag('meta', { content: String(attrs.bidirectional ?? true) });
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		return createComponentRenderable(schema.Bond, {
			tag: 'div',
			properties: {
				from: fromTag,
				to: toTag,
				bondType: bondTypeMeta,
				status: statusMeta,
				bidirectional: bidirectionalMeta,
			},
			refs: {
				connector,
				body: body.tag('div'),
			},
			children: [fromTag, connector, toTag, bondTypeMeta, statusMeta, bidirectionalMeta, body.next()],
		});
	},
});
