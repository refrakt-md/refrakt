import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, renderNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { schemaHeaderRoles } from '../lib/header-roles.js';

const alignType = ['start', 'center', 'end'] as const;
const headerModes = ['auto', 'headline', 'none'] as const;
type HeaderMode = (typeof headerModes)[number];

/**
 * A generic page section: the shared section header (eyebrow → headline →
 * blurb) followed by an arbitrary body. Unlike `feature`/`reveal`/`tabs`, the
 * body is content-agnostic — anything (a `bento`, a grid of cards, prose) — so a
 * preamble-less grid primitive can be introduced with a title and intro.
 */
// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
// `body` is the region after the header (SPEC-160 D1, WORK-651). It went
// undeclared, so `reading` and `dropcap` did nothing on a section, silently.
export const sectionSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
	body: 'body',
} as const;

export interface SectionHeaderParts {
	eyebrow?: Node;
	headline?: Node;
	blurb?: Node;
	body: Node[];
}

/**
 * The header grammar, anchored to the headline — ADR-046.
 *
 * Eyebrow and blurb exist only relative to a headline: an eyebrow is a
 * paragraph directly before it, a blurb a paragraph directly after it. With no
 * leading heading there is no header, and all content is body.
 *
 * - `auto` reads all three;
 * - `headline` lifts only a leading heading, so the paragraph after it stays body;
 * - `none` reads no header at all.
 *
 * `nodes` are the section's children in source order. It is also the reader
 * compositions audit their slots against, so the check and the rendering
 * cannot disagree.
 */
export function sectionHeaderParts(
	nodes: readonly Node[],
	mode: HeaderMode = 'auto',
): SectionHeaderParts {
	const isH = (n: Node | undefined) => n?.type === 'heading';
	const isP = (n: Node | undefined) => n?.type === 'paragraph';
	const all = [...nodes];
	if (mode === 'none') return { body: all };
	if (mode === 'headline') {
		return isH(all[0]) ? { headline: all[0], body: all.slice(1) } : { body: all };
	}
	let i = 0;
	let eyebrow: Node | undefined;
	if (isP(all[0]) && isH(all[1])) eyebrow = all[i++];
	if (!isH(all[i])) return { body: all };
	const headline = all[i++];
	const blurb = isP(all[i]) ? all[i++] : undefined;
	return { eyebrow, headline, blurb, body: all.slice(i) };
}

export const section = createContentModelSchema({
	sections: sectionSections,
	provides: ['prose'],
	attributes: {
		align: {
			type: String,
			required: false,
			matches: alignType.slice(),
			description: 'Header alignment: start (default), center, or end',
		},
		header: {
			type: String,
			required: false,
			matches: headerModes.slice(),
			description:
				'Which header roles to read: auto (eyebrow, headline and blurb around a leading heading; the default), headline (only the heading), or none (all content is body)',
		},
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'eyebrow', match: 'paragraph', optional: true },
			{ name: 'headline', match: 'heading', optional: true },
			{ name: 'blurb', match: 'paragraph', optional: true },
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		// The sequence matches in source order, so its fields put back together
		// are the children as written. The grammar is then applied to them, rather
		// than taken from the sequence, which would read a paragraph with no
		// heading after it as an eyebrow (ADR-046).
		const written = [resolved.eyebrow, resolved.headline, resolved.blurb, resolved.body]
			.flat()
			.filter(Boolean) as Node[];
		const parts = sectionHeaderParts(written, (attrs.header as HeaderMode) || 'auto');

		const render = (node: Node | undefined) =>
			node
				? (new RenderableNodeCursor(
						Markdoc.transform([node], config) as RenderableTreeNode[],
					).toArray()[0] as InstanceType<typeof Tag> | undefined)
				: undefined;
		const eyebrow = render(parts.eyebrow);
		const headline = render(parts.headline);
		const blurb = render(parts.blurb);
		const headerNodes = [eyebrow, headline, blurb].filter(Boolean) as RenderableTreeNode[];
		const header = new RenderableNodeCursor(headerNodes);
		const body = renderNodes(parts.body, config).wrap('div');

		const align = (attrs.align as string) || 'start';
		const alignMeta = new Tag('meta', { content: align });

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const children = [...headerContent, body.next()];

		return createComponentRenderable({
			rune: 'section',
			tag: 'section',
			properties: {
				align: alignMeta,
			},
			refs: {
				eyebrow,
				headline,
				blurb,
				body,
			},
			children,
		});
	},
});

schemaHeaderRoles.set(section, (children, attrs) => {
	const parts = sectionHeaderParts(children, (attrs.header as HeaderMode) || 'auto');
	return (['eyebrow', 'headline', 'blurb'] as const)
		.filter((role) => parts[role])
		.map((role) => ({ role, node: parts[role] as Node }));
});
