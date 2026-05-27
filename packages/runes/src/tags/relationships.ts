import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import { readDeferredBody } from '../deferred-body.js';

export const RELATIONSHIPS_SENTINEL = '__relationships-sentinel';

/**
 * `relationships` (SPEC-072) — render an entity's relationship edges, grouped
 * by kind. The plural-graph counterpart to `collection`: its source set is
 * `registry.getRelated(of)` rather than a type-query. Emits a sentinel filled
 * by the postProcess resolver (`resolveRelationships`). A body, when present,
 * is the per-edge template (deferBody) with `$item` (the related entity) and
 * `$kind` (the edge kind) bound.
 */
export const relationships = createContentModelSchema({
	attributes: {
		of: { type: String, required: false, default: '', description: 'Entity to describe — an id (e.g. `of=$item.id`) or a bound entity.' },
		kind: { type: String, required: false, default: '', description: 'Edge kinds to include, comma-separated (e.g. "blocks,blocked-by").' },
		type: { type: String, required: false, default: '', description: 'Restrict related entity types, comma-separated.' },
		group: { type: String, required: false, default: 'kind', description: 'Group-by: kind (default) | type | none.' },
		'group-display': { type: String, required: false, default: 'headings', matches: ['headings', 'accordion'], description: 'How groups are presented: headings (default) or accordion (collapsible native <details> panels, styled like the accordion rune, with a per-group count).' },
		sort: { type: String, required: false, default: '', description: 'Sort related entities by a field (prefix - for descending).' },
		limit: { type: String, required: false, default: '', description: 'Max edges.' },
		fields: { type: String, required: false, default: '', description: 'Comma-separated data fields to project in the no-body built-in.' },
		empty: { type: String, required: false, default: '', description: 'Fallback text shown when there are no edges (no-body form; body form uses a fallback zone). Absent → render nothing.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? '';

		// `of` accepts an id string or a bound entity object ({ id, … }).
		const ofRaw = attrs.of as unknown;
		const of = ofRaw && typeof ofRaw === 'object'
			? String((ofRaw as { id?: unknown }).id ?? '')
			: String(ofRaw ?? '');

		const metas = [
			meta('relationships-of', of),
			meta('relationships-kind', String(attrs.kind ?? '')),
			meta('relationships-type', String(attrs.type ?? '')),
			meta('relationships-group', String(attrs.group ?? 'kind')),
			meta('relationships-group-display', String(attrs['group-display'] ?? 'headings')),
			meta('relationships-sort', String(attrs.sort ?? '')),
			meta('relationships-limit', String(attrs.limit ?? '')),
			meta('relationships-fields', String(attrs.fields ?? '')),
			meta('relationships-empty', String(attrs.empty ?? '')),
			meta(RELATIONSHIPS_SENTINEL, 'true'),
		];
		if (bodySource) metas.push(meta('relationships-body', bodySource));

		const placeholder = new Tag('div', { 'data-name': 'items' }, []);

		return createComponentRenderable({
			rune: 'relationships',
			tag: 'section',
			properties: {},
			refs: { items: placeholder },
			children: [...metas, placeholder],
		});
	},
});
