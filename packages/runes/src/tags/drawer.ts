/**
 * Drawer rune (SPEC-060).
 *
 * Body-only modal panel: declares an addressable region by id and renders
 * its body as a visible in-flow `<section>` at the authored position. With
 * JS (WORK-258 behaviors), the section is enhanced into a `<dialog>` and
 * xref clicks open it via `showModal()`. Without JS, the body is visible
 * inline and xref clicks scroll to it via fragment navigation.
 *
 * Triggers are not part of this rune — any `{% ref "drawer-id" /%}` on
 * the same page resolves to `<a href="#drawer-{id}" data-target-type="drawer">`
 * (via SPEC-065's `data-target-type` propagation, WORK-253). The
 * progressive-enhancement layer queries that marker.
 *
 * Title heading level: `headingLevel="3"` etc. sets the level explicitly.
 * Without an explicit level, the schema emits a sentinel `data-drawer-title-auto`
 * marker; the corePipelineHooks.postProcess walk replaces it with an
 * `h{n}` element one level deeper than the nearest preceding heading on
 * the page (clamped to 1-6, default h2 when no preceding heading exists).
 */

import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** Marker attribute placed on the title heading when `headingLevel` is omitted.
 *  The core postProcess walk replaces the tag with `h{n}` based on outline depth. */
export const DRAWER_TITLE_AUTO_MARKER = 'data-drawer-title-auto';

const drawerSides = ['right', 'left', 'top', 'bottom'] as const;
const drawerSizes = ['sm', 'md', 'lg'] as const;

export const drawer = createContentModelSchema({
	attributes: {
		id: {
			type: String,
			required: true,
			description: 'Stable id for the drawer. Used in entity registration and as the `id="drawer-{value}"` on the rendered element so xref triggers can target it via fragment.',
		},
		title: {
			type: String,
			required: false,
			description: 'Panel heading text. Rendered in the drawer header (or as a heading in the no-JS in-flow rendering).',
		},
		headingLevel: {
			type: Number,
			required: false,
			description: 'Heading level (1-6) for the title. When omitted, the level is auto-detected from outline position (one deeper than the nearest preceding heading). Out-of-range values are clamped to the 1-6 range.',
		},
		shortcut: {
			type: String,
			required: false,
			description: 'Keyboard shortcut that opens the drawer when behaviors are loaded (e.g. ".", "cmd+k"). Surfaces as `data-shortcut`; the progressive-enhancement layer wires the listener.',
		},
		side: {
			type: String,
			required: false,
			matches: drawerSides.slice(),
			description: 'Edge the panel slides from when enhanced. Defaults to "right".',
		},
		size: {
			type: String,
			required: false,
			matches: drawerSizes.slice(),
			description: 'Panel size. "sm" / "md" (default) / "lg" — width for left/right sides, height for top/bottom.',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const drawerId = attrs.id;
		const titleText = attrs.title;
		const side = attrs.side ?? 'right';
		const size = attrs.size ?? 'md';

		// Title heading: explicit level → `h{n}`, otherwise emit a sentinel
		// `h3` placeholder marked with `data-drawer-title-auto`. The core
		// postProcess walk inspects outline depth and rewrites the tag name.
		// We pick `h3` as the sentinel because it's the no-postProcess
		// fallback (most drawers live under an h2 page section).
		const clampedLevel = typeof attrs.headingLevel === 'number'
			? Math.min(6, Math.max(1, Math.trunc(attrs.headingLevel)))
			: undefined;
		const titleTag = titleText
			? (clampedLevel
				? new Tag(`h${clampedLevel}`, {}, [titleText])
				: new Tag('h3', { [DRAWER_TITLE_AUTO_MARKER]: 'true' }, [titleText]))
			: undefined;

		const closeButton = new Tag('button', {
			type: 'button',
			'aria-label': 'Close',
			hidden: true,
		}, ['×']);

		const headerChildren: RenderableTreeNode[] = [];
		if (titleTag) headerChildren.push(titleTag);
		headerChildren.push(closeButton);
		const header = new Tag('header', {}, headerChildren);

		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		).wrap('div');

		// Property meta tags drive engine modifier-from-meta + data-attribute
		// derivation. We always emit `side` and `size` so the engine applies
		// the BEM modifier even when the author didn't specify them (the
		// default "right"/"md" still need their data-attribute on the wrapper).
		// `shortcut` is only emitted when set — its absence shouldn't appear
		// as `data-shortcut=""` on the wrapper.
		const properties: Record<string, Markdoc.Tag> = {
			side: new Tag('meta', { content: side }),
			size: new Tag('meta', { content: size }),
		};
		if (attrs.shortcut) {
			properties.shortcut = new Tag('meta', { content: attrs.shortcut });
		}

		const renderable = createComponentRenderable({
			rune: 'drawer',
			tag: 'section',
			id: `drawer-${drawerId}`,
			properties,
			refs: {
				header,
				...(titleTag ? { title: titleTag } : {}),
				close: closeButton,
				body: body.tag('div'),
			},
			children: [...Object.values(properties), header, body.next()],
		});

		// `data-drawer-id` carries the author-supplied id (before the
		// `drawer-` prefix) for register-hook consumption. The register
		// scan reads this to know what id the entity should have without
		// re-parsing the html id.
		(renderable.attributes as Record<string, unknown>)['data-drawer-id'] = drawerId;

		return renderable;
	},
});
