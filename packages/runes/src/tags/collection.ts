import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import { readDeferredBody } from '../deferred-body.js';

export const COLLECTION_SENTINEL = '__collection-sentinel';

/**
 * `collection` (SPEC-070) — queries the entity registry for many entities and
 * projects them into a layout. Emits a sentinel that the postProcess resolver
 * (`resolveCollections`) fills with real entity data. The body, when present,
 * is a per-entity template captured via the deferBody mechanism (WORK-262).
 */
export const collection = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, default: '', description: 'Entity type(s), comma-separated.' },
		filter: { type: String, required: false, default: '', description: 'field:value clauses (SPEC-070 grammar).' },
		sort: { type: String, required: false, default: '', description: 'Sort field (prefix - for descending).' },
		group: { type: String, required: false, default: '', description: 'Group-by field.' },
		limit: { type: String, required: false, default: '', description: 'Max items.' },
		show: { type: String, required: false, default: '', description: 'Alias for type (entity types to include).' },
		fields: { type: String, required: false, default: '', description: 'Comma-separated data fields to project.' },
		layout: { type: String, required: false, default: 'list', description: 'Arrangement: list (stacked) | grid (multi-column) | table (aligned columns). Item chrome comes from the item — the no-body built-in, or a rune like {% card %} in the body template.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? '';

		const metas = [
			meta('collection-type', String(attrs.type ?? attrs.show ?? '')),
			meta('collection-filter', String(attrs.filter ?? '')),
			meta('collection-sort', String(attrs.sort ?? '')),
			meta('collection-group', String(attrs.group ?? '')),
			meta('collection-limit', String(attrs.limit ?? '')),
			meta('collection-fields', String(attrs.fields ?? '')),
			meta('collection-layout', String(attrs.layout ?? 'list')),
			meta(COLLECTION_SENTINEL, 'true'),
		];
		if (bodySource) metas.push(meta('collection-body', bodySource));

		const placeholder = new Tag('div', { 'data-name': 'items' }, []);

		return createComponentRenderable({
			rune: 'collection',
			tag: 'section',
			properties: {},
			refs: { items: placeholder },
			children: [...metas, placeholder],
		});
	},
});
