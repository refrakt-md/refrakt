import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';
import { isMediaNode } from './common.js';

const sizeValues = ['small', 'medium', 'large', 'full'] as const;
const alignValues = ['left', 'center', 'right'] as const;

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const figureSections = { caption: 'description' } as const;
export const figureFrameTarget = 'self' as const;

// SPEC-130 / WORK-568 — Group B. Both sources are refs, so the applier stamps
// them where they already are: the `<img>` yields its `src` and the
// `<figcaption>` its text. The image is the node WORK-561 gave a name to —
// before that, the schema reached it only as an anonymous `imgs[0]`, and a
// reordering of the transform would have silently repointed `contentUrl`.
//
// BUG-028 — a figure is a general captioned container, so `ImageObject` holds
// only while the media slot is the figure's whole body. The transform records
// `body: 'mixed'` when anything else is there; that row asserts nothing. No
// type at all, rather than a more general one: the figure's caption describes
// the image *and* the code beside it, and `ImageObject` with that caption is a
// wrong claim, while the alternatives (`CreativeWork`, `SoftwareSourceCode`)
// would describe a code block nobody marked up as a work. The properties go with
// the type: stamping `caption` with no `typeof` here would hand it to whatever
// typed ancestor the page has.
export const figureSchema = {
	byField: 'body',
	rows: { mixed: {} },
	fallback: {
		type: 'ImageObject',
		properties: { image: 'contentUrl', caption: 'caption' },
	},
} as const;

export const figure = createContentModelSchema({
	schema: figureSchema,
	sections: figureSections,
	frameTarget: figureFrameTarget,
	attributes: {
		size: {
			type: String,
			required: false,
			matches: sizeValues.slice(),
			description: 'Display width of the figure',
		},
		align: {
			type: String,
			required: false,
			matches: alignValues.slice(),
			description: 'Horizontal alignment of the figure',
		},
		caption: {
			type: String,
			required: false,
			description: 'Caption text displayed below the figure',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config).toArray();

		// BUG-028 — every body child is kept, in body order. Media — an <img>, a
		// <video>, or a scheme-resolved <svg> (SPEC-106) — standing on its own,
		// or in a paragraph holding nothing else, is the figure's media slot and
		// is emitted unwrapped, as it always was. Anything else is emitted as
		// written: before this, all of it was resolved and then dropped.
		const mediaOnly = (p: any): any[] | undefined => {
			if (!Markdoc.Tag.isTag(p) || p.name !== 'p') return undefined;
			const kids = p.children ?? [];
			const media = kids.filter((c: any) => isMediaNode(c));
			const rest = kids.filter(
				(c: any) => !isMediaNode(c) && !(typeof c === 'string' && c.trim() === ''),
			);
			return media.length > 0 && rest.length === 0 ? media : undefined;
		};
		const holdsMedia = (n: any): boolean =>
			isMediaNode(n) || (Markdoc.Tag.isTag(n) && (n.children ?? []).some(holdsMedia));

		// Caption fallback: the first paragraph with no media in it.
		const captionContent = attrs.caption || undefined;
		const captionParagraph = captionContent
			? undefined
			: children.find((n: any) => Markdoc.Tag.isTag(n) && n.name === 'p' && !holdsMedia(n));
		const captionTag = captionContent
			? new Tag('figcaption', {}, [captionContent])
			: captionParagraph
				? new Tag('figcaption', {}, [captionParagraph])
				: undefined;

		const imgs: InstanceType<typeof Tag>[] = [];
		const body: any[] = [];
		let mixed = false;
		for (const node of children) {
			if (node === captionParagraph) continue;
			if (isMediaNode(node)) {
				imgs.push(node as InstanceType<typeof Tag>);
				body.push(node);
				continue;
			}
			const media = mediaOnly(node);
			if (media) {
				imgs.push(...media);
				body.push(...media);
				continue;
			}
			if (typeof node === 'string' && node.trim() === '') continue;
			body.push(node);
			mixed = true;
		}

		const sizeMeta = attrs.size ? new Tag('meta', { content: attrs.size }) : undefined;
		const alignMeta = attrs.align ? new Tag('meta', { content: attrs.align }) : undefined;
		// A content fact, not a type: the schema table decides what it means.
		const bodyMeta = mixed ? new Tag('meta', { content: 'mixed' }) : undefined;
		const childNodes: any[] = [...body];
		if (bodyMeta) childNodes.push(bodyMeta);
		if (captionTag) childNodes.push(captionTag);

		return createComponentRenderable({
			rune: 'figure',
			tag: 'figure',
			properties: {
				size: sizeMeta,
				align: alignMeta,
				body: bodyMeta,
			},
			refs: {
				caption: captionTag,
				// WORK-561 — the image survives and is rendered, so under WORK-560's
				// rule it is a ref, not a property. It had no name at all: the schema
				// reached it only as an anonymous positional `imgs[0]`.
				...(imgs.length > 0 ? { image: imgs[0] } : {}),
			},
			children: childNodes,
		});
	},
});
