export class BudgetLineItem {
	description: string = '';
	amount: string = '';
}

export class BudgetCategory {
	label: string = '';
	estimate: string = 'false';
	lineItem: BudgetLineItem[] = [];
	subtotal: string = '';
}

export class Budget {
	category: BudgetCategory[] = [];
	title: string = '';
	currency: string = 'USD';
	travelers: string = '1';
	duration: string = '';
	showPerPerson: string = 'true';
	showPerDay: string = 'true';
	variant: string = 'detailed';
}
