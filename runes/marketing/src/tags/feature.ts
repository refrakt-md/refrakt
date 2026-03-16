import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Tag, Ast } = Markdoc;
import { attribute, group, Model, createContentModelSchema, createComponentRenderable, createSchema, asNodes, NodeStream, RenderableNodeCursor, SplitLayoutModel, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

export class DefinitionModel extends Model {
  @group({ include: [{ node: 'paragraph', descendant: 'image' }, { node: 'paragraph', descendantTag: 'icon' }, { node: 'paragraph', descendant: 'strong' }, 'heading'] })
  term: NodeStream;

  @group({ include: ['paragraph'] })
  description: NodeStream;

  transform() {
    const labelIcon = (node: any) => { if (Tag.isTag(node)) node.attributes['data-name'] = 'icon'; return node; };

    const dt = this.term
      .useNode('paragraph', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        if (img) return labelIcon(Markdoc.transform(img, this.config));
        const iconTag = Array.from(node.walk()).find(n => n.type === 'tag' && n.tag === 'icon');
        if (iconTag) {
          const strong = Array.from(node.walk()).find(n => n.type === 'strong');
          const iconResult = labelIcon(Markdoc.transform(iconTag, this.config));
          if (strong) return [iconResult, new Tag('span', { 'data-name': 'title' }, strong.transformChildren(this.config))];
          return iconResult;
        }
        const strong = Array.from(node.walk()).find(n => n.type === 'strong');
        if (strong) return new Tag('span', { 'data-name': 'title' }, strong.transformChildren(this.config));
        return Markdoc.transform(node, this.config);
      })
      .useNode('heading', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        const text = Array.from(node.walk()).filter(n => n.type === 'text');
        const span = new Tag('span', { 'data-name': 'title' }, Markdoc.transform(text, this.config));
        if (img) return [labelIcon(Markdoc.transform(img, this.config)), span];
        return span;
      })
      .transform()
      .wrap('dt');

    const dd = this.description
      .useNode('paragraph', node => new Tag('dd', { 'data-name': 'description' }, node.transformChildren(this.config)))
      .transform();

    return new Tag('div', {}, dt.concat(dd).toArray());
  }
}

export const definition = createSchema(DefinitionModel);

const alignType = ['left', 'center', 'right'] as const;

export const feature = createContentModelSchema({
	base: SplitLayoutModel,
	attributes: {
		align: { type: String, required: false, matches: alignType.slice() },
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
					{ name: 'headline', match: 'heading', optional: true },
					{ name: 'blurb', match: 'paragraph', optional: true },
					{ name: 'definitions', match: 'list', optional: true, greedy: true, template: '- **Title**\n\n  Description' },
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

		const headerAstNodes = [
			contentZone.eyebrow,
			contentZone.headline,
			contentZone.blurb,
		].filter(Boolean) as Node[];
		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);

		// Transform definitions with custom node overrides
		const defConfig = {
			...config,
			nodes: {
				...config.nodes,
				item: {
					transform(node: Node, innerConfig: Record<string, any>) {
						return Markdoc.transform(new Ast.Node('tag', {}, node.children, 'definition'), innerConfig);
					},
				},
				list: {
					transform(node: Node, innerConfig: Record<string, any>) {
						const layout = (attrs.layout as string) || 'stacked';
						return new Tag('dl', layout !== 'stacked' ? {} : { 'data-layout': 'grid', 'data-columns': node.children.length }, node.transformChildren(innerConfig));
					},
				},
			},
		};
		const definitions = new RenderableNodeCursor(
			Markdoc.transform(asNodes(contentZone.definitions), defConfig) as RenderableTreeNode[],
		);

		const side = new RenderableNodeCursor(
			Markdoc.transform(asNodes(mediaZone.media), config) as RenderableTreeNode[],
		);

		const align = (attrs.align as string) || 'center';
		const layout = (attrs.layout as string) || 'stacked';
		const ratio = (attrs.ratio as string) || '1 1';
		const valign = (attrs.valign as string) || 'top';
		const gap = (attrs.gap as string) || 'default';
		const collapse = attrs.collapse as string | undefined;

		const layoutMeta = new Tag('meta', { content: layout });
		const alignMeta = new Tag('meta', { content: align });
		const ratioMeta = layout !== 'stacked' ? new Tag('meta', { content: ratio }) : undefined;
		const valignMeta = layout !== 'stacked' ? new Tag('meta', { content: valign }) : undefined;
		const gapMeta = gap !== 'default' ? new Tag('meta', { content: gap }) : undefined;
		const collapseMeta = collapse ? new Tag('meta', { content: collapse }) : undefined;

		const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
		const mainContent = new RenderableNodeCursor([...headerContent, ...definitions.toArray()]).wrap('div');
		const mediaContent = side.wrap('div');

		const children = [
			layoutMeta,
			alignMeta,
			...(ratioMeta ? [ratioMeta] : []),
			...(valignMeta ? [valignMeta] : []),
			...(gapMeta ? [gapMeta] : []),
			...(collapseMeta ? [collapseMeta] : []),
			mainContent.next(),
			...(side.toArray().length > 0 ? [mediaContent.next()] : []),
		];

		return createComponentRenderable(schema.Feature, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				layout: layoutMeta,
				align: alignMeta,
				ratio: ratioMeta,
				valign: valignMeta,
				gap: gapMeta,
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
		split: {
			newName: 'layout',
			transform: (val: any, attrs: Record<string, any>) => val ? (attrs.mirror ? 'split-reverse' : 'split') : undefined,
		},
		mirror: { newName: '_consumed' },
		justify: { newName: 'align' },
	},
});
