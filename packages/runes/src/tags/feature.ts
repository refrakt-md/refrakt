import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag, Ast } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model } from '../lib/index.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { SplitablePageSectionModel, pageSectionProperties } from './common.js';

export class DefinitionModel extends Model {
  @group({ include: [{ node: 'paragraph', descendant: 'image' }, { node: 'paragraph', descendant: 'strong' }, 'heading'] })
  term: NodeStream;

  @group({ include: ['paragraph'] })
  description: NodeStream;

  transform() {
    const dt = this.term
      .useNode('paragraph', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        if (img) return Markdoc.transform(img, this.config);
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

class FeatureModel extends SplitablePageSectionModel {
  @attribute({ type: Boolean, required: false })
  split: boolean = false;

  @attribute({ type: Boolean, required: false })
  mirror: boolean = false;

  @group({ section: 0, include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ section: 0, include: ['list'] })
  definitions: NodeStream;

  @group({ section: 1 })
  showcase: NodeStream;

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const definitions = this.definitions
      .useNode('item', (node, config) => {
        return Markdoc.transform(new Ast.Node('tag', {}, node.children, 'definition'), config);
      })
      .useNode('list', (node, config) => {
        return new Tag('dl', this.split ? {} : { 'data-layout': 'grid', 'data-columns': node.children.length }, node.transformChildren(config));
      })
      .transform();

    const side = this.showcase.transform();

    const headerContent = header.count() > 0 ? [header.wrap('header').next()] : [];
    const mainContent = new RenderableNodeCursor([...headerContent, ...definitions.toArray()]).wrap('div');
    const showcaseContent = side.wrap('div');

    const splitMeta = this.split ? new Tag('meta', { content: 'split' }) : undefined;
    const mirrorMeta = this.mirror ? new Tag('meta', { content: 'mirror' }) : undefined;

    const children = [
      ...(splitMeta ? [splitMeta] : []),
      ...(mirrorMeta ? [mirrorMeta] : []),
      mainContent.next(),
      ...(side.toArray().length > 0 ? [showcaseContent.next()] : []),
    ];

    return createComponentRenderable(schema.Feature, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(header),
        featureItem: definitions.flatten().tag('div'),
        split: splitMeta,
        mirror: mirrorMeta,
      },
      refs: {
        body: mainContent,
        showcase: showcaseContent,
      },
      children,
    });
  }
}

export const feature = createSchema(FeatureModel);
