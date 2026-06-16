import Markdoc from '@markdoc/markdoc';
import type { Node, Schema, RenderableTreeNodes, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;

/** Element/rune names that carry player chrome or captions — they are *subject*
 *  media, never a bare backdrop (SPEC-104 §3). A bg guest must be presentational. */
const CHROMED_GUESTS = new Set(['video', 'audio', 'figure']);

/** Recursively find the first rune/element guest in a transformed body, skipping
 *  Markdoc's structural wrappers (`article`/`div`/`p` with no `data-rune`). */
function findGuest(nodes: RenderableTreeNode[]): InstanceType<typeof Tag> | undefined {
	for (const node of nodes) {
		if (!Markdoc.Tag.isTag(node)) continue;
		const rune = node.attributes?.['data-rune'];
		if (node.name === 'rf-sandbox' || rune) return node;
		if (CHROMED_GUESTS.has(node.name)) return node;
		const nested = findGuest(node.children as RenderableTreeNode[]);
		if (nested) return nested;
	}
	return undefined;
}

/** Identify a guest's rune name for the guardrail (sandbox is the only allowed
 *  backdrop; chromed runes are redirected). */
function guestName(guest: InstanceType<typeof Tag>): string {
	if (guest.name === 'rf-sandbox') return 'sandbox';
	return String(guest.attributes?.['data-rune'] ?? guest.name);
}

/**
 * Background directive rune schema.
 *
 * Like tint, the bg rune produces no visible output — it emits meta tags
 * that the parent rune's identity transform reads to inject a background
 * layer with images, video, overlays, and blur effects.
 *
 * SPEC-104 — `bg` may also carry an **optional body** holding a single bare
 * guest (a `sandbox`): a live, full-bleed backdrop. The body is transformed
 * normally (so the real sandbox rune runs, with file resolution + sanitisation),
 * the rendered guest is tagged `data-bg-guest` + forced to `height="fill"` and
 * the `backdrop` posture, and emitted alongside the `bg-*` metas. The engine
 * (§1f) relocates that guest into the bg layer. A chromed guest
 * (`video`/`audio`/`figure`) is rejected with a build warning — it is subject
 * media, not a backdrop.
 */
export const bg: Schema = {
	attributes: {
		preset: { type: String, required: false, description: 'Named background preset from the theme' },
		src: { type: String, required: false, description: 'URL of the background image' },
		video: { type: String, required: false, description: 'URL of a background video' },
		overlay: { type: String, required: false, description: 'Flat wash over the background: none | dark | light | a token name (raw CSS is deprecated)' },
		'overlay-opacity': { type: String, required: false, description: 'Opacity of a token-coloured overlay wash (0 to 1)' },
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
		if (attrs['overlay-opacity']) {
			metas.push(new Tag('meta', { 'data-field': 'bg-overlay-opacity', content: attrs['overlay-opacity'] }));
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

		// SPEC-104 — optional body holding one bare guest (a `sandbox`). Transform
		// it normally (the real sandbox rune runs, with file resolution +
		// sanitisation), then tag + posture the rendered guest. The engine relocates
		// any `data-bg-guest` element into the bg layer.
		const guestNodes: RenderableTreeNode[] = [];
		if (node.children?.length) {
			const rendered = node.children.map(child => Markdoc.transform(child, config));
			const flat = rendered.flat().filter(Boolean) as RenderableTreeNode[];
			const guest = findGuest(flat);
			if (guest) {
				const name = guestName(guest);
				if (name !== 'sandbox') {
					// Bare-surface guardrail (§3): chromed runes are subject media.
					console.warn(
						`[refrakt] bg backdrop guest must be presentational (a sandbox); "${name}" carries content chrome — ` +
						`place it in the media zone as a positioned guest, or use \`bg video="…"\` for a bare video backdrop.`,
					);
				} else {
					guest.attributes = {
						...guest.attributes,
						'data-bg-guest': '',
						'data-guest-posture': 'backdrop',
						// SPEC-101 host-owned height + forced eager activation (the
						// backdrop boots without a gesture); the behaviour reads the
						// backdrop posture for reduced-motion / off-screen handling.
						'data-height': 'fill',
						'data-activation': 'eager',
					};
					guestNodes.push(guest);
				}
			}
		}

		// Return a wrapper tag that createSchema() will unwrap
		return new Tag('div', { 'data-bg-source': true }, [...metas, ...guestNodes]);
	},
};
