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
		gradient: { type: String, required: false, matches: ['to-t', 'to-b', 'to-l', 'to-r', 'to-tr', 'to-br', 'to-bl', 'to-tl'], description: 'Gradient direction (token-driven fill)' },
		from: { type: String, required: false, description: 'Gradient start colour — semantic token name' },
		to: { type: String, required: false, description: 'Gradient end colour — semantic token name' },
		via: { type: String, required: false, description: 'Optional middle gradient stop — semantic token name' },
		'gradient-type': { type: String, required: false, matches: ['linear', 'radial', 'conic'], description: 'Gradient type: linear (default), radial, conic' },
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
		// SPEC-088 — gradient facets (directive form: `gradient`/`from`/`to`/`via`/
		// `gradient-type` → the `bg-*` metas the engine resolves).
		if (attrs.gradient) metas.push(new Tag('meta', { 'data-field': 'bg-gradient', content: attrs.gradient }));
		if (attrs.from) metas.push(new Tag('meta', { 'data-field': 'bg-from', content: attrs.from }));
		if (attrs.to) metas.push(new Tag('meta', { 'data-field': 'bg-to', content: attrs.to }));
		if (attrs.via) metas.push(new Tag('meta', { 'data-field': 'bg-via', content: attrs.via }));
		if (attrs['gradient-type']) metas.push(new Tag('meta', { 'data-field': 'bg-gradient-type', content: attrs['gradient-type'] }));
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
