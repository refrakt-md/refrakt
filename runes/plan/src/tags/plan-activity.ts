import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const PLAN_ACTIVITY_SENTINEL = '__plan-activity-sentinel';

export const planActivity = createContentModelSchema({
	attributes: {
		limit: { type: Number, required: false, default: 10, description: 'Maximum number of recent items to show.' },
	},
	selfClosing: true,
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const limitMeta = new Tag('meta', { content: String(attrs.limit ?? 10) });
		const sentinelMeta = new Tag('meta', { 'data-field': PLAN_ACTIVITY_SENTINEL, content: 'true' });
		const placeholder = new Tag('div', {}, []);

		return createComponentRenderable(schema.PlanActivity, {
			tag: 'section',
			properties: {
				limit: limitMeta,
			},
			refs: {
				items: placeholder,
			},
			children: [limitMeta, sentinelMeta, placeholder],
		});
	},
});
