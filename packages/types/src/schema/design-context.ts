import { ComponentType } from "../interfaces.js";

export interface DesignTokens {
	fonts?: { role: string; family: string; weights: number[]; category: string }[];
	colors?: { name: string; value: string; group?: string }[];
	spacing?: { unit?: string; scale?: string[] };
	radii?: { name: string; value: string }[];
	shadows?: { name: string; value: string }[];
}

export class DesignContext {
	title: string = '';
	tokens: string = '';
}

export interface DesignContextComponent extends ComponentType<DesignContext> {
	tag: 'section',
	properties: {
		title: 'meta',
		tokens: 'meta',
	},
	refs: {}
}
