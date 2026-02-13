import { ComponentType, PropertyNodes } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class ComparisonRow {
	label: string = '';
	rowType: string = 'text';
}

export interface ComparisonRowComponent extends ComponentType<ComparisonRow> {
	tag: 'div',
	properties: {
		label: 'span',
		rowType: 'meta',
	},
	refs: {
		body: 'div',
	}
}

export class ComparisonColumn {
	name: string = '';
	highlighted: string = 'false';
	row: ComparisonRow[] = [];
}

export interface ComparisonColumnComponent extends ComponentType<ComparisonColumn> {
	tag: 'div',
	properties: {
		name: 'span',
		highlighted: 'meta',
		row: 'div',
	},
	refs: {
		body: 'div',
	}
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

export interface ComparisonProperties extends PageSectionProperties {
	column: 'div',
}

export interface ComparisonComponent extends ComponentType<Comparison> {
	tag: 'section',
	properties: ComparisonProperties & {
		layout: 'meta',
		labels: 'meta',
		collapse: 'meta',
		verdict: 'meta',
		highlighted: 'meta',
		rowLabels: 'meta',
	},
	refs: {
		grid: 'div',
	}
}
