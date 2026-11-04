import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	headingsToList,
	descriptionHelper as description,
	pageSectionProperties,
} from '@refrakt-md/runes';

const NAME_PRICE_PATTERN = /^(.+?)\s*[-–—]\s*(.+)$/;

const CURRENCY_SYMBOLS: Record<string, string> = {
	$: 'USD',
	'€': 'EUR',
	'£': 'GBP',
	'¥': 'JPY',
	'₹': 'INR',
	kr: 'SEK',
	CHF: 'CHF',
	A$: 'AUD',
	C$: 'CAD',
};

function inferCurrency(priceText: string): string {
	for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
		if (priceText.startsWith(symbol)) return code;
	}
	return 'USD';
}

function convertHeadings(nodes: Node[]): Node[] {
	const level = nodes.find((n) => {
		if (n.type !== 'heading') return false;
		const text = Array.from(n.walk())
			.filter((c) => c.type === 'text')
			.map((t) => t.attributes.content)
			.join(' ');
		return NAME_PRICE_PATTERN.test(text);
	})?.attributes.level;
	if (!level) return nodes;

	const converted = headingsToList({ level })(nodes);
	const n = converted.length - 1;
	if (!converted[n] || converted[n].type !== 'list') return nodes;

	const result: Node[] = converted.slice(0, n);
	for (const item of converted[n].children) {
		const heading = item.children[0];
		const headingText = Array.from(heading.walk())
			.filter((n) => n.type === 'text')
			.map((t) => t.attributes.content)
			.join(' ');

		const match = headingText.match(NAME_PRICE_PATTERN);
		if (match) {
			result.push(
				new Ast.Node(
					'tag',
					{ name: match[1].trim(), price: match[2].trim() },
					item.children.slice(1),
					'tier',
				),
			);
		} else {
			result.push(heading, ...item.children.slice(1));
		}
	}
	return result;
}

export const pricingSections = {
	preamble: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'title',
	blurb: 'description',
} as const;

export const pricingSchema = {
	type: 'Product',
	properties: { headline: 'name', blurb: 'description' },
	lists: ['offers'],
	children: {
		tier: { type: 'Offer', property: 'offers' },
		'featured-tier': { type: 'Offer', property: 'offers' },
	},
} as const;

export const pricing = createContentModelSchema({
	schema: pricingSchema,
	sections: pricingSections,
	attributes: {},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'content', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const processed = convertHeadings(asNodes(resolved.content));

		const allNodes = new RenderableNodeCursor(
			Markdoc.transform(processed, config) as RenderableTreeNode[],
		);

		const header = allNodes.tags('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p');
		const tiers = allNodes.tag('li');

		const sectionProps = pageSectionProperties(header);
		const tiersList = tiers.wrap('ul', {
			'data-layout': 'grid',
			'data-columns': tiers.nodes.length,
		});

		return createComponentRenderable({
			rune: 'pricing',
			tag: 'section',
			properties: {
				tier: tiers,
			},
			refs: {
				...sectionProps,
				tiers: tiersList.tag('ul'),
			},
			children: [header.wrap('header').next(), tiersList.next()],
		});
	},
});

export const tierSchema = {
	type: 'Offer',
	properties: { name: 'name', parsedPrice: 'price', resolvedCurrency: 'priceCurrency' },
} as const;

export const tier = createContentModelSchema({
	schema: tierSchema,
	attributes: {
		name: { type: String, required: true },
		price: { type: String, required: false },
		featured: { type: Boolean, required: false },
		currency: { type: String, required: false },
		priceMonthly: { type: String, required: false },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const runeName = attrs.featured ? 'featured-tier' : 'tier';

		const priceValue = attrs.price || attrs.priceMonthly || '';
		const nameTag = new Tag('h1', {}, [attrs.name ?? '']);
		const priceTag = new Tag('p', {}, [priceValue]);
		const children = renderNodes(resolved.body, config);
		const body = children.wrap('div');

		const currencyMeta = attrs.currency ? new Tag('meta', { content: attrs.currency }) : undefined;

		const numericMatch = priceValue.match(/[\d.]+/);
		const parsedPriceMeta = new Tag('meta', {
			content: numericMatch ? numericMatch[0] : priceValue,
		});
		const resolvedCurrencyMeta = new Tag('meta', {
			content: attrs.currency || inferCurrency(priceValue),
		});

		return createComponentRenderable({
			rune: runeName,
			tag: 'li',
			properties: {
				description: description(children),
				currency: currencyMeta,
				url: children.flatten().tag('a'),
				// Not `price` / `currency`: those are the rendered price and the authored attribute.
				parsedPrice: parsedPriceMeta,
				resolvedCurrency: resolvedCurrencyMeta,
			},
			refs: {
				body: body.tag('div'),
				name: nameTag,
				price: priceTag,
			},
			children: [nameTag, priceTag, body.next()],
		});
	},
});
