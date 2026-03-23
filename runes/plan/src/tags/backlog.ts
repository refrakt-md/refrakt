import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const BACKLOG_SENTINEL = '__backlog-sentinel';

export const backlog = createContentModelSchema({
	attributes: {
		filter: { type: String, required: false, default: '', description: 'Filter: space-separated field:value pairs (e.g., "status:ready priority:high").' },
		sort: { type: String, required: false, default: 'priority', description: 'Sort field: priority, status, id, assignee, complexity, milestone.' },
		group: { type: String, required: false, default: '', description: 'Group by field: status, priority, assignee, milestone, type, tags.' },
		show: { type: String, required: false, default: 'all', description: 'Entity types: all, work, bug.' },
	},
	selfClosing: true,
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const filterMeta = new Tag('meta', { content: attrs.filter ?? '' });
		const sortMeta = new Tag('meta', { content: attrs.sort ?? 'priority' });
		const groupMeta = new Tag('meta', { content: attrs.group ?? '' });
		const showMeta = new Tag('meta', { content: attrs.show ?? 'all' });
		const sentinelMeta = new Tag('meta', { 'data-field': BACKLOG_SENTINEL, content: 'true' });

		// Placeholder list — replaced by postProcess
		const placeholder = new Tag('div', {}, []);

		return createComponentRenderable(schema.Backlog, {
			tag: 'section',
			properties: {
				filter: filterMeta,
				sort: sortMeta,
				group: groupMeta,
				show: showMeta,
			},
			refs: {
				items: placeholder,
			},
			children: [filterMeta, sortMeta, groupMeta, showMeta, sentinelMeta, placeholder],
		});
	},
});
