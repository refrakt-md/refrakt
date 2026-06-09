import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const shadowValues = ['none', 'soft', 'hard', 'elevated'] as const;
const bleedValues = ['none', 'top', 'bottom', 'both', 'end', 'bottom-end', 'top-end'] as const;

/** SPEC-086 — showcase collapses into the frame model (`frameTarget: 'self'`).
 *  Its bespoke attributes are deprecated aliases for `frame-*` facets; map them
 *  and warn once, retaining breakout (`bleed` → `frame-displace` on a breakout
 *  host) as showcase's distinct value. */
const SHADOW_TO_FRAME: Record<string, string> = { soft: 'sm', hard: 'md', elevated: 'lg' };
const SHOWCASE_DEPRECATED_WARNED = new Set<string>();
function warnShowcaseDeprecated(attr: string, replacement: string): void {
	if (SHOWCASE_DEPRECATED_WARNED.has(attr)) return;
	SHOWCASE_DEPRECATED_WARNED.add(attr);
	// eslint-disable-next-line no-console
	console.warn(`[refrakt] showcase \`${attr}\` is deprecated (SPEC-086) — use \`${replacement}\`. The alias will be removed in a future minor.`);
}

export const showcase = createContentModelSchema({
	attributes: {
		shadow: { type: String, required: false, matches: shadowValues.slice(), description: 'Shadow style around the showcase content' },
		bleed: { type: String, required: false, matches: bleedValues.slice(), description: 'Direction content extends beyond its container' },
		offset: { type: String, required: false, description: 'CSS offset from the container edge' },
		aspect: { type: String, required: false, description: 'Aspect ratio of the showcase area' },
		place: { type: String, required: false, matches: [
			'left', 'center', 'right', 'top', 'bottom',
			'top left', 'top center', 'top right',
			'bottom left', 'bottom center', 'bottom right',
		], description: 'Position of content within the showcase area' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const shadow = attrs.shadow ?? 'none';
		const bleed = attrs.bleed ?? 'none';
		const offset = attrs.offset ?? '';
		const aspect = attrs.aspect ?? '';
		const place = attrs.place ?? '';

		const properties: Record<string, any> = {};
		const childNodes: any[] = [];
		// Emit a frame facet meta the engine routes to the showcase root
		// (frameTarget: 'self'). Routed through `properties` so it rides both the
		// SPEC-082 field bag and the meta channel the engine reads.
		const frameMeta = (field: string, value: string) => {
			const meta = new Tag('meta', { content: value });
			properties[field] = meta;
			childNodes.push(meta);
		};

		if (shadow && shadow !== 'none') {
			warnShowcaseDeprecated('shadow', 'frame-shadow');
			frameMeta('frame-shadow', SHADOW_TO_FRAME[shadow] ?? shadow);
		}
		if (bleed && bleed !== 'none') {
			warnShowcaseDeprecated('bleed', 'frame-displace');
			frameMeta('frame-displace', bleed);
		}
		if (offset) {
			warnShowcaseDeprecated('offset', 'frame-offset');
			frameMeta('frame-offset', offset);
		}
		if (aspect) {
			warnShowcaseDeprecated('aspect', 'frame-aspect');
			frameMeta('frame-aspect', aspect);
		}
		if (place) {
			warnShowcaseDeprecated('place', 'frame-place');
			frameMeta('frame-place', place);
		}

		const viewport = new Tag('div', {}, children.toArray());

		childNodes.push(viewport);

		return createComponentRenderable({ rune: 'showcase',
			tag: 'div',
			properties,
			refs: {
				viewport,
			},
			children: childNodes,
		});
	},
});
