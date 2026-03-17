import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, RenderableNodeCursor, SplitLayoutModel, linkItem, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

export const hero = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		align: { type: String, required: false, matches: ['left', 'center', 'right'], description: 'Horizontal alignment of headline and body text' },
	},
	contentModel: {
		type: 'delimited',
		delimiter: 'hr',
		zones: [
			{
				name: 'content',
				type: 'sequence',
				fields: [
					{ name: 'eyebrow', match: 'paragraph', optional: true },
					{ name: 'headline', match: 'heading', optional: false },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{ name: 'actions', match: 'list|fence', optional: true, greedy: true },
				],
			},
			{
				name: 'media',
				type: 'sequence',
				fields: [
					{ name: 'media', match: 'any', optional: true, greedy: true },
				],
			},
		],
	},
	transform(resolved, attrs, config) {
		const contentZone = (resolved.content ?? {}) as ResolvedContent;
		const mediaZone = (resolved.media ?? {}) as ResolvedContent;

		// Collect header AST nodes (eyebrow, headline, blurb) and transform
		const headerAstNodes = [
			contentZone.eyebrow,
			contentZone.headline,
			contentZone.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Collect action AST nodes (list and/or fences) and transform with custom handlers
		const actionAstNodes = (
			Array.isArray(contentZone.actions) ? contentZone.actions : contentZone.actions ? [contentZone.actions] : []
		) as Node[];
		// Use the original config inside the fence handler to avoid recursion
		// (same pattern as NodeStream.useNode — the inner transform uses the
		// base config, not the config with custom overrides)
		const baseConfig = config;
		const actionConfig = {
			...config,
			nodes: {
				...config.nodes,
				item: linkItem,
				fence: {
					transform(node: Node) {
						const output = new RenderableNodeCursor(
							[Markdoc.transform(node, baseConfig)] as RenderableTreeNode[],
						);
						return new Tag('div', {}, [output.next()]);
					},
				},
			},
		};
		const actions = new RenderableNodeCursor(
			Markdoc.transform(actionAstNodes, actionConfig) as RenderableTreeNode[],
		);

		// Transform media AST nodes
		const mediaAstNodes = (
			Array.isArray(mediaZone.media) ? mediaZone.media : []
		) as Node[];
		const side = new RenderableNodeCursor(
			Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
		);

		// Layout attribute defaults
		const align = (attrs.align as string) || 'center';
		const layout = (attrs.layout as string) || 'stacked';
		const ratio = (attrs.ratio as string) || '1 1';
		const valign = (attrs.valign as string) || 'top';
		const gap = (attrs.gap as string) || 'default';
		const collapse = attrs.collapse as string | undefined;

		// Create meta tags for identity transform
		const alignMeta = new Tag('meta', { content: align });
		const layoutMeta = new Tag('meta', { content: layout });
		const ratioMeta = layout !== 'stacked' ? new Tag('meta', { content: ratio }) : undefined;
		const valignMeta = layout !== 'stacked' ? new Tag('meta', { content: valign }) : undefined;
		const gapMeta = gap !== 'default' ? new Tag('meta', { content: gap }) : undefined;
		const collapseMeta = collapse ? new Tag('meta', { content: collapse }) : undefined;

		// Structural wrapping
		const actionsDiv = actions.wrap('div');
		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([
			...headerContent,
			...(actions.count() > 0 ? [actionsDiv.next()] : []),
		]).wrap('div');
		const mediaDiv = side.wrap('div');

		return createComponentRenderable(schema.Hero, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				align: alignMeta,
				layout: layoutMeta,
				ratio: ratioMeta,
				valign: valignMeta,
				gap: gapMeta,
				collapse: collapseMeta,
			},
			refs: {
				...pageSectionProperties(header),
				actions: actionsDiv,
				content: mainContent,
				media: mediaDiv,
				action: actions.flatten().tags('li'),
				command: actions.flatten().tags('div'),
			},
			children: [
				alignMeta,
				layoutMeta,
				...(ratioMeta ? [ratioMeta] : []),
				...(valignMeta ? [valignMeta] : []),
				...(gapMeta ? [gapMeta] : []),
				...(collapseMeta ? [collapseMeta] : []),
				mainContent.next(),
				...(side.toArray().length > 0 ? [mediaDiv.next()] : []),
			],
		});
	},
	deprecations: { justify: { newName: 'align' } },
});
