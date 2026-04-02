import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { createComponentRenderable, createContentModelSchema, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

// ─── Amount parsing ───

const DESCRIPTION_AMOUNT_PATTERN = /^(.+)\s*:\s*([€$£¥]?\s*[\d].*)$/;

function parseAmount(str: string): number {
	const cleaned = str.replace(/[€$£¥\s]/g, '').replace(/,/g, '');
	const range = cleaned.match(/^([\d.]+)\s*[-–]\s*([\d.]+)/);
	if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
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

		return createComponentRenderable(schema.BudgetLineItem, {
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
		const estimateMeta = new Tag('meta', { content: String(attrs.estimate ?? false) });
		const subtotalTag = new Tag('meta', { content: String(subtotal) });

		const items = body.tag('li').typeof('BudgetLineItem');
		const itemsList = new Tag('ul', {}, items.toArray());

		return createComponentRenderable(schema.BudgetCategory, {
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

// Convert headings into budget-category tags
function convertBudgetChildren(nodes: unknown[]): unknown[] {
	const converted = headingsToList()(nodes as Node[]);
	const n = converted.length - 1;
	if (!converted[n] || converted[n].type !== 'list') return nodes;

	const tags = converted[n].children.map(item => {
		const heading = item.children[0];
		const { label, estimate } = parseEstimate(heading);

		return new Ast.Node('tag', { label, estimate }, item.children.slice(1), 'budget-category');
	});

	converted.splice(n, 1, ...tags);
	return converted;
}

export const budget = createContentModelSchema({
	attributes: {
		title: { type: String, required: false, description: 'Title for the budget breakdown' },
		currency: { type: String, required: false, description: 'Currency symbol or code (e.g. USD, EUR)' },
		travelers: { type: Number, required: false, description: 'Number of travelers for per-person calculations' },
		duration: { type: String, required: false, description: 'Trip duration for per-day calculations' },
		showPerPerson: { type: Boolean, required: false, description: 'Show per-person cost breakdown' },
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

		// Separate header content from tag nodes
		const headerAst: Node[] = [];
		const bodyAst: Node[] = [];
		for (const child of allChildren) {
			if (child.type === 'tag') {
				bodyAst.push(child);
			} else if (child.type === 'paragraph') {
				headerAst.push(child);
			}
		}

		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAst, config) as RenderableTreeNode[],
		);
		const body = new RenderableNodeCursor(
			Markdoc.transform(bodyAst, config) as RenderableTreeNode[],
		);

		const titleMeta = new Tag('meta', { content: attrs.title ?? '' });
		const currencyMeta = new Tag('meta', { content: attrs.currency ?? 'USD' });
		const travelersMeta = new Tag('meta', { content: String(attrs.travelers ?? 1) });
		const durationMeta = new Tag('meta', { content: attrs.duration ?? '' });
		const showPerPersonMeta = new Tag('meta', { content: String(attrs.showPerPerson ?? true) });
		const showPerDayMeta = new Tag('meta', { content: String(attrs.showPerDay ?? true) });
		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'detailed' });

		const categories = body.tag('div').typeof('BudgetCategory');
		const categoriesDiv = new Tag('div', {}, categories.toArray());

		const children: any[] = [
			titleMeta, currencyMeta, travelersMeta, durationMeta,
			showPerPersonMeta, showPerDayMeta, variantMeta,
		];
		if (header.count() > 0) {
			children.push(header.wrap('div').next());
		}
		children.push(categoriesDiv);

		return createComponentRenderable(schema.Budget, {
			tag: 'section',
			properties: {
				title: titleMeta,
				currency: currencyMeta,
				travelers: travelersMeta,
				duration: durationMeta,
				showPerPerson: showPerPersonMeta,
				showPerDay: showPerDayMeta,
				variant: variantMeta,
				category: categories,
			},
			refs: {
				categories: categoriesDiv,
			},
			children,
		});
	},
});
