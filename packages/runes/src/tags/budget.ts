import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';
import { pageSectionProperties } from './common.js';

// ─── Amount parsing ───

const DESCRIPTION_AMOUNT_PATTERN = /^(.+)\s*:\s*([€$£¥]?\s*[\d].*)$/;

function parseAmount(str: string): number {
	const cleaned = str.replace(/[€$£¥\s]/g, '').replace(/,/g, '');
	const range = cleaned.match(/^([\d.]+)\s*[-–]\s*([\d.]+)/);
	if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
}

// ─── Total derivation + currency formatting ───
// SPEC-081 computation boundary: budget totals are a theme-invariant fact
// about the content, so they are derived here (the rune transform), not in a
// presentation postTransform. Currency formatting is deterministic from the
// authored amounts, so it rides along.

const BUDGET_CURRENCY_SYMBOLS: Record<string, string> = {
	USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
	AUD: 'A$', CAD: 'C$', CHF: 'CHF ', SEK: 'kr', NOK: 'kr', DKK: 'kr',
	INR: '₹', KRW: '₩', BRL: 'R$', MXN: 'MX$', ZAR: 'R',
};

/**
 * Format a budget amount. Zero-config / English keeps the deterministic
 * `symbol + grouped amount` form so output is byte-identical. When a non-English
 * `locale` is configured (SPEC-035), `Intl.NumberFormat` with `style: 'currency'`
 * produces locale-appropriate separators and currency placement.
 */
function formatBudgetAmount(amount: number, symbol: string, currency?: string, locale?: string): string {
	if (locale && locale !== 'en' && currency && /^[A-Za-z]{3}$/.test(currency)) {
		try {
			return new Intl.NumberFormat(locale, {
				style: 'currency',
				currency: currency.toUpperCase(),
			}).format(amount);
		} catch {
			// Unknown currency code / unsupported locale → deterministic fallback.
		}
	}
	const parts = (amount % 1 === 0 ? String(amount) : amount.toFixed(2)).split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return symbol + parts.join('.');
}

function parseBudgetDays(duration: string): number {
	let days = 0;
	const dayMatch = duration.match(/(\d+)\s*day/i);
	const weekMatch = duration.match(/(\d+)\s*week/i);
	const monthMatch = duration.match(/(\d+)\s*month/i);
	if (dayMatch) days += parseInt(dayMatch[1]);
	if (weekMatch) days += parseInt(weekMatch[1]) * 7;
	if (monthMatch) days += parseInt(monthMatch[1]) * 30;
	if (days === 0) {
		const num = parseInt(duration);
		if (!isNaN(num)) days = num;
	}
	return days;
}

/** Read a budget-category's field value from its `data-rune-fields` bag.
 *  `createComponentRenderable` moves pure-data metas (label, subtotal) into the
 *  JSON field bag and drops them from the children, so the parent reads the bag
 *  rather than scanning for child metas (which no longer exist). */
function readCategoryField(cat: Markdoc.Tag, field: string): string {
	try {
		const bag = JSON.parse(String(cat.attributes['data-rune-fields'] ?? '{}'));
		if (bag[field] !== undefined && bag[field] !== null) return String(bag[field]);
	} catch {
		// Malformed/absent bag — fall through to empty.
	}
	return '';
}

// ─── Heading estimate parsing ───

const ESTIMATE_SUFFIX_PATTERN = /^(.+?)\s*\((?:estimate|est\.?)\)\s*$/i;
const TILDE_PATTERN = /^~(.+?)~$/;

function parseEstimate(heading: Node): { label: string; estimate: boolean } {
	const textParts: string[] = [];
	let hasStrikethrough = false;

	for (const child of heading.walk()) {
		if (child.type === 'text' && child.attributes.content) {
			textParts.push(child.attributes.content);
		}
		if (child.type === 's') {
			hasStrikethrough = true;
		}
	}

	const text = textParts.join(' ').trim();

	// ## Label (estimate) or ## Label (est.)
	const estMatch = text.match(ESTIMATE_SUFFIX_PATTERN);
	if (estMatch) {
		return { label: estMatch[1].trim(), estimate: true };
	}

	// ## ~Label~ (single tildes as literal text)
	const tildeMatch = text.match(TILDE_PATTERN);
	if (tildeMatch) {
		return { label: tildeMatch[1].trim(), estimate: true };
	}

	// ## ~~Label~~ (strikethrough node)
	if (hasStrikethrough) {
		return { label: text, estimate: true };
	}

	return { label: text, estimate: false };
}

// ─── BudgetLineItem ───

export const budgetLineItem = createContentModelSchema({
	attributes: {
		description: { type: String, required: false, description: 'Line item description' },
		amount: { type: String, required: false, description: 'Line item amount' },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(resolved, attrs) {
		const descTag = new Tag('span', {}, [attrs.description ?? '']);
		const amountTag = new Tag('span', {}, [attrs.amount ?? '']);

		return createComponentRenderable({ rune: 'budget-line-item',
			tag: 'li',
			properties: {
				description: descTag,
				amount: amountTag,
			},
			children: [descTag, amountTag],
		});
	},
});

// ─── BudgetCategory ───

// Convert list items into budget-line-item tags and compute subtotal
function convertCategoryChildren(nodes: unknown[]): unknown[] {
	const converted: Node[] = [];

	for (const node of nodes as Node[]) {
		if (node.type === 'list') {
			for (const item of node.children) {
				const textParts: string[] = [];
				for (const child of item.walk()) {
					if (child.type === 'text' && child.attributes.content) {
						textParts.push(child.attributes.content);
					}
				}
				const text = textParts.join(' ').trim();
				const match = text.match(DESCRIPTION_AMOUNT_PATTERN);

				if (match) {
					converted.push(new Ast.Node('tag', {
						description: match[1].trim(),
						amount: match[2].trim(),
					}, [], 'budget-line-item'));
				} else {
					converted.push(new Ast.Node('tag', {
						description: text,
						amount: '',
					}, [], 'budget-line-item'));
				}
			}
		} else {
			converted.push(node);
		}
	}

	return converted;
}

/** Compute subtotal from budget-line-item tag nodes. */
function computeSubtotal(nodes: Node[]): number {
	let subtotal = 0;
	for (const node of nodes) {
		if (node.type === 'tag' && node.tag === 'budget-line-item' && node.attributes.amount) {
			subtotal += parseAmount(node.attributes.amount);
		}
	}
	return subtotal;
}

export const budgetCategory = createContentModelSchema({
	attributes: {
		label: { type: String, required: true },
		estimate: { type: Boolean, required: false },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertCategoryChildren,
		description: 'Converts list items into budget-line-item tags with "Description: $Amount" pattern.',
	},
	transform(resolved, attrs, config) {
		// Compute subtotal from the raw children before transforming
		const allChildren = asNodes(resolved.children);
		const subtotal = computeSubtotal(allChildren);

		const body = new RenderableNodeCursor(
			Markdoc.transform(allChildren, config) as RenderableTreeNode[],
		);
		const labelTag = new Tag('meta', { content: attrs.label ?? '' });
		const estimateMeta = new Tag('meta', { content: attrs.estimate ? 'estimate' : 'false' });
		const subtotalTag = new Tag('meta', { content: String(subtotal) });

		const items = body.tag('li').typeof('BudgetLineItem');
		const itemsList = new Tag('ul', {}, items.toArray());

		return createComponentRenderable({ rune: 'budget-category',
			tag: 'div',
			properties: {
				label: labelTag,
				estimate: estimateMeta,
				lineItem: items,
				subtotal: subtotalTag,
			},
			refs: {
				'line-items': itemsList,
			},
			children: [labelTag, estimateMeta, subtotalTag, itemsList],
		});
	},
});

// ─── Budget (parent) ───

const variantType = ['detailed', 'summary'] as const;

// Convert headings into budget-category tags, preserving leading preamble content
function convertBudgetChildren(nodes: unknown[]): unknown[] {
	const typed = nodes as Node[];

	// Find the first two headings to detect a preamble title
	const headings = typed.reduce<{ idx: number; level: number }[]>((acc, n, i) => {
		if (n.type === 'heading') acc.push({ idx: i, level: n.attributes.level });
		return acc;
	}, []);

	// If the first heading has a lower level than the second (e.g. H1 vs H2),
	// everything before the second heading is preamble content (title, blurb, etc.)
	let preamble: Node[] = [];
	let categoryNodes: Node[] = typed;
	if (headings.length >= 2 && headings[0].level < headings[1].level) {
		preamble = typed.slice(0, headings[1].idx);
		categoryNodes = typed.slice(headings[1].idx);
	}

	const converted = headingsToList()(categoryNodes);
	const n = converted.length - 1;
	if (!converted[n] || converted[n].type !== 'list') return nodes;

	const tags = converted[n].children.map(item => {
		const heading = item.children[0];
		const { label, estimate } = parseEstimate(heading);

		return new Ast.Node('tag', { label, estimate }, item.children.slice(1), 'budget-category');
	});

	converted.splice(n, 1, ...tags);
	return [...preamble, ...converted];
}

export const budget = createContentModelSchema({
	attributes: {
		currency: { type: String, required: false, description: 'Currency symbol or code (e.g. USD, EUR)' },
		duration: { type: String, required: false, description: 'Budget duration for per-day calculations (e.g. "5 days", "1 month")' },
		showPerDay: { type: Boolean, required: false, description: 'Show per-day cost breakdown' },
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Display style: detailed line items or summary' },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertBudgetChildren,
		description: 'Converts headings into budget-category tags with estimate parsing, '
			+ 'where list items become budget-line-items with "Description: $Amount" pattern.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);

		// Separate preamble content (headings + paragraphs) from tag nodes (categories)
		const headerAst: Node[] = [];
		const bodyAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag') {
				bodyAst.push(child);
			} else if (child.type === 'paragraph' || child.type === 'heading') {
				headerAst.push(child);
			}
		}

		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAst, config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(bodyAst, config) as RenderableTreeNode[],
		);

		const sectionProps = pageSectionProperties(header);

		const currency = (attrs.currency as string) ?? 'USD';
		const duration = (attrs.duration as string) ?? '';
		const showPerDay = (attrs.showPerDay as boolean) ?? true;
		const variant = (attrs.variant as string) ?? 'detailed';
		const symbol = BUDGET_CURRENCY_SYMBOLS[currency.toUpperCase()] || currency + ' ';
		// SPEC-035 — the active locale, if the content pipeline exposes it as a
		// Markdoc variable. Absent → English (deterministic) formatting.
		const locale = (config?.variables?.locale as string | undefined) ?? undefined;
		const fmt = (amount: number) => formatBudgetAmount(amount, symbol, currency, locale);

		const currencyMeta = new Tag('meta', { content: currency });
		const durationMeta = new Tag('meta', { content: duration });
		const showPerDayMeta = new Tag('meta', { content: String(showPerDay) });
		const variantMeta = new Tag('meta', { content: variant });

		// Derive totals in the transform (SPEC-081 computation boundary) and
		// inject each category's header (label + formatted subtotal). Subtotals
		// were already computed per-category; the grand total sums them.
		const categories = body.tag('div').typeof('BudgetCategory');
		const catNodes = categories.toArray();
		let grandTotal = 0;
		for (const cat of catNodes) {
			if (!Markdoc.Tag.isTag(cat)) continue;
			const label = readCategoryField(cat, 'label');
			const subtotal = parseFloat(readCategoryField(cat, 'subtotal')) || 0;
			grandTotal += subtotal;

			const catHeader = new Tag('div', { class: 'rf-budget-category__header' }, [
				new Tag('span', { class: 'rf-budget-category__label' }, [label]),
				new Tag('span', { class: 'rf-budget-category__subtotal' }, [fmt(subtotal)]),
			]);
			cat.children = [catHeader, ...cat.children];
		}
		const categoriesDiv = new Tag('div', {}, catNodes);

		// Per-day breakdown.
		const days = duration ? parseBudgetDays(duration) : 0;
		const hasPerDay = !!duration && showPerDay && days > 0;
		const perDay = hasPerDay ? grandTotal / days : 0;

		// Footer — transform-built so it reproduces the previous postTransform
		// output exactly (carries its own class, no data-name; appends last).
		const footerChildren: any[] = [
			new Tag('div', { class: 'rf-budget__total' }, [
				// SPEC-035 Zone 2 — `data-i18n` marks the programmatic label for
				// locale resolution in the engine (the schema transform has no
				// locale access); the literal is the English fallback.
				new Tag('span', { class: 'rf-budget__total-label', 'data-i18n': 'core.budget.total' }, ['Total']),
				new Tag('span', { class: 'rf-budget__total-amount' }, [fmt(grandTotal)]),
			]),
		];
		if (hasPerDay) {
			footerChildren.push(new Tag('div', { class: 'rf-budget__per-day' }, [
				new Tag('span', { class: 'rf-budget__per-day-label', 'data-i18n': 'core.budget.perDay' }, ['Per day']),
				new Tag('span', { class: 'rf-budget__per-day-amount' }, [fmt(perDay)]),
			]));
		}
		const footerDiv = new Tag('div', { class: 'rf-budget__footer' }, footerChildren);

		// Derived totals → the `fields` bag (semantic data the cross-page
		// pipeline can read). Bag-only: referenced as properties but kept out of
		// `children`, so they never render as stray metas.
		const totalMeta = new Tag('meta', { content: String(grandTotal) });
		const perDayMeta = new Tag('meta', { content: String(perDay) });

		// SPEC-081: emit flat header slots — `layout` builds the preamble
		// <header>; the categories and footer append after it.
		const children: any[] = [
			currencyMeta, durationMeta,
			showPerDayMeta, variantMeta,
			...header.toArray(),
			categoriesDiv,
			footerDiv,
		];

		return createComponentRenderable({ rune: 'budget', schemaOrgType: 'ItemList',
			tag: 'section',
			property: 'contentSection',
			properties: {
				currency: currencyMeta,
				duration: durationMeta,
				showPerDay: showPerDayMeta,
				variant: variantMeta,
				category: categories,
				total: totalMeta,
				...(hasPerDay ? { perDay: perDayMeta } : {}),
			},
			refs: {
				...sectionProps,
				categories: categoriesDiv,
			},
			children,
		});
	},
});
