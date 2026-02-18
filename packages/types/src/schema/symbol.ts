import { ComponentType } from "../interfaces.js";

export class SymbolMember {
	name: string = '';
}

export interface SymbolMemberComponent extends ComponentType<SymbolMember> {
	tag: 'section',
	properties: {
		name: 'h4',
	},
	refs: {
		body: 'div',
	}
}

export class SymbolGroup {
	label: string = '';
}

export interface SymbolGroupComponent extends ComponentType<SymbolGroup> {
	tag: 'section',
	properties: {
		label: 'h3',
	},
	refs: {
		body: 'div',
	}
}

export class Symbol {
	kind: string = 'function';
	lang: string = 'typescript';
	since: string = '';
	deprecated: string = '';
	source: string = '';
}

export interface SymbolComponent extends ComponentType<Symbol> {
	tag: 'article',
	properties: {
		kind: 'meta',
		lang: 'meta',
		since: 'meta',
		deprecated: 'meta',
		source: 'meta',
	},
	refs: {
		body: 'div',
	}
}
