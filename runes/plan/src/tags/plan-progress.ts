import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const PLAN_PROGRESS_SENTINEL = '__plan-progress-sentinel';

export const planProgress = createContentModelSchema({
	attributes: {
		show: { type: String, required: false, default: 'all', description: 'Entity types to include: all, work, bug, spec, decision.' },
	},
	selfClosing: true,
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const showMeta = new Tag('meta', { content: attrs.show ?? 'all' });
		const sentinelMeta = new Tag('meta', { 'data-field': PLAN_PROGRESS_SENTINEL, content: 'true' });
		const placeholder = new Tag('div', {}, []);

		return createComponentRenderable(schema.PlanProgress, {
			tag: 'section',
			properties: {
				show: showMeta,
			},
			refs: {
				items: placeholder,
			},
			children: [showMeta, sentinelMeta, placeholder],
		});
	},
});
