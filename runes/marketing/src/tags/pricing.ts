import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor, headingsToList, descriptionHelper as description, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

const NAME_PRICE_PATTERN = /^(.+?)\s*[-–—]\s*(.+)$/;

const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
  'kr': 'SEK', 'CHF': 'CHF', 'A$': 'AUD', 'C$': 'CAD',
};

function inferCurrency(priceText: string): string {
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (priceText.startsWith(symbol)) return code;
  }
  return 'USD';
}

function convertHeadings(nodes: Node[], headingLevel?: number): Node[] {
  // Auto-detect heading level from the first heading that matches "Name — Price"
  const level = headingLevel ?? nodes.find(n => {
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

export const pricing = createContentModelSchema({
  attributes: {
    headingLevel: { type: Number, required: false },
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'content', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const processed = convertHeadings(asNodes(resolved.content), attrs.headingLevel);

    const allNodes = new RenderableNodeCursor(
      Markdoc.transform(processed, config) as RenderableTreeNode[],
    );

    // Separate header (headings, paragraphs) from tiers (li items)
    const header = allNodes.tags('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p');
    const tiers = allNodes.tag('li');

    const sectionProps = pageSectionProperties(header);
    const tiersList = tiers.wrap('ul', { 'data-layout': 'grid', 'data-columns': tiers.nodes.length });

    return createComponentRenderable(schema.Pricing, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        ...sectionProps,
        tier: tiers,
      },
      refs: {
        tiers: tiersList.tag('ul'),
      },
      schema: {
        name: sectionProps.headline,
        description: sectionProps.blurb,
        offers: tiers,
      },
      children: [
        header.wrap('header').next(),
        tiersList.next(),
      ]
    });
  },
});

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

    // Schema.org price parsing: extract numeric value and infer currency
    const numericMatch = priceValue.match(/[\d.]+/);
    const parsedPriceMeta = new Tag('meta', { content: numericMatch ? numericMatch[0] : priceValue });
    const resolvedCurrencyMeta = new Tag('meta', { content: this.currency || inferCurrency(priceValue) });

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
      schema: {
        name: nameTag,
        price: parsedPriceMeta,
        priceCurrency: resolvedCurrencyMeta,
      },
      children: [nameTag, priceTag, parsedPriceMeta, resolvedCurrencyMeta, ...(currencyMeta ? [currencyMeta] : []), body.next()],
    })
  }
}

export const tier = createSchema(TierModel);
