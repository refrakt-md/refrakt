import { ComponentType, PropertyNodes } from "../interfaces.js";

export class BudgetLineItem {
	description: string = '';
	amount: string = '';
}

export interface BudgetLineItemComponent extends ComponentType<BudgetLineItem> {
	tag: 'li',
	properties: {
		description: 'span',
		amount: 'span',
	},
	refs: {}
}

export class BudgetCategory {
	label: string = '';
	estimate: string = 'false';
	lineItem: BudgetLineItem[] = [];
	subtotal: string = '';
}

export interface BudgetCategoryProperties extends PropertyNodes<BudgetCategory> {
	label: 'span',
	estimate: 'meta',
	lineItem: 'li',
	subtotal: 'span',
}

export interface BudgetCategoryComponent extends ComponentType<BudgetCategory> {
	tag: 'div',
	properties: BudgetCategoryProperties,
	refs: {
		'line-items': 'ul',
	}
}

export class Budget {
	category: BudgetCategory[] = [];
	title: string = '';
	currency: string = 'USD';
	travelers: string = '1';
	duration: string = '';
	showPerPerson: string = 'true';
	showPerDay: string = 'true';
	style: string = 'detailed';
}

export interface BudgetProperties extends PropertyNodes<Budget> {
	category: 'div',
	title: 'meta',
	currency: 'meta',
	travelers: 'meta',
	duration: 'meta',
	showPerPerson: 'meta',
	showPerDay: 'meta',
	style: 'meta',
}

export interface BudgetComponent extends ComponentType<Budget> {
	tag: 'section',
	properties: BudgetProperties,
	refs: {
		categories: 'div',
	}
}
