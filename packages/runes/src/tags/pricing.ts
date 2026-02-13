import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { description, pageSectionProperties } from './common.js';

const NAME_PRICE_PATTERN = /^(.+?)\s*[-–—]\s*(.+)$/;

class PricingModel extends Model {
  @attribute({ type: Number, required: false })
  headingLevel: number | undefined = undefined;

  @group({ include: ['heading', 'paragraph'] })
  header: NodeStream;

  @group({ include: ['tag'] })
  tiers: NodeStream;

  convertHeadings(nodes: Node[]) {
    // Auto-detect heading level from the first heading that matches "Name — Price"
    const level = this.headingLevel ?? nodes.find(n => {
      if (n.type !== 'heading') return false;
      const text = Array.from(n.walk()).filter(c => c.type === 'text').map(t => t.attributes.content).join(' ');
      return NAME_PRICE_PATTERN.test(text);
    })?.attributes.level;
    if (!level) return nodes;

    const converted = headingsToList({ level })(nodes);
    const n = converted.length - 1;
    if (!converted[n] || converted[n].type !== 'list') return nodes;

    // Only convert items whose heading matches "Name — Price"; keep others as-is
    const result: Node[] = converted.slice(0, n);
    for (const item of converted[n].children) {
      const heading = item.children[0];
      const headingText = Array.from(heading.walk())
        .filter(n => n.type === 'text')
        .map(t => t.attributes.content)
        .join(' ');

      const match = headingText.match(NAME_PRICE_PATTERN);
      if (match) {
        result.push(new Ast.Node('tag', { name: match[1].trim(), price: match[2].trim() }, item.children.slice(1), 'tier'));
      } else {
        // Non-matching heading: keep as original heading + body nodes
        result.push(heading, ...item.children.slice(1));
      }
    }
    return result;
  }

  processChildren(nodes: Node[]) {
    return super.processChildren(this.convertHeadings(nodes));
  }

  transform(): RenderableTreeNodes {
    const header = this.header.transform();
    const tiers = this.tiers.transform();

    const tierItems = tiers.tag('li');
    const tiersList = tiers.wrap('ul', { 'data-layout': 'grid', 'data-columns': tiers.nodes.length });

    return createComponentRenderable(schema.Pricing, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...pageSectionProperties(header),
        tier: tierItems,
      },
      refs: {
        tiers: tiersList.tag('ul'),
      },
      children: [
        header.wrap('header').next(),
        tiersList.next(),
      ]
    });
  }
}

export const pricing = createSchema(PricingModel);

export class TierModel extends Model {
  @attribute({ type: String, required: true })
  name: string;

  @attribute({ type: String, required: false })
  price: string = '';

  @attribute({ type: Boolean, required: false })
  featured: boolean = false;

  @attribute({ type: String, required: false })
  currency: string = '';

  // Backwards compat: accept priceMonthly as alias for price
  @attribute({ type: String, required: false })
  priceMonthly: string = '';

  transform(): RenderableTreeNodes {
    const type = this.featured ? schema.FeaturedTier : schema.Tier;

    const priceValue = this.price || this.priceMonthly;
    const nameTag = new Tag('h1', {}, [this.name]);
    const priceTag = new Tag('p', {}, [priceValue]);
    const children = this.transformChildren();
    const body = children.wrap('div');

    const currencyMeta = this.currency ? new Tag('meta', { content: this.currency }) : undefined;

    return createComponentRenderable(type, {
      tag: 'li',
      properties: {
        name: nameTag,
        description: description(children),
        price: priceTag,
        ...(currencyMeta ? { currency: currencyMeta } : {}),
        url: children.flatten().tag('a'),
      },
      refs: {
        body: body.tag('div'),
      },
      children: [nameTag, priceTag, ...(currencyMeta ? [currencyMeta] : []), body.next()],
    })
  }
}

export const tier = createSchema(TierModel);
