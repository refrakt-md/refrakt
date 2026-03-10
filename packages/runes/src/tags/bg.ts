import Markdoc from '@markdoc/markdoc';
import type { Node, Schema, RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;

/**
 * Background directive rune schema.
 *
 * Like tint, the bg rune produces no visible output — it emits meta tags
 * that the parent rune's identity transform reads to inject a background
 * layer with images, video, overlays, and blur effects.
 */
export const bg: Schema = {
	attributes: {
		preset: { type: String, required: false },
		src: { type: String, required: false },
		video: { type: String, required: false },
		overlay: { type: String, required: false },
		blur: { type: String, required: false, matches: ['none', 'sm', 'md', 'lg'] },
		position: { type: String, required: false },
		fit: { type: String, required: false, matches: ['cover', 'contain'] },
		opacity: { type: String, required: false },
		fixed: { type: Boolean, required: false },
	},
	transform(node: Node, config): RenderableTreeNodes {
		const attrs = node.transformAttributes(config);
		const metas: any[] = [];

		if (attrs.preset) {
			metas.push(new Tag('meta', { 'data-field': 'bg-preset', content: attrs.preset }));
		}

		if (attrs.src) {
			metas.push(new Tag('meta', { 'data-field': 'bg-src', content: attrs.src }));
		}
		if (attrs.video) {
			metas.push(new Tag('meta', { 'data-field': 'bg-video', content: attrs.video }));
		}
		if (attrs.overlay && attrs.overlay !== 'none') {
			metas.push(new Tag('meta', { 'data-field': 'bg-overlay', content: attrs.overlay }));
		}
		if (attrs.blur && attrs.blur !== 'none') {
			metas.push(new Tag('meta', { 'data-field': 'bg-blur', content: attrs.blur }));
		}
		if (attrs.position && attrs.position !== 'center') {
			metas.push(new Tag('meta', { 'data-field': 'bg-position', content: attrs.position }));
		}
		if (attrs.fit && attrs.fit !== 'cover') {
			metas.push(new Tag('meta', { 'data-field': 'bg-fit', content: attrs.fit }));
		}
		if (attrs.opacity && attrs.opacity !== '1') {
			metas.push(new Tag('meta', { 'data-field': 'bg-opacity', content: attrs.opacity }));
		}
		if (attrs.fixed) {
			metas.push(new Tag('meta', { 'data-field': 'bg-fixed', content: 'true' }));
		}

		// Return a wrapper tag that createSchema() will unwrap
		return new Tag('div', { 'data-bg-source': true }, metas);
	},
};
