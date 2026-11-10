import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	asNodes,
} from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const DRAWER_TITLE_AUTO_MARKER = 'data-drawer-title-auto';

const drawerSides = ['right', 'left', 'top', 'bottom'] as const;
const drawerSizes = ['sm', 'md', 'lg'] as const;

function splitDrawerBodyZones(nodes: Node[]): { body: Node[]; footer: Node[] | null } {
	const hrIndex = nodes.findIndex((n) => n.type === 'hr');
	if (hrIndex < 0) return { body: nodes, footer: null };
	return {
		body: nodes.slice(0, hrIndex),
		footer: nodes.slice(hrIndex + 1),
	};
}

export const drawerSections = { header: 'header', body: 'body', footer: 'footer' } as const;

export const drawer = createContentModelSchema({
	sections: drawerSections,
	provides: ['prose'],
	attributes: {
		id: {
			type: String,
			required: true,
			description:
				'Stable id for the drawer. Used in entity registration and as the `id="drawer-{value}"` on the rendered element so xref triggers can target it via fragment.',
		},
		title: {
			type: String,
			required: false,
			description:
				'Panel heading text. Rendered in the drawer header (or as a heading in the no-JS in-flow rendering).',
		},
		headingLevel: {
			type: Number,
			required: false,
			description:
				'Heading level (1-6) for the title. When omitted, the level is auto-detected from outline position (one deeper than the nearest preceding heading). Out-of-range values are clamped to the 1-6 range.',
		},
		shortcut: {
			type: String,
			required: false,
			description:
				'Keyboard shortcut that opens the drawer when behaviors are loaded (e.g. ".", "cmd+k"). Surfaces as `data-shortcut`; the progressive-enhancement layer wires the listener.',
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
			description:
				'Panel size: "sm", "md" (default), or "lg" for as much of the screen as the gutter leaves. Width for left/right sides, height for top/bottom.',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const drawerId = attrs.id;
		const titleText = attrs.title;
		const side = attrs.side ?? 'right';
		const size = attrs.size ?? 'md';

		// Without a level, `h3` is a placeholder the postProcess walk sets from the outline.
		const clampedLevel =
			typeof attrs.headingLevel === 'number'
				? Math.min(6, Math.max(1, Math.trunc(attrs.headingLevel)))
				: undefined;
		const titleTag = titleText
			? clampedLevel
				? new Tag(`h${clampedLevel}`, {}, [titleText])
				: new Tag('h3', { [DRAWER_TITLE_AUTO_MARKER]: 'true' }, [titleText])
			: undefined;

		const closeButton = new Tag(
			'button',
			{
				type: 'button',
				'aria-label': 'Close',
				hidden: true,
			},
			['×'],
		);

		const headerChildren: RenderableTreeNode[] = [];
		if (titleTag) headerChildren.push(titleTag);
		headerChildren.push(closeButton);
		const header = new Tag('header', {}, headerChildren);

		const zones = splitDrawerBodyZones(asNodes(resolved.body));
		const body = new RenderableNodeCursor(
			Markdoc.transform(zones.body, config) as RenderableTreeNode[],
		).wrap('div');
		const footer =
			zones.footer !== null
				? new RenderableNodeCursor(
						Markdoc.transform(zones.footer, config) as RenderableTreeNode[],
					).wrap('footer')
				: null;

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
				title: titleTag,
				close: closeButton,
				body: body.tag('div'),
				...(footer ? { footer: footer.tag('footer') } : {}),
			},
			children: [header, body.next(), ...(footer ? [footer.next()] : [])],
		});

		(renderable.attributes as Record<string, unknown>)['data-drawer-id'] = drawerId;

		return renderable;
	},
});
