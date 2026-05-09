import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';

export const PLAN_HISTORY_SENTINEL = '__plan-history-sentinel';

export const planHistory = createContentModelSchema({
	attributes: {
		id: { type: String, required: false, description: 'Entity ID for single-entity mode. Omit for global feed.' },
		limit: { type: Number, required: false, default: 20, description: 'Maximum number of events (per-entity) or commits (global) to show.' },
		type: { type: String, required: false, default: 'all', description: 'Entity type filter: work, bug, spec, decision, or comma-separated.' },
		since: { type: String, required: false, description: 'Time filter: "7d", "30d", or ISO date.' },
		group: { type: String, required: false, default: 'commit', description: 'Global mode grouping: commit or entity.' },
	},
	selfClosing: true,
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const idMeta = attrs.id ? new Tag('meta', { 'data-field': 'id', content: String(attrs.id) }) : null;
		const limitMeta = new Tag('meta', { 'data-field': 'limit', content: String(attrs.limit ?? 20) });
		const typeMeta = new Tag('meta', { 'data-field': 'type', content: String(attrs.type ?? 'all') });
		const sinceMeta = attrs.since ? new Tag('meta', { 'data-field': 'since', content: String(attrs.since) }) : null;
		const groupMeta = new Tag('meta', { 'data-field': 'group', content: String(attrs.group ?? 'commit') });
		const sentinelMeta = new Tag('meta', { 'data-field': PLAN_HISTORY_SENTINEL, content: 'true' });
		const placeholder = new Tag('div', {}, []);

		const children: any[] = [limitMeta, typeMeta, groupMeta, sentinelMeta, placeholder];
		if (idMeta) children.unshift(idMeta);
		if (sinceMeta) children.splice(-1, 0, sinceMeta);

		return createComponentRenderable({ rune: 'plan-history',
			tag: 'section',
			properties: {
				limit: limitMeta,
				...(idMeta ? { id: idMeta } : {}),
				type: typeMeta,
				group: groupMeta,
			},
			refs: {
				events: placeholder,
			},
			children,
		});
	},
});
