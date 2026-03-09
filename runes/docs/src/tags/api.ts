import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

const methodType = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export const api = createContentModelSchema({
	attributes: {
		method: { type: String, required: false, matches: methodType.slice() },
		path: { type: String, required: true },
		auth: { type: String, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const methodMeta = new Tag('meta', { content: attrs.method ?? 'GET' });
		const pathMeta = new Tag('meta', { content: attrs.path ?? '' });
		const authMeta = new Tag('meta', { content: attrs.auth ?? '' });

		const bodyDiv = children.wrap('div');

		return createComponentRenderable(schema.Api, {
			tag: 'article',
			properties: {
				method: methodMeta,
				path: pathMeta,
				auth: authMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [methodMeta, pathMeta, authMeta, bodyDiv.next()],
		});
	},
});
