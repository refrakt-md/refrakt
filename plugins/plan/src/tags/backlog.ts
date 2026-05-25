import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';

export const BACKLOG_SENTINEL = '__backlog-sentinel';

export const backlog = createContentModelSchema({
	attributes: {
		filter: { type: String, required: false, default: '', description: 'Filter: space-separated field:value pairs (e.g., "status:ready priority:high").' },
		sort: { type: String, required: false, default: 'priority', description: 'Sort field: priority, status, id, assignee, complexity, milestone.' },
		group: { type: String, required: false, default: '', description: 'Group by field: status, priority, assignee, milestone, type, tags.' },
		show: { type: String, required: false, default: 'all', description: 'Entity types: all, work, bug, spec, decision, milestone.' },
		limit: { type: Number, required: false, description: 'Cap the number of entities rendered. Applied after sort, before group — useful for "top N" dashboards and for keeping docs examples scannable. Unset (default) renders the full filtered set.' },
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
		const limitMeta = attrs.limit !== undefined
			? new Tag('meta', { content: String(attrs.limit) })
			: undefined;
		const sentinelMeta = new Tag('meta', { 'data-field': BACKLOG_SENTINEL, content: 'true' });

		// Placeholder list — replaced by postProcess
		const placeholder = new Tag('div', {}, []);

		const properties: Record<string, Markdoc.Tag> = {
			filter: filterMeta,
			sort: sortMeta,
			group: groupMeta,
			show: showMeta,
		};
		if (limitMeta) properties.limit = limitMeta;

		const children: Markdoc.Tag[] = [filterMeta, sortMeta, groupMeta, showMeta];
		if (limitMeta) children.push(limitMeta);
		children.push(sentinelMeta, placeholder);

		return createComponentRenderable({ rune: 'backlog',
			tag: 'section',
			properties,
			refs: {
				items: placeholder,
			},
			children,
		});
	},
});
