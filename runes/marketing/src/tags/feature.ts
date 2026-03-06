import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag, Ast } = Markdoc;
import { attribute, group, Model, createComponentRenderable, createSchema, NodeStream, RenderableNodeCursor, SplitLayoutModel, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

export class DefinitionModel extends Model {
  @group({ include: [{ node: 'paragraph', descendant: 'image' }, { node: 'paragraph', descendantTag: 'icon' }, { node: 'paragraph', descendant: 'strong' }, 'heading'] })
  term: NodeStream;

  @group({ include: ['paragraph'] })
  description: NodeStream;

  transform() {
    const dt = this.term
      .useNode('paragraph', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        if (img) return Markdoc.transform(img, this.config);
        const iconTag = Array.from(node.walk()).find(n => n.type === 'tag' && n.tag === 'icon');
        if (iconTag) {
          const strong = Array.from(node.walk()).find(n => n.type === 'strong');
          const iconResult = Markdoc.transform(iconTag, this.config);
          if (strong) return [iconResult, new Tag('span', {}, strong.transformChildren(this.config))];
          return iconResult;
        }
        const strong = Array.from(node.walk()).find(n => n.type === 'strong');
        if (strong) return new Tag('span', {}, strong.transformChildren(this.config));
        return Markdoc.transform(node, this.config);
      })
      .useNode('heading', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        const text = Array.from(node.walk()).filter(n => n.type === 'text');
        const span = new Tag('span', {}, Markdoc.transform(text, this.config));

        return img ? [ Markdoc.transform(img, this.config), span ] : span;
      })
      .transform()
      .wrap('dt');

    const dd = this.description
      .useNode('paragraph', 'dd')
      .transform();

    return createComponentRenderable(schema.FeatureDefinition, {
      tag: 'div',
      properties: {
        image: dt.flatten().tag('svg'),
        name: dt.flatten().tag('span'),
        description: dd.tag('dd'),
      },
      children: dt.concat(dd).toArray(),
    });
  }
}

export const definition = createSchema(DefinitionModel);

const justifyType = ['left', 'center', 'right'] as const;

class FeatureModel extends SplitLayoutModel {
  @attribute({ type: String, required: false, matches: justifyType.slice() })
  justify: typeof justifyType[number] = 'center';

  @group({ section: 0, include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ section: 0, include: ['list'] })
  definitions: NodeStream;

  @group({ section: 1 })
  media: NodeStream;

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const definitions = this.definitions
      .useNode('item', (node, config) => {
        return Markdoc.transform(new Ast.Node('tag', {}, node.children, 'definition'), config);
      })
      .useNode('list', (node, config) => {
        return new Tag('dl', this.layout !== 'stacked' ? {} : { 'data-layout': 'grid', 'data-columns': node.children.length }, node.transformChildren(config));
      })
      .transform();

    const side = this.media.transform();

    const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
    const mainContent = new RenderableNodeCursor([...headerContent, ...definitions.toArray()]).wrap('div');
    const mediaContent = side.wrap('div');

    const layoutMeta = new Tag('meta', { content: this.layout });
    const justifyMeta = new Tag('meta', { content: this.justify });
    const ratioMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.ratio }) : undefined;
    const alignMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.align }) : undefined;
    const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
    const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

    const children = [
      layoutMeta,
      justifyMeta,
      ...(ratioMeta ? [ratioMeta] : []),
      ...(alignMeta ? [alignMeta] : []),
      ...(gapMeta ? [gapMeta] : []),
      ...(collapseMeta ? [collapseMeta] : []),
      mainContent.next(),
      ...(side.toArray().length > 0 ? [mediaContent.next()] : []),
    ];

    return createComponentRenderable(schema.Feature, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(header),
        featureItem: definitions.flatten().tag('div'),
        layout: layoutMeta,
        justify: justifyMeta,
        ratio: ratioMeta,
        align: alignMeta,
        gap: gapMeta,
        collapse: collapseMeta,
      },
      refs: {
        content: mainContent,
        media: mediaContent,
      },
      children,
    });
  }
}

export const feature = createSchema(FeatureModel, {
  split: {
    newName: 'layout',
    transform: (val, attrs) => val ? (attrs.mirror ? 'split-reverse' : 'split') : undefined,
  },
  mirror: { newName: '_consumed' },
  align: { newName: 'justify' },
});
