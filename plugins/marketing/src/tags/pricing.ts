import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	asNodes,
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
	// Auto-detect heading level from the first heading that matches "Name — Price"
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

	// Only convert items whose heading matches "Name — Price"; keep others as-is
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
			// Non-matching heading: keep as original heading + body nodes
			result.push(heading, ...item.children.slice(1));
		}
	}
	return result;
}

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const pricingSections = {
	preamble: 'preamble',
	headline: 'title',
	blurb: 'description',
} as const;

// SPEC-130 / WORK-568 — Group B, and where D6 shows. `offers` is declared a
// list, so a one-tier pricing block serialises `"offers": [{…}]` instead of the
// bare object it used to emit — the shape no longer varies with how much content
// an author wrote.
//
// The tiers are retyped from here rather than from `tier` itself (D9): the
// property that holds a child and the child's type are one declaration, and only
// the parent can supply the property. `featured-tier` is the same rune under a
// different name, so both keys are listed.
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

		// Separate header (headings, paragraphs) from tiers (li items)
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
			property: 'contentSection',
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

// SPEC-130 / WORK-568 — Group B, and the pair's careful half. `parsedPrice` and
// `resolvedCurrency` survived only *because* the rune declared them in `schema:`
// — that is the `isSeoMeta` check in `createComponentRenderable`. With the
// declaration gone they are dropped as pure data, and the applier rebuilds them
// from the field bag, which works only because WORK-561 put them there. Had this
// landed first, the price would have vanished from the structured data while the
// HTML looked identical.
//
// `pricing` restates this type in its `children` row: a standalone `{% tier %}`
// is still an `Offer`, and inside a `{% pricing %}` the parent is what nests it.
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
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
	},
	transform(resolved, attrs, config) {
		const runeName = attrs.featured ? 'featured-tier' : 'tier';

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
				...(currencyMeta ? { currency: currencyMeta } : {}),
				url: children.flatten().tag('a'),
				// WORK-561 — value-only SEO carriers, addressable by name for
				// WORK-565's applier. Both stay in `schema:`, so they keep their
				// `property=` and are not dropped; the bag entry is additional.
				//
				// Deliberately *not* named `price`/`currency`: `price` is already the
				// `<p>` ref (the rendered price, "$19") and `currency` is already the
				// author's raw attribute. These two are the parsed numeric value and
				// the resolved-or-inferred code — different nodes with different
				// values, so they get their own names rather than shadowing.
				parsedPrice: parsedPriceMeta,
				resolvedCurrency: resolvedCurrencyMeta,
			},
			refs: {
				body: body.tag('div'),
				name: nameTag,
				price: priceTag,
			},
			children: [
				nameTag,
				priceTag,
				parsedPriceMeta,
				resolvedCurrencyMeta,
				...(currencyMeta ? [currencyMeta] : []),
				body.next(),
			],
		});
	},
});
