import Markdoc from '@markdoc/markdoc';
import type { ValidationError } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';

export const error = createContentModelSchema({
	attributes: {
		type: { type: String },
		tag: { type: String },
		lines: { type: Array },
		error: { type: Object },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const err = attrs.error as ValidationError;
		const code = new Tag('td', {}, [err.id]);
		const tag = new Tag('td', {}, [attrs.tag as string]);
		const level = new Tag('td', {}, [err.level]);
		const message = new Tag('td', {}, [err.message]);

		return createComponentRenderable({ rune: 'error',
			tag: 'tr',
			property: 'error',
			properties: {
				code,
				tag,
				level,
				message
			},
			children: [tag, code, level, message],
		});
	},
});
