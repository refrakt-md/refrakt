import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const methodType = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

class ApiModel extends Model {
	@attribute({ type: String, required: false, matches: methodType.slice() })
	method: typeof methodType[number] = 'GET';

	@attribute({ type: String, required: true })
	path: string;

	@attribute({ type: String, required: false })
	auth: string = '';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const methodMeta = new Tag('meta', { content: this.method });
		const pathMeta = new Tag('meta', { content: this.path });
		const authMeta = new Tag('meta', { content: this.auth });

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
	}
}

export const api = createSchema(ApiModel);
