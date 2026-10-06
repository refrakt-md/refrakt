import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
	fieldMetas,
} from '@refrakt-md/runes';

const methodType = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const apiSections = { body: 'body' } as const;

export const api = createContentModelSchema({
	sections: apiSections,
	attributes: {
		method: {
			type: String,
			required: false,
			matches: methodType.slice(),
			description: 'HTTP method for the endpoint (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS).',
		},
		path: {
			type: String,
			required: true,
			description: 'URL path for the API endpoint (e.g. "/users/:id").',
		},
		auth: {
			type: String,
			required: false,
			description: 'Authentication scheme required for this endpoint (e.g. "Bearer", "API Key").',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);

		const bodyDiv = children.wrap('div');

		return createComponentRenderable({
			rune: 'api',
			tag: 'article',
			properties: fieldMetas(attrs, config, {
				method: 'GET',
				path: '',
				auth: '',
			}),
			refs: {
				body: bodyDiv,
			},
			children: [bodyDiv.next()],
		});
	},
});
