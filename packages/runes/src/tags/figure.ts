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

export const figureSections = { caption: 'description' } as const;
export const figureFrameTarget = 'self' as const;

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
				...(imgs.length > 0 ? { image: imgs[0] } : {}),
			},
			children: childNodes,
		});
	},
});
