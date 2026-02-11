import Markdoc, { Tag, Ast, RenderableTreeNodes } from '@markdoc/markdoc';
import { splitLayout } from '../layouts/index.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { group, Model } from '../lib/index.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
import { SplitablePageSectionModel, pageSectionProperties } from './common.js';

export class DefinitionModel extends Model {
  @group({ include: [{ node: 'paragraph', descendant: 'image' }, 'heading'] })
  term: NodeStream;

  @group({ include: ['paragraph'] })
  description: NodeStream;

  transform() {
    const dt = this.term
      .useNode('paragraph', node => {
        const img = Array.from(node.walk()).find(n => n.type === 'image');
        return Markdoc.transform(img ? img : node, this.config);
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
        return new Tag('dl', this.split.length > 0 ? {} : { 'data-layout': 'grid', 'data-columns': 3 }, node.transformChildren(config));
      })
      .transform();

    const side = this.showcase.transform();

    return createComponentRenderable(schema.Feature, {
      tag: 'section',
      property: 'contentSection',
      class: this.split.length > 0 ? 'split' : undefined,
      properties: {
        ...pageSectionProperties(header),
        featureItem: definitions.flatten().tag('div'),
      },
      children: splitLayout({
        split: this.split,
        mirror: this.mirror,
        main: header.concat(definitions).toArray(),
        side: side.toArray(),
      }).next()
    });
  }
}

export const feature = createSchema(FeatureModel);
