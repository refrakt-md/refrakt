import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import type {
	SymbolDoc, SymbolKind, SymbolParameter, SymbolReturn, SymbolThrows,
	SymbolGroupDoc, SymbolMemberDoc, SymbolExtractor, ExtractorResult,
} from './types.js';
import { parseDocstring } from './python-docstring.js';

// Lightweight type definitions matching web-tree-sitter's runtime API.
// We use our own types because the package's TS declarations don't expose
// a default export, even though `import('web-tree-sitter').default` is the
// Parser class at runtime.

interface SyntaxNode {
	type: string;
	text: string;
	startPosition: { row: number; column: number };
	childCount: number;
	children: SyntaxNode[];
	namedChildren: SyntaxNode[];
	childForFieldName(name: string): SyntaxNode | null;
	descendantsOfType(types: string | string[]): SyntaxNode[];
	parent: SyntaxNode | null;
}

interface TSParser {
	setLanguage(lang: unknown): void;
	parse(input: string): { rootNode: SyntaxNode } | null;
	delete(): void;
}

interface TSParserClass {
	init(): Promise<void>;
	Language: { load(path: string): Promise<unknown> };
	new(): TSParser;
}

// ── Enum / interface base classes ────────────────────────────────────

const ENUM_BASES = new Set(['Enum', 'IntEnum', 'StrEnum', 'Flag', 'IntFlag']);
const INTERFACE_BASES = new Set(['Protocol', 'ABC', 'ABCMeta']);

// ── Helpers ──────────────────────────────────────────────────────────

function getDocstring(node: SyntaxNode): string {
	// The docstring is the first expression_statement > string in the body
	const body = node.childForFieldName('body');
	if (!body) return '';

	for (const child of body.children) {
		if (child.type === 'expression_statement') {
			const strNode = child.children[0];
			if (strNode && strNode.type === 'string') {
				return stripQuotes(strNode.text);
			}
			// concatenated_string is also possible but rare
			if (strNode && strNode.type === 'concatenated_string') {
				return strNode.children
					.filter(c => c.type === 'string')
					.map(c => stripQuotes(c.text))
					.join('');
			}
			break; // first statement isn't a docstring
		}
		// Skip comments, pass statements
		if (child.type === 'comment' || child.type === 'pass_statement') continue;
		break;
	}
	return '';
}

function stripQuotes(raw: string): string {
	// Triple-quoted strings
	for (const q of ['"""', "'''"]) {
		for (const prefix of ['', 'r', 'u', 'b', 'f', 'rb', 'br', 'fr', 'rf']) {
			const start = prefix + q;
			if (raw.startsWith(start) && raw.endsWith(q)) {
				return raw.slice(start.length, -q.length);
			}
		}
	}
	// Single-quoted
	for (const q of ['"', "'"]) {
		for (const prefix of ['', 'r', 'u', 'b', 'f', 'rb', 'br', 'fr', 'rf']) {
			const start = prefix + q;
			if (raw.startsWith(start) && raw.endsWith(q)) {
				return raw.slice(start.length, -q.length);
			}
		}
	}
	return raw;
}

function getDecorators(node: SyntaxNode): string[] {
	// Decorators appear as siblings before the function/class in a decorated_definition
	const parent = node.parent;
	if (!parent || parent.type !== 'decorated_definition') return [];
	const decorators: string[] = [];
	for (const child of parent.children) {
		if (child.type === 'decorator') {
			// Decorator text includes the @
			decorators.push(child.text.trim());
		}
	}
	return decorators;
}

function hasDecorator(node: SyntaxNode, name: string): boolean {
	return getDecorators(node).some(d => d === `@${name}` || d.startsWith(`@${name}(`));
}

function getBaseClasses(node: SyntaxNode): string[] {
	const argList = node.childForFieldName('superclasses');
	if (!argList) return [];
	const bases: string[] = [];
	for (const child of argList.namedChildren) {
		if (child.type === 'identifier' || child.type === 'attribute') {
			bases.push(child.text);
		}
	}
	return bases;
}

function classifyClass(node: SyntaxNode): SymbolKind {
	const bases = getBaseClasses(node);
	// Check direct base names (last segment of dotted names)
	for (const base of bases) {
		const name = base.includes('.') ? base.split('.').pop()! : base;
		if (ENUM_BASES.has(name)) return 'enum';
		if (INTERFACE_BASES.has(name)) return 'interface';
	}
	return 'class';
}

// ── Parameter extraction ─────────────────────────────────────────────

function extractParams(paramsNode: SyntaxNode, skipSelfCls: boolean): SymbolParameter[] {
	if (!paramsNode) return [];
	const params: SymbolParameter[] = [];

	for (const child of paramsNode.namedChildren) {
		const param = extractSingleParam(child, skipSelfCls);
		if (param) params.push(param);
	}

	return params;
}

function extractSingleParam(node: SyntaxNode, skipSelfCls: boolean): SymbolParameter | null {
	switch (node.type) {
		case 'identifier': {
			const name = node.text;
			if (skipSelfCls && (name === 'self' || name === 'cls')) return null;
			return { name, type: 'Any', description: '', optional: false };
		}
		case 'typed_parameter': {
			const nameNode = node.children.find(c =>
				c.type === 'identifier' || c.type === 'list_splat_pattern' || c.type === 'dictionary_splat_pattern'
			);
			const typeNode = node.childForFieldName('type');
			if (!nameNode) return null;
			let name = nameNode.text;
			let prefix = '';
			if (nameNode.type === 'list_splat_pattern') {
				prefix = '*';
				name = nameNode.children.find(c => c.type === 'identifier')?.text ?? name;
			} else if (nameNode.type === 'dictionary_splat_pattern') {
				prefix = '**';
				name = nameNode.children.find(c => c.type === 'identifier')?.text ?? name;
			}
			if (skipSelfCls && !prefix && (name === 'self' || name === 'cls')) return null;
			return {
				name: prefix + name,
				type: typeNode?.text ?? 'Any',
				description: '',
				optional: false,
			};
		}
		case 'default_parameter': {
			const nameNode = node.childForFieldName('name');
			const valueNode = node.childForFieldName('value');
			if (!nameNode) return null;
			const name = nameNode.text;
			if (skipSelfCls && (name === 'self' || name === 'cls')) return null;
			return {
				name,
				type: 'Any',
				description: '',
				optional: true,
				defaultValue: valueNode?.text,
			};
		}
		case 'typed_default_parameter': {
			const nameNode = node.childForFieldName('name');
			const typeNode = node.childForFieldName('type');
			const valueNode = node.childForFieldName('value');
			if (!nameNode) return null;
			const name = nameNode.text;
			if (skipSelfCls && (name === 'self' || name === 'cls')) return null;
			return {
				name,
				type: typeNode?.text ?? 'Any',
				description: '',
				optional: true,
				defaultValue: valueNode?.text,
			};
		}
		case 'list_splat_pattern': {
			const inner = node.children.find(c => c.type === 'identifier');
			const name = inner?.text ?? node.text.replace(/^\*/, '');
			return { name: `*${name}`, type: 'Any', description: '', optional: true };
		}
		case 'dictionary_splat_pattern': {
			const inner = node.children.find(c => c.type === 'identifier');
			const name = inner?.text ?? node.text.replace(/^\*\*/, '');
			return { name: `**${name}`, type: 'Any', description: '', optional: true };
		}
		case 'tuple_pattern': {
			// Tuple unpacking in params — rare, skip
			return null;
		}
		default:
			return null;
	}
}

// ── Signature reconstruction ─────────────────────────────────────────

function buildFunctionSignature(node: SyntaxNode, decorators: string[]): string {
	const lines: string[] = [];
	for (const dec of decorators) {
		lines.push(dec);
	}

	const name = node.childForFieldName('name')?.text ?? '?';
	const paramsNode = node.childForFieldName('parameters');
	const returnType = node.childForFieldName('return_type');

	let sig = `def ${name}(`;
	if (paramsNode) {
		// Reconstruct params text, but simplified
		const paramTexts: string[] = [];
		for (const child of paramsNode.namedChildren) {
			paramTexts.push(child.text);
		}
		sig += paramTexts.join(', ');
	}
	sig += ')';
	if (returnType) {
		sig += ` -> ${returnType.text}`;
	}
	sig += ':';

	lines.push(sig);
	return lines.join('\n');
}

function buildClassSignature(node: SyntaxNode, decorators: string[]): string {
	const lines: string[] = [];
	for (const dec of decorators) {
		lines.push(dec);
	}

	const name = node.childForFieldName('name')?.text ?? '?';
	const bases = getBaseClasses(node);
	let sig = `class ${name}`;
	if (bases.length > 0) {
		sig += `(${bases.join(', ')})`;
	}
	sig += ':';
	lines.push(sig);
	return lines.join('\n');
}

// ── Main extractor ───────────────────────────────────────────────────

export class PythonExtractor implements SymbolExtractor {
	private rootDir: string;
	private sourceUrl?: string;
	private parser!: TSParser;
	private initialized = false;

	constructor(rootDir: string, sourceUrl?: string) {
		this.rootDir = resolve(rootDir);
		this.sourceUrl = sourceUrl;
	}

	async init(): Promise<void> {
		if (this.initialized) return;

		const require = createRequire(import.meta.url);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const Parser = (await import('web-tree-sitter') as any).default as TSParserClass;

		await Parser.init();

		const wasmPath = require.resolve('tree-sitter-wasms/out/tree-sitter-python.wasm');
		const Python = await Parser.Language.load(wasmPath);

		this.parser = new Parser();
		this.parser.setLanguage(Python);
		this.initialized = true;
	}

	extractFile(filePath: string): ExtractorResult {
		if (!this.initialized) {
			throw new Error('PythonExtractor.init() must be called before extractFile()');
		}

		const absPath = resolve(filePath);
		const source = readFileSync(absPath, 'utf-8');
		const tree = this.parser.parse(source);
		if (!tree) return { symbols: [], filePath: absPath };
		const root = tree.rootNode;

		// Determine exports
		const allExports = this.extractAllList(root);
		const symbols: SymbolDoc[] = [];

		// Walk top-level statements
		for (const child of root.children) {
			const node = child.type === 'decorated_definition'
				? child.namedChildren.find(c => c.type === 'function_definition' || c.type === 'class_definition')
				: child;

			if (!node) continue;

			if (node.type === 'function_definition') {
				const name = node.childForFieldName('name')?.text;
				if (!name) continue;
				if (!this.isExported(name, allExports)) continue;

				symbols.push(this.extractFunction(node, absPath));
			} else if (node.type === 'class_definition') {
				const name = node.childForFieldName('name')?.text;
				if (!name) continue;
				if (!this.isExported(name, allExports)) continue;

				symbols.push(this.extractClass(node, absPath));
			}
		}

		return { symbols, filePath: absPath };
	}

	// ── Export resolution ────────────────────────────────────────

	private extractAllList(root: SyntaxNode): Set<string> | null {
		for (const child of root.children) {
			if (child.type !== 'expression_statement') continue;
			const expr = child.children[0];
			if (!expr || expr.type !== 'assignment') continue;

			const left = expr.childForFieldName('left');
			if (!left || left.type !== 'identifier' || left.text !== '__all__') continue;

			const right = expr.childForFieldName('right');
			if (!right || right.type !== 'list') continue;

			const names = new Set<string>();
			for (const elem of right.namedChildren) {
				if (elem.type === 'string') {
					names.add(stripQuotes(elem.text));
				}
			}
			return names;
		}
		return null;
	}

	private isExported(name: string, allExports: Set<string> | null): boolean {
		if (allExports) return allExports.has(name);
		return !name.startsWith('_');
	}

	// ── Function extraction ─────────────────────────────────────

	private extractFunction(node: SyntaxNode, filePath: string): SymbolDoc {
		const name = node.childForFieldName('name')!.text;
		const decorators = getDecorators(node);
		const rawDocstring = getDocstring(node);
		const docInfo = rawDocstring ? parseDocstring(rawDocstring) : null;

		const paramsNode = node.childForFieldName('parameters');
		let parameters = paramsNode ? extractParams(paramsNode, false) : [];

		// Enrich params from docstring
		if (docInfo) {
			parameters = this.mergeParamDocs(parameters, docInfo.params);
		}

		const signature = buildFunctionSignature(node, decorators);

		let returns: SymbolReturn | undefined;
		const returnType = node.childForFieldName('return_type');
		if (docInfo?.returns) {
			returns = {
				type: returnType?.text ?? docInfo.returns.type,
				description: docInfo.returns.description,
			};
		} else if (returnType) {
			returns = { type: returnType.text, description: '' };
		}

		let throws: SymbolThrows[] | undefined;
		if (docInfo?.raises && docInfo.raises.length > 0) {
			throws = docInfo.raises;
		}

		const line = node.startPosition.row + 1;

		return {
			name,
			kind: 'function',
			signature,
			description: docInfo?.description ?? '',
			parameters: parameters.length > 0 ? parameters : undefined,
			returns: returns?.type === 'None' && !returns.description ? undefined : returns,
			throws,
			since: docInfo?.since,
			deprecated: docInfo?.deprecated,
			source: this.buildSourceUrl(filePath, line),
			filePath,
			line,
		};
	}

	// ── Class extraction ────────────────────────────────────────

	private extractClass(node: SyntaxNode, filePath: string): SymbolDoc {
		const name = node.childForFieldName('name')!.text;
		const decorators = getDecorators(node);
		const rawDocstring = getDocstring(node);
		const docInfo = rawDocstring ? parseDocstring(rawDocstring) : null;

		const kind = classifyClass(node);
		const signature = buildClassSignature(node, decorators);
		const line = node.startPosition.row + 1;

		// For enum classes, extract members as parameters
		if (kind === 'enum') {
			const parameters = this.extractEnumMembers(node);
			return {
				name, kind, signature,
				description: docInfo?.description ?? '',
				parameters: parameters.length > 0 ? parameters : undefined,
				since: docInfo?.since,
				deprecated: docInfo?.deprecated,
				source: this.buildSourceUrl(filePath, line),
				filePath, line,
			};
		}

		const groups = this.extractClassMembers(node, filePath);

		return {
			name, kind, signature,
			description: docInfo?.description ?? '',
			groups: groups.length > 0 ? groups : undefined,
			since: docInfo?.since,
			deprecated: docInfo?.deprecated,
			source: this.buildSourceUrl(filePath, line),
			filePath, line,
		};
	}

	private extractEnumMembers(classNode: SyntaxNode): SymbolParameter[] {
		const body = classNode.childForFieldName('body');
		if (!body) return [];

		const members: SymbolParameter[] = [];
		for (const child of body.children) {
			if (child.type !== 'expression_statement') continue;
			const expr = child.children[0];
			if (!expr || expr.type !== 'assignment') continue;

			const left = expr.childForFieldName('left');
			const right = expr.childForFieldName('right');
			if (!left || left.type !== 'identifier') continue;

			const name = left.text;
			if (name.startsWith('_')) continue;

			members.push({
				name,
				type: right?.text ?? '',
				description: '',
				optional: false,
			});
		}
		return members;
	}

	private extractClassMembers(classNode: SyntaxNode, filePath: string): SymbolGroupDoc[] {
		const body = classNode.childForFieldName('body');
		if (!body) return [];

		const constructors: SymbolMemberDoc[] = [];
		const properties: SymbolMemberDoc[] = [];
		const methods: SymbolMemberDoc[] = [];
		const staticMethods: SymbolMemberDoc[] = [];
		const classMethods: SymbolMemberDoc[] = [];

		for (const child of body.children) {
			const funcNode = child.type === 'decorated_definition'
				? child.namedChildren.find(c => c.type === 'function_definition')
				: child.type === 'function_definition' ? child : null;

			if (!funcNode) continue;

			const name = funcNode.childForFieldName('name')?.text;
			if (!name) continue;

			// Skip private methods (except __init__)
			if (name !== '__init__' && name.startsWith('_')) continue;

			if (name === '__init__') {
				constructors.push(this.extractMethodMember(funcNode, 'constructor'));
			} else if (hasDecorator(funcNode, 'property')) {
				properties.push(this.extractPropertyMember(funcNode));
			} else if (hasDecorator(funcNode, 'staticmethod')) {
				staticMethods.push(this.extractMethodMember(funcNode, 'method'));
			} else if (hasDecorator(funcNode, 'classmethod')) {
				classMethods.push(this.extractMethodMember(funcNode, 'method'));
			} else {
				methods.push(this.extractMethodMember(funcNode, 'method'));
			}
		}

		const groups: SymbolGroupDoc[] = [];
		if (constructors.length > 0) groups.push({ label: 'Constructor', members: constructors });
		if (properties.length > 0) groups.push({ label: 'Properties', members: properties });
		if (methods.length > 0) groups.push({ label: 'Methods', members: methods });
		if (staticMethods.length > 0) groups.push({ label: 'Static Methods', members: staticMethods });
		if (classMethods.length > 0) groups.push({ label: 'Class Methods', members: classMethods });

		return groups;
	}

	private extractMethodMember(node: SyntaxNode, kind: SymbolMemberDoc['kind']): SymbolMemberDoc {
		const name = node.childForFieldName('name')!.text;
		const decorators = getDecorators(node);
		const rawDocstring = getDocstring(node);
		const docInfo = rawDocstring ? parseDocstring(rawDocstring) : null;

		const isConstructor = name === '__init__';
		const isStatic = hasDecorator(node, 'staticmethod');
		const skipSelfCls = !isStatic; // skip self/cls unless it's a static method

		const paramsNode = node.childForFieldName('parameters');
		let parameters = paramsNode ? extractParams(paramsNode, skipSelfCls) : [];

		if (docInfo) {
			parameters = this.mergeParamDocs(parameters, docInfo.params);
		}

		const signature = buildFunctionSignature(node, decorators);

		let returns: SymbolReturn | undefined;
		const returnType = node.childForFieldName('return_type');
		if (!isConstructor) {
			if (docInfo?.returns) {
				returns = {
					type: returnType?.text ?? docInfo.returns.type,
					description: docInfo.returns.description,
				};
			} else if (returnType && returnType.text !== 'None') {
				returns = { type: returnType.text, description: '' };
			}
		}

		let throws: SymbolThrows[] | undefined;
		if (docInfo?.raises && docInfo.raises.length > 0) {
			throws = docInfo.raises;
		}

		return {
			name: isConstructor ? 'constructor' : name,
			kind,
			signature,
			description: docInfo?.description ?? '',
			parameters: parameters.length > 0 ? parameters : undefined,
			returns,
			throws,
			since: docInfo?.since,
			deprecated: docInfo?.deprecated,
		};
	}

	private extractPropertyMember(node: SyntaxNode): SymbolMemberDoc {
		const name = node.childForFieldName('name')!.text;
		const rawDocstring = getDocstring(node);
		const docInfo = rawDocstring ? parseDocstring(rawDocstring) : null;

		const returnType = node.childForFieldName('return_type');
		const typeStr = returnType?.text ?? 'Any';
		const signature = `${name}: ${typeStr}`;

		return {
			name,
			kind: 'property',
			signature,
			description: docInfo?.description ?? '',
			since: docInfo?.since,
			deprecated: docInfo?.deprecated,
		};
	}

	// ── Docstring merging ───────────────────────────────────────

	private mergeParamDocs(
		params: SymbolParameter[],
		docParams: Map<string, { type: string; description: string }>,
	): SymbolParameter[] {
		return params.map(p => {
			const cleanName = p.name.replace(/^\*{1,2}/, '');
			const docParam = docParams.get(cleanName);
			if (!docParam) return p;
			return {
				...p,
				type: p.type === 'Any' && docParam.type !== 'Any' ? docParam.type : p.type,
				description: docParam.description || p.description,
			};
		});
	}

	// ── Source URL ───────────────────────────────────────────────

	private buildSourceUrl(filePath: string, line: number): string | undefined {
		if (!this.sourceUrl) return undefined;
		const rel = relative(this.rootDir, filePath).replace(/\\/g, '/');
		return `${this.sourceUrl.replace(/\/$/, '')}/${rel}#L${line}`;
	}
}
