import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag, Ast } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	SplitLayoutModel,
	buildLayoutMetas,
	pageSectionProperties,
	unwrapParagraphImages,
	LAYOUT,
	layoutMatches,
} from '@refrakt-md/runes';

function isTermParagraph(node: Node): boolean {
	for (const child of node.walk()) {
		if (child.type === 'image') return true;
		if (child.type === 'tag' && child.tag === 'icon') return true;
		if (child.type === 'strong') return true;
	}
	return false;
}

function splitDefinitionChildren(nodes: unknown[]): unknown[] {
	return nodes as Node[];
}

export const definition = createContentModelSchema({
	contentModel: {
		type: 'custom',
		processChildren: splitDefinitionChildren,
		description:
			'Splits children into term (headings + paragraphs with image/icon/strong) and description (remaining paragraphs).',
	},
	transform(resolved, attrs, config) {
		const labelIcon = (node: any) => {
			if (Tag.isTag(node)) node.attributes['data-name'] = 'icon';
			return node;
		};

		const allChildren = asNodes(resolved.children);
		const termNodes: Node[] = [];
		const descNodes: Node[] = [];
		let inDescription = false;

		for (const node of allChildren) {
			if (
				!inDescription &&
				(node.type === 'heading' || (node.type === 'paragraph' && isTermParagraph(node)))
			) {
				termNodes.push(node);
			} else if (node.type === 'paragraph') {
				inDescription = true;
				descNodes.push(node);
			} else if (!inDescription) {
				inDescription = true;
			}
		}

		const dtChildren: any[] = [];
		for (const node of termNodes) {
			if (node.type === 'paragraph') {
				const img = Array.from(node.walk()).find((n) => n.type === 'image');
				if (img) {
					dtChildren.push(labelIcon(Markdoc.transform(img, config)));
					continue;
				}
				const iconTag = Array.from(node.walk()).find((n) => n.type === 'tag' && n.tag === 'icon');
				if (iconTag) {
					const strong = Array.from(node.walk()).find((n) => n.type === 'strong');
					const iconResult = labelIcon(Markdoc.transform(iconTag, config));
					if (strong) {
						dtChildren.push(
							iconResult,
							new Tag('span', { 'data-name': 'title' }, strong.transformChildren(config)),
						);
						continue;
					}
					dtChildren.push(iconResult);
					continue;
				}
				const strong = Array.from(node.walk()).find((n) => n.type === 'strong');
				if (strong) {
					dtChildren.push(
						new Tag('span', { 'data-name': 'title' }, strong.transformChildren(config)),
					);
					continue;
				}
				dtChildren.push(Markdoc.transform(node, config));
				continue;
			}
			if (node.type === 'heading') {
				const img = Array.from(node.walk()).find((n) => n.type === 'image');
				const text = Array.from(node.walk()).filter((n) => n.type === 'text');
				const span = new Tag('span', { 'data-name': 'title' }, Markdoc.transform(text, config));
				if (img) {
					dtChildren.push(labelIcon(Markdoc.transform(img, config)), span);
					continue;
				}
				dtChildren.push(span);
				continue;
			}
		}
		const dt = new RenderableNodeCursor(dtChildren).wrap('dt');

		const ddChildren: any[] = [];
		for (const node of descNodes) {
			ddChildren.push(
				new Tag('dd', { 'data-name': 'description' }, node.transformChildren(config)),
			);
		}
		const dd = new RenderableNodeCursor(ddChildren);

		return new Tag('div', {}, dt.concat(dd).toArray());
	},
});

const alignType = ['left', 'center', 'right'] as const;

export const featureSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
	media: 'media',
} as const;
export const featureMediaSlots = { media: 'cover' } as const;

export const feature = createContentModelSchema({
	sections: featureSections,
	mediaSlots: featureMediaSlots,
	base: SplitLayoutModel,
	attributes: {
		align: {
			type: String,
			required: false,
			matches: alignType.slice(),
			description: 'Horizontal alignment of headline and body text',
		},
		layout: {
			type: String,
			required: false,
			matches: layoutMatches([LAYOUT.grid, LAYOUT.list, LAYOUT.carousel]),
			description:
				'Arrangement of feature-items: grid (tiled), list (single column), or carousel (scroll-snap track). Defaults from media-position when unset.',
		},
		'collapse-to': {
			type: String,
			required: false,
			matches: ['stack', 'carousel'],
			description:
				'Collapsed (mobile) form below the `collapse` breakpoint: stack (default) or carousel (a scroll-snap row).',
		},
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'media',
				type: 'sequence',
				fields: [{ name: 'media', match: 'any', optional: true, greedy: true }],
			},
			{
				name: 'content',
				primary: true,
				type: 'sequence',
				fields: [
					{ name: 'eyebrow', match: 'paragraph', optional: true },
					{ name: 'headline', match: 'heading', optional: true },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{
						name: 'definitions',
						match: 'list',
						optional: true,
						greedy: true,
						template: '- **Title**\n\n  Description',
					},
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		const headerAstNodes = [contentZone.eyebrow, contentZone.headline, contentZone.blurb].filter(
			Boolean,
		) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		const defConfig = {
			...config,
			nodes: {
				...config.nodes,
				item: {
					transform(node: Node, innerConfig: Record<string, any>) {
						return Markdoc.transform(
							new Ast.Node('tag', {}, node.children, 'definition'),
							innerConfig,
						);
					},
				},
				list: {
					transform(node: Node, innerConfig: Record<string, any>) {
						return new Tag(
							'dl',
							{ 'data-columns': node.children.length },
							node.transformChildren(innerConfig),
						);
					},
				},
			},
		};
		const definitions = renderNodes(contentZone.definitions, defConfig);

		const side = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(mediaZone.media), config) as RenderableTreeNode[],
			),
		);

		const align = (attrs.align as string) || 'center';
		const alignMeta = new Tag('meta', { content: align });
		const resolvedMediaPosition = (attrs['media-position'] as string) ?? 'bottom';
		const { metas: layoutMetas } = buildLayoutMetas({
			...attrs,
			'media-position': resolvedMediaPosition,
		});
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		const stackedMedia = resolvedMediaPosition === 'top' || resolvedMediaPosition === 'bottom';
		const effectiveLayout = (attrs.layout as string) ?? (stackedMedia ? LAYOUT.grid : LAYOUT.list);
		const layoutMeta = new Tag('meta', { content: effectiveLayout });

		const collapseTo = (attrs['collapse-to'] as string) ?? 'stack';
		const collapseToMeta =
			collapseTo !== 'stack' ? new Tag('meta', { content: collapseTo }) : undefined;

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([...headerContent, ...definitions.toArray()]).wrap(
			'div',
		);
		const mediaContent = side.wrap('div');

		const children = [
			mainContent.next(),
			...(side.toArray().length > 0 ? [mediaContent.next()] : []),
		];

		return createComponentRenderable({
			rune: 'feature',
			tag: 'section',
			properties: {
				'media-position': mediaPositionMeta,
				layout: layoutMeta,
				'collapse-to': collapseToMeta,
				align: alignMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
			},
			refs: {
				...pageSectionProperties(header),
				'feature-item': definitions.flatten().tag('div'),
				content: mainContent,
				media: mediaContent,
			},
			children,
		});
	},
	deprecations: {
		justify: { newName: 'align' },
	},
});
