export type SymbolKind = 'function' | 'class' | 'interface' | 'enum' | 'type' | 'module' | 'hook' | 'component';

export interface SymbolParameter {
	name: string;
	type: string;
	description: string;
	optional: boolean;
	defaultValue?: string;
	children?: SymbolParameter[];
}

export interface SymbolReturn {
	type: string;
	description: string;
}

export interface SymbolThrows {
	type: string;
	description: string;
}

export interface SymbolMemberDoc {
	name: string;
	kind: 'property' | 'method' | 'constructor' | 'accessor' | 'index-signature';
	signature: string;
	description: string;
	parameters?: SymbolParameter[];
	returns?: SymbolReturn;
	throws?: SymbolThrows[];
	since?: string;
	deprecated?: string;
}

export interface SymbolGroupDoc {
	label: string;
	members: SymbolMemberDoc[];
}

export interface SymbolDoc {
	name: string;
	kind: SymbolKind;
	signature: string;
	description: string;
	parameters?: SymbolParameter[];
	returns?: SymbolReturn;
	throws?: SymbolThrows[];
	since?: string;
	deprecated?: string;
	source?: string;
	groups?: SymbolGroupDoc[];
	filePath: string;
	line: number;
}

export interface ExtractorResult {
	symbols: SymbolDoc[];
	filePath: string;
}

export interface SymbolExtractor {
	extractFile(filePath: string): ExtractorResult;
}
