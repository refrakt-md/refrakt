import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

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

class BudgetLineItemModel extends Model {
	@attribute({ type: String, required: false })
	description: string = '';

	@attribute({ type: String, required: false })
	amount: string = '';

	transform(): RenderableTreeNodes {
		const descTag = new Tag('span', {}, [this.description]);
		const amountTag = new Tag('span', {}, [this.amount]);

		return createComponentRenderable(schema.BudgetLineItem, {
			tag: 'li',
			properties: {
				description: descTag,
				amount: amountTag,
			},
			children: [descTag, amountTag],
		});
	}
}

// ─── BudgetCategory ───

class BudgetCategoryModel extends Model {
	@attribute({ type: String, required: true })
	label: string = '';

	@attribute({ type: Boolean, required: false })
	estimate: boolean = false;

	@group({ include: ['list', 'tag'] })
	body: NodeStream;

	private _subtotal: number = 0;

	processChildren(nodes: Node[]) {
		const converted: Node[] = [];
		this._subtotal = 0;

		for (const node of nodes) {
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
						const amount = match[2].trim();
						this._subtotal += parseAmount(amount);
						converted.push(new Ast.Node('tag', {
							description: match[1].trim(),
							amount,
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

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const body = this.body.transform();
		const labelTag = new Tag('span', {}, [this.label]);
		const estimateMeta = new Tag('meta', { content: String(this.estimate) });
		const subtotalTag = new Tag('span', {}, [String(this._subtotal)]);

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
	}
}

// ─── Budget (parent) ───

const styleType = ['detailed', 'summary'] as const;

class BudgetModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false })
	currency: string = 'USD';

	@attribute({ type: Number, required: false })
	travelers: number = 1;

	@attribute({ type: String, required: false })
	duration: string = '';

	@attribute({ type: Boolean, required: false })
	showPerPerson: boolean = true;

	@attribute({ type: Boolean, required: false })
	showPerDay: boolean = true;

	@attribute({ type: String, required: false, matches: styleType.slice() })
	style: typeof styleType[number] = 'detailed';

	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@group({ include: ['paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	body: NodeStream;

	convertHeadings(nodes: Node[]) {
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
		if (!level) return nodes;

		const converted = headingsToList({ level })(nodes);
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

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const body = this.body.transform();

		const titleMeta = new Tag('meta', { content: this.title });
		const currencyMeta = new Tag('meta', { content: this.currency });
		const travelersMeta = new Tag('meta', { content: String(this.travelers) });
		const durationMeta = new Tag('meta', { content: this.duration });
		const showPerPersonMeta = new Tag('meta', { content: String(this.showPerPerson) });
		const showPerDayMeta = new Tag('meta', { content: String(this.showPerDay) });
		const styleMeta = new Tag('meta', { content: this.style });

		const categories = body.tag('div').typeof('BudgetCategory');
		const categoriesDiv = new Tag('div', {}, categories.toArray());

		const children: any[] = [
			titleMeta, currencyMeta, travelersMeta, durationMeta,
			showPerPersonMeta, showPerDayMeta, styleMeta,
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
				style: styleMeta,
				category: categories,
			},
			refs: {
				categories: categoriesDiv,
			},
			children,
		});
	}
}

export const budgetLineItem = createSchema(BudgetLineItemModel);
export const budgetCategory = createSchema(BudgetCategoryModel);
export const budget = createSchema(BudgetModel);
