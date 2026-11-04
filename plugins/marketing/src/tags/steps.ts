import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Ast, Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	SplitLayoutModel,
	buildLayoutMetas,
	nameHelper as name,
	pageSectionProperties,
	asNodes,
	renderNodes,
	unwrapParagraphImages,
} from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';

export const stepMediaSlots = { media: 'cover' } as const;

export const step = createContentModelSchema({
	mediaSlots: stepMediaSlots,
	base: SplitLayoutModel,
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'media',
				type: 'sequence',
				fields: [{ name: 'content', match: 'any', optional: true, greedy: true }],
			},
			{
				name: 'content',
				primary: true,
				type: 'sequence',
				fields: [{ name: 'content', match: 'any', optional: true, greedy: true }],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		const main = renderNodes(contentZone.content, config);
		const side = new RenderableNodeCursor(
			unwrapParagraphImages(
				Markdoc.transform(asNodes(mediaZone.content), config) as RenderableTreeNode[],
			),
		);

		const mainContent = main.wrap('div');
		const sideContent = side.wrap('div');

		const { metas: layoutMetas } = buildLayoutMetas({
			...attrs,
			'media-position': attrs['media-position'] ?? 'bottom',
		});
		const {
			mediaPosition: mediaPositionMeta,
			mediaRatio: mediaRatioMeta,
			valign: valignMeta,
			collapse: collapseMeta,
		} = layoutMetas;

		const children = [
			mainContent.next(),
			...(side.toArray().length > 0 ? [sideContent.next()] : []),
		];

		return createComponentRenderable({
			rune: 'step',
			tag: 'li',
			properties: {
				name: name(main),
				'media-position': mediaPositionMeta,
				'media-ratio': mediaRatioMeta,
				valign: valignMeta,
				collapse: collapseMeta,
			},
			refs: {
				content: mainContent.tag('div'),
				media: sideContent.tag('div'),
			},
			children,
		});
	},
});

export const stepsSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
} as const;

export const steps = createContentModelSchema({
	sections: stepsSections,
	attributes: {},
	contentModel: () => ({
		when: [
			{
				condition: { hasChild: 'heading' },
				model: {
					type: 'sections' as const,
					sectionHeading: 'heading',
					fields: [{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true }],
					sectionModel: {
						type: 'sequence' as const,
						fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
					},
				},
			},
		],
		default: {
			type: 'sequence' as const,
			fields: [
				{ name: 'header', match: 'paragraph', optional: true, greedy: true },
				{ name: 'list', match: 'list:ordered', optional: true },
			],
		},
	}),
	transform(resolved, attrs, config) {
		const headerNodes = renderNodes(resolved.header, config);

		let stepItems: RenderableNodeCursor<any>;

		if (resolved.sections) {
			const sections = resolved.sections as Array<{
				$headingNode: Node;
				body: unknown;
			}>;
			const stepTagNodes = sections.map(
				(section) =>
					new Ast.Node('tag', {}, [section.$headingNode, ...asNodes(section.body)], 'step'),
			);
			const stepStream = new RenderableNodeCursor(
				Markdoc.transform(stepTagNodes, config) as RenderableTreeNode[],
			);
			stepItems = stepStream.tag('li').typeof('Step');
		} else {
			const listNode = asNodes(resolved.list)[0] as Node | undefined;
			const itemNodes = listNode?.children ?? [];
			const stepTagNodes = itemNodes.map((item) => new Ast.Node('tag', {}, item.children, 'step'));
			const stepStream = new RenderableNodeCursor(
				Markdoc.transform(stepTagNodes, config) as RenderableTreeNode[],
			);
			stepItems = stepStream.tag('li').typeof('Step');
		}

		const stepList = new Tag('ol', {}, stepItems.toArray());

		const children = headerNodes.count() > 0 ? [...headerNodes.toArray(), stepList] : [stepList];

		return createComponentRenderable({
			rune: 'steps',
			tag: 'section',
			properties: {
				step: stepItems,
			},
			refs: {
				...pageSectionProperties(headerNodes),
				steps: stepList,
			},
			children,
		});
	},
});
