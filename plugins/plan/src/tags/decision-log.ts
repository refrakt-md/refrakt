import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';

export const DECISION_LOG_SENTINEL = '__decision-log-sentinel';

export const decisionLog = createContentModelSchema({
	attributes: {
		filter: { type: String, required: false, default: '', description: 'Filter: space-separated field:value pairs (e.g., "status:accepted").' },
		sort: { type: String, required: false, default: 'date', description: 'Sort field: date (reverse chronological) or id.' },
	},
	selfClosing: true,
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const filterMeta = new Tag('meta', { content: attrs.filter ?? '' });
		const sortMeta = new Tag('meta', { content: attrs.sort ?? 'date' });
		const sentinelMeta = new Tag('meta', { 'data-field': DECISION_LOG_SENTINEL, content: 'true' });

		// Placeholder list — replaced by postProcess
		const placeholder = new Tag('div', {}, []);

		return createComponentRenderable({ rune: 'decision-log',
			tag: 'section',
			properties: {
				filter: filterMeta,
				sort: sortMeta,
			},
			refs: {
				items: placeholder,
			},
			children: [filterMeta, sortMeta, sentinelMeta, placeholder],
		});
	},
});
