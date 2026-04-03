import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';

const methodType = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export const api = createContentModelSchema({
	attributes: {
		method: { type: String, required: false, matches: methodType.slice(), description: 'HTTP method for the endpoint (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS).' },
		path: { type: String, required: true, description: 'URL path for the API endpoint (e.g. "/users/:id").' },
		auth: { type: String, required: false, description: 'Authentication scheme required for this endpoint (e.g. "Bearer", "API Key").' },
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

		return createComponentRenderable({ rune: 'api',
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
