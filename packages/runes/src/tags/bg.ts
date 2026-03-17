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
		preset: { type: String, required: false, description: 'Named background preset from the theme' },
		src: { type: String, required: false, description: 'URL of the background image' },
		video: { type: String, required: false, description: 'URL of a background video' },
		overlay: { type: String, required: false, description: 'Color overlay applied on top of the background' },
		blur: { type: String, required: false, matches: ['none', 'sm', 'md', 'lg'], description: 'Blur intensity applied to the background' },
		position: { type: String, required: false, description: 'CSS background-position value' },
		fit: { type: String, required: false, matches: ['cover', 'contain'], description: 'How the background image fills its container' },
		opacity: { type: String, required: false, description: 'Opacity of the background layer (0 to 1)' },
		fixed: { type: Boolean, required: false, description: 'Fix the background so it stays in place while scrolling' },
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
