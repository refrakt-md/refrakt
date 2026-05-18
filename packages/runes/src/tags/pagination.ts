import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';

/** Sentinel meta property written by pagination auto mode; consumed by corePipelineHooks.postProcess */
export const PAGINATION_AUTO_SENTINEL = '__pagination-auto';

export const pagination = createContentModelSchema({
	attributes: {
		auto: { type: Boolean, required: false, default: false, description: 'Derive prev/next from sibling page order' },
		prev: { type: String, required: false, description: 'Explicit previous page (slug or URL)' },
		next: { type: String, required: false, description: 'Explicit next page (slug or URL)' },
		scope: { type: String, required: false, matches: ['siblings', 'section'], default: 'siblings', description: 'Auto-mode scope: direct siblings, or all pages in the current top-level section' },
		'prev-label': { type: String, required: false, description: 'Override label for the previous link' },
		'next-label': { type: String, required: false, description: 'Override label for the next link' },
	},
	contentModel: { type: 'sequence', fields: [] },
	selfClosing: true,
	transform(_resolved, attrs, _config) {
		if (attrs.auto) {
			const sentinelMeta = new Tag('meta', { 'data-field': PAGINATION_AUTO_SENTINEL, content: 'true' });
			const scopeMeta = attrs.scope
				? new Tag('meta', { 'data-field': 'scope', content: String(attrs.scope) })
				: null;
			const prevLabelMeta = attrs['prev-label']
				? new Tag('meta', { 'data-field': 'prev-label', content: String(attrs['prev-label']) })
				: null;
			const nextLabelMeta = attrs['next-label']
				? new Tag('meta', { 'data-field': 'next-label', content: String(attrs['next-label']) })
				: null;
			const metas = [sentinelMeta, scopeMeta, prevLabelMeta, nextLabelMeta].filter(Boolean) as any[];
			return createComponentRenderable({
				rune: 'pagination',
				tag: 'nav',
				children: metas,
			});
		}

		const links: any[] = [];

		if (attrs.prev) {
			const isUrl = String(attrs.prev).startsWith('/') || /^[a-z]+:\/\//i.test(String(attrs.prev));
			const href = isUrl ? String(attrs.prev) : `__slug:${attrs.prev}`;
			const label = (attrs['prev-label'] as string | undefined) ?? String(attrs.prev);
			links.push(
				new Tag('a', { href, 'data-direction': 'prev', 'data-name': 'prev' }, [
					new Tag('span', { 'data-name': 'marker' }, ['←']),
					new Tag('span', { 'data-name': 'label' }, [label]),
				]),
			);
		}

		if (attrs.next) {
			const isUrl = String(attrs.next).startsWith('/') || /^[a-z]+:\/\//i.test(String(attrs.next));
			const href = isUrl ? String(attrs.next) : `__slug:${attrs.next}`;
			const label = (attrs['next-label'] as string | undefined) ?? String(attrs.next);
			links.push(
				new Tag('a', { href, 'data-direction': 'next', 'data-name': 'next' }, [
					new Tag('span', { 'data-name': 'label' }, [label]),
					new Tag('span', { 'data-name': 'marker' }, ['→']),
				]),
			);
		}

		return createComponentRenderable({
			rune: 'pagination',
			tag: 'nav',
			children: links,
		});
	},
});
