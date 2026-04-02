import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes, RenderableNodeCursor, headingsToList, descriptionHelper as description, pageSectionProperties } from '@refrakt-md/runes';
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

function convertHeadings(nodes: Node[]): Node[] {
  // Auto-detect heading level from the first heading that matches "Name — Price"
  const level = nodes.find(n => {
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
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'content', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const processed = convertHeadings(asNodes(resolved.content));

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
        tier: tiers,
      },
      refs: {
        ...sectionProps,
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

export const tier = createContentModelSchema({
  attributes: {
    name: { type: String, required: true },
    price: { type: String, required: false },
    featured: { type: Boolean, required: false },
    currency: { type: String, required: false },
    priceMonthly: { type: String, required: false },
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const type = attrs.featured ? schema.FeaturedTier : schema.Tier;

    const priceValue = attrs.price || attrs.priceMonthly || '';
    const nameTag = new Tag('h1', {}, [attrs.name ?? '']);
    const priceTag = new Tag('p', {}, [priceValue]);
    const children = new RenderableNodeCursor(
      Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
    );
    const body = children.wrap('div');

    const currencyMeta = attrs.currency ? new Tag('meta', { content: attrs.currency }) : undefined;

    // Schema.org price parsing: extract numeric value and infer currency
    const numericMatch = priceValue.match(/[\d.]+/);
    const parsedPriceMeta = new Tag('meta', { content: numericMatch ? numericMatch[0] : priceValue });
    const resolvedCurrencyMeta = new Tag('meta', { content: attrs.currency || inferCurrency(priceValue) });

    return createComponentRenderable(type, {
      tag: 'li',
      properties: {
        description: description(children),
        ...(currencyMeta ? { currency: currencyMeta } : {}),
        url: children.flatten().tag('a'),
      },
      refs: {
        body: body.tag('div'),
        name: nameTag,
        price: priceTag,
      },
      schema: {
        name: nameTag,
        price: parsedPriceMeta,
        priceCurrency: resolvedCurrencyMeta,
      },
      children: [nameTag, priceTag, parsedPriceMeta, resolvedCurrencyMeta, ...(currencyMeta ? [currencyMeta] : []), body.next()],
    })
  },
});
