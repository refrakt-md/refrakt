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
import {
	SplitLayoutModel,
	buildLayoutMetas,
	splitMediaBodyFooter,
	extractMediaImage,
	stretchedLink,
} from './common.js';

export const cardSections = { media: 'media', eyebrow: 'eyebrow', body: 'body' } as const;

export const card = createContentModelSchema({
	sections: cardSections,
	provides: ['prose'],
	base: SplitLayoutModel,
	attributes: {
		href: {
			type: String,
			required: false,
			default: '',
			description: 'Optional link target; makes the whole card clickable.',
		},
		'content-place': {
			type: String,
			required: false,
			description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"',
		},
		height: {
			type: String,
			required: false,
			matches: ['sm', 'md', 'lg', 'xl'],
			description: 'Intrinsic card height (named scale) for cover / bg-only cards',
		},
		aspect: {
			type: String,
			required: false,
			description: 'Intrinsic card aspect ratio (e.g. "16/9", "3/4") for cover / bg-only cards',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const {
			media: mediaNodes,
			body: bodyNodes,
			footer: footerNodes,
		} = splitMediaBodyFooter(asNodes(resolved.body));

		const { metas: layoutMetas, children: layoutChildren } = buildLayoutMetas(attrs);

		const contentPlace = attrs['content-place'] as string | undefined;
		const height = attrs.height as string | undefined;
		const aspect = attrs.aspect as string | undefined;
		const contentPlaceMeta = contentPlace ? new Tag('meta', { content: contentPlace }) : undefined;
		const heightMeta = height ? new Tag('meta', { content: height }) : undefined;
		const aspectMeta = aspect ? new Tag('meta', { content: aspect }) : undefined;

		const children: RenderableTreeNode[] = layoutChildren.filter(
			(c) => c !== layoutMetas.mediaPosition,
		);

		if (mediaNodes.length > 0) {
			const mediaCursor = new RenderableNodeCursor(
				Markdoc.transform(mediaNodes, config) as RenderableTreeNode[],
			);
			const img = extractMediaImage(mediaCursor);
			const inner = img ? [img] : mediaCursor.toArray();
			children.push(
				new Tag(
					'div',
					{ 'data-section': 'media', 'data-name': 'media' },
					inner as RenderableTreeNode[],
				),
			);
		}

		let eyebrowNode: Node | undefined;
		let mainBodyNodes = bodyNodes;
		if (
			bodyNodes.length >= 2 &&
			bodyNodes[0].type === 'paragraph' &&
			bodyNodes[1].type === 'heading'
		) {
			eyebrowNode = bodyNodes[0];
			mainBodyNodes = bodyNodes.slice(1);
		}

		let eyebrowTag: InstanceType<typeof Tag> | undefined;
		if (eyebrowNode) {
			const eyebrowCursor = new RenderableNodeCursor(
				Markdoc.transform([eyebrowNode], config) as RenderableTreeNode[],
			);
			const first = eyebrowCursor.toArray()[0];
			if (Markdoc.Tag.isTag(first)) {
				eyebrowTag = first;
			}
		}
		const bodyCursor = new RenderableNodeCursor(
			Markdoc.transform(mainBodyNodes, config) as RenderableTreeNode[],
		);
		const bodyRendered = bodyCursor.toArray() as RenderableTreeNode[];
		const titleTag = bodyRendered.find(
			(n): n is InstanceType<typeof Tag> => Markdoc.Tag.isTag(n) && /^h[1-6]$/.test(n.name),
		);
		const bodyDiv = new Tag('div', { 'data-name': 'body' }, bodyRendered);

		let footerTag: InstanceType<typeof Tag> | undefined;
		if (footerNodes.length > 0) {
			const footerCursor = new RenderableNodeCursor(
				Markdoc.transform(footerNodes, config) as RenderableTreeNode[],
			);
			footerTag = new Tag(
				'footer',
				{ 'data-name': 'footer' },
				footerCursor.toArray() as RenderableTreeNode[],
			);
		}

		if (eyebrowTag) children.push(eyebrowTag);
		children.push(bodyDiv);
		if (footerTag) children.push(footerTag);

		let linkTag: InstanceType<typeof Tag> | undefined;
		const href = String(attrs.href ?? '');
		if (href) {
			linkTag = stretchedLink(href);
			children.push(linkTag);
		}

		const refs: Record<string, InstanceType<typeof Tag>> = { body: bodyDiv };
		if (titleTag) refs.title = titleTag;
		if (eyebrowTag) refs.eyebrow = eyebrowTag;
		if (footerTag) refs.footer = footerTag;
		if (linkTag) refs.link = linkTag;

		return createComponentRenderable({
			rune: 'card',
			tag: 'div',
			properties: {
				'media-position': layoutMetas.mediaPosition,
				'content-place': contentPlaceMeta,
				height: heightMeta,
				aspect: aspectMeta,
			},
			refs,
			children,
		});
	},
});
