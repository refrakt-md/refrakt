import { PageSection } from "@refrakt-md/types";

export class ComparisonRow {
	label: string = '';
	rowType: string = 'text';
}

export class ComparisonColumn {
	name: string = '';
	highlighted: string = 'false';
	row: ComparisonRow[] = [];
}

export class Comparison extends PageSection {
	layout: string = 'table';
	labels: string = 'left';
	collapse: string = 'true';
	verdict: string = '';
	highlighted: string = '';
	rowLabels: string = '[]';
	column: ComparisonColumn[] = [];
}
