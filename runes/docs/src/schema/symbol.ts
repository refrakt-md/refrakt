export class SymbolMember {
	name: string = '';
}

export class SymbolGroup {
	label: string = '';
}

export class Symbol {
	kind: string = 'function';
	lang: string = 'typescript';
	since: string = '';
	deprecated: string = '';
	source: string = '';
}
