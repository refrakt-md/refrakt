import { PageSection } from "@refrakt-md/types";

export class ComparisonRow {
	label: string = '';
	rowType: string = 'text';
}

export class ComparisonColumn {
	name: string = '';
	highlighted: boolean = false;
	row: ComparisonRow[] = [];
}

export class Comparison extends PageSection {
	layout: string = 'table';
	labels: string = 'left';
	collapse: boolean = true;
	verdict: string = '';
	highlighted: string = '';
	rowLabels: string = '[]';
	column: ComparisonColumn[] = [];
}
