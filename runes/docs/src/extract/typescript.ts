import ts from 'typescript';
import { resolve, relative, dirname } from 'node:path';
import { readdirSync, statSync, existsSync } from 'node:fs';
import type {
	SymbolDoc, SymbolKind, SymbolParameter, SymbolReturn, SymbolThrows,
	SymbolGroupDoc, SymbolMemberDoc, SymbolExtractor, ExtractorResult,
} from './types.js';

interface JSDocInfo {
	description: string;
	params: Map<string, string>;
	returns?: string;
	since?: string;
	deprecated?: string;
	throws: string[];
}

function getJSDocDescription(node: ts.Node): string {
	const jsDocs = (node as any).jsDoc as ts.JSDoc[] | undefined;
	if (!jsDocs || jsDocs.length === 0) return '';
	const doc = jsDocs[jsDocs.length - 1];
	if (!doc.comment) return '';
	if (typeof doc.comment === 'string') return doc.comment;
	return doc.comment.map((c: any) => c.text ?? '').join('');
}

function extractJSDoc(node: ts.Node): JSDocInfo {
	const description = getJSDocDescription(node);
	const params = new Map<string, string>();
	let returns: string | undefined;
	let since: string | undefined;
	let deprecated: string | undefined;
	const throws: string[] = [];

	const tags = ts.getJSDocTags(node);
	for (const tag of tags) {
		const tagName = tag.tagName.text;
		const comment = typeof tag.comment === 'string'
			? tag.comment
			: tag.comment?.map((c: any) => c.text ?? '').join('') ?? '';

		switch (tagName) {
			case 'param': {
				const paramTag = tag as ts.JSDocParameterTag;
				const name = paramTag.name?.getText() ?? '';
				if (name) params.set(name, comment);
				break;
			}
			case 'returns':
			case 'return':
				returns = comment;
				break;
			case 'since':
				since = comment.trim();
				break;
			case 'deprecated':
				deprecated = comment.trim() || 'true';
				break;
			case 'throws':
			case 'throw':
				throws.push(comment);
				break;
		}
	}

	return { description, params, returns, since, deprecated, throws };
}

function getLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
	return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function findTsFiles(dir: string): string[] {
	const files: string[] = [];
	const entries = readdirSync(dir);
	for (const entry of entries) {
		if (entry === 'node_modules' || entry.startsWith('.')) continue;
		const fullPath = resolve(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...findTsFiles(fullPath));
		} else if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
			files.push(fullPath);
		}
	}
	return files;
}

export class TypeScriptExtractor implements SymbolExtractor {
	private program: ts.Program;
	private checker: ts.TypeChecker;
	private rootDir: string;
	private sourceUrl?: string;

	constructor(rootDir: string, sourceUrl?: string) {
		this.rootDir = resolve(rootDir);
		this.sourceUrl = sourceUrl;

		const configPath = ts.findConfigFile(this.rootDir, ts.sys.fileExists, 'tsconfig.json');
		if (configPath) {
			const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
			const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));
			this.program = ts.createProgram(parsed.fileNames, parsed.options);
		} else {
			const files = findTsFiles(this.rootDir);
			this.program = ts.createProgram(files, {
				target: ts.ScriptTarget.ESNext,
				module: ts.ModuleKind.NodeNext,
				moduleResolution: ts.ModuleResolutionKind.NodeNext,
			});
		}
		this.checker = this.program.getTypeChecker();
	}

	extractFile(filePath: string): ExtractorResult {
		const absPath = resolve(filePath);
		const sourceFile = this.program.getSourceFile(absPath);
		if (!sourceFile) return { symbols: [], filePath: absPath };

		const fileSymbol = this.checker.getSymbolAtLocation(sourceFile);
		if (!fileSymbol) return { symbols: [], filePath: absPath };

		const exports = this.checker.getExportsOfModule(fileSymbol);
		const symbols: SymbolDoc[] = [];

		for (const exp of exports) {
			const doc = this.extractExport(exp, sourceFile);
			if (doc) symbols.push(doc);
		}

		return { symbols, filePath: absPath };
	}

	private extractExport(symbol: ts.Symbol, sourceFile: ts.SourceFile): SymbolDoc | null {
		// Resolve aliases (re-exports)
		let resolved = symbol;
		if (resolved.flags & ts.SymbolFlags.Alias) {
			resolved = this.checker.getAliasedSymbol(resolved);
		}

		const declarations = resolved.getDeclarations();
		if (!declarations || declarations.length === 0) return null;

		const decl = declarations[0];

		// Skip re-exports from other files
		if (decl.getSourceFile() !== sourceFile) return null;

		const name = symbol.getName();

		if (ts.isFunctionDeclaration(decl)) {
			return this.extractFunction(name, resolved, decl, sourceFile);
		}
		if (ts.isClassDeclaration(decl)) {
			return this.extractClass(name, resolved, decl, sourceFile);
		}
		if (ts.isInterfaceDeclaration(decl)) {
			return this.extractInterface(name, resolved, decl, sourceFile);
		}
		if (ts.isEnumDeclaration(decl)) {
			return this.extractEnum(name, resolved, decl, sourceFile);
		}
		if (ts.isTypeAliasDeclaration(decl)) {
			return this.extractTypeAlias(name, resolved, decl, sourceFile);
		}
		if (ts.isVariableDeclaration(decl)) {
			return this.extractVariable(name, resolved, decl, sourceFile);
		}

		return null;
	}

	private extractFunction(name: string, symbol: ts.Symbol, decl: ts.FunctionDeclaration, sourceFile: ts.SourceFile): SymbolDoc {
		const jsDoc = extractJSDoc(decl);
		const kind: SymbolKind = name.startsWith('use') && /^use[A-Z]/.test(name) ? 'hook' : 'function';
		const type = this.checker.getTypeOfSymbolAtLocation(symbol, decl);
		const signatures = type.getCallSignatures();
		const signature = signatures.length > 0
			? this.checker.signatureToString(signatures[0], decl, ts.TypeFormatFlags.WriteArrowStyleSignature | ts.TypeFormatFlags.NoTruncation)
			: this.checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation);

		const parameters = this.extractParameters(decl.parameters, jsDoc);
		const returns = this.extractReturn(signatures[0], jsDoc);
		const throws = this.extractThrows(jsDoc);

		return {
			name, kind, signature,
			description: jsDoc.description,
			parameters: parameters.length > 0 ? parameters : undefined,
			returns, throws: throws.length > 0 ? throws : undefined,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
			source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
			filePath: sourceFile.fileName,
			line: getLineNumber(decl, sourceFile),
		};
	}

	private extractVariable(name: string, symbol: ts.Symbol, decl: ts.VariableDeclaration, sourceFile: ts.SourceFile): SymbolDoc | null {
		const type = this.checker.getTypeOfSymbolAtLocation(symbol, decl);
		const callSigs = type.getCallSignatures();

		// If the variable is a function (arrow function or function expression)
		if (callSigs.length > 0) {
			// Get JSDoc from the variable statement, not the declaration
			const varStatement = decl.parent?.parent;
			const jsDoc = varStatement ? extractJSDoc(varStatement) : extractJSDoc(decl);
			const kind: SymbolKind = name.startsWith('use') && /^use[A-Z]/.test(name) ? 'hook' : 'function';
			const signature = this.checker.signatureToString(callSigs[0], decl, ts.TypeFormatFlags.WriteArrowStyleSignature | ts.TypeFormatFlags.NoTruncation);

			// Try to get parameters from the initializer if it's an arrow function
			let parameters: SymbolParameter[] = [];
			if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
				parameters = this.extractParameters(decl.initializer.parameters, jsDoc);
			}

			const returns = this.extractReturn(callSigs[0], jsDoc);
			const throws = this.extractThrows(jsDoc);

			return {
				name, kind, signature,
				description: jsDoc.description,
				parameters: parameters.length > 0 ? parameters : undefined,
				returns, throws: throws.length > 0 ? throws : undefined,
				since: jsDoc.since, deprecated: jsDoc.deprecated,
				source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
				filePath: sourceFile.fileName,
				line: getLineNumber(decl, sourceFile),
			};
		}

		// Non-function variable — treat as a constant/value
		const varStatement = decl.parent?.parent;
		const jsDoc = varStatement ? extractJSDoc(varStatement) : extractJSDoc(decl);
		const typeStr = this.checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation);

		return {
			name, kind: 'function', // use 'function' kind for exported constants since there's no 'const' kind
			signature: `const ${name}: ${typeStr}`,
			description: jsDoc.description,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
			source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
			filePath: sourceFile.fileName,
			line: getLineNumber(decl, sourceFile),
		};
	}

	private extractClass(name: string, _symbol: ts.Symbol, decl: ts.ClassDeclaration, sourceFile: ts.SourceFile): SymbolDoc {
		const jsDoc = extractJSDoc(decl);

		// Build class signature
		let signature = `class ${name}`;
		if (decl.heritageClauses) {
			for (const clause of decl.heritageClauses) {
				const keyword = clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements';
				const types = clause.types.map(t => t.getText(sourceFile)).join(', ');
				signature += ` ${keyword} ${types}`;
			}
		}

		const groups = this.extractClassMembers(decl, sourceFile);

		return {
			name, kind: 'class', signature,
			description: jsDoc.description,
			groups: groups.length > 0 ? groups : undefined,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
			source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
			filePath: sourceFile.fileName,
			line: getLineNumber(decl, sourceFile),
		};
	}

	private extractClassMembers(decl: ts.ClassDeclaration, sourceFile: ts.SourceFile): SymbolGroupDoc[] {
		const constructors: SymbolMemberDoc[] = [];
		const properties: SymbolMemberDoc[] = [];
		const methods: SymbolMemberDoc[] = [];
		const staticProperties: SymbolMemberDoc[] = [];
		const staticMethods: SymbolMemberDoc[] = [];
		const accessors: SymbolMemberDoc[] = [];

		for (const member of decl.members) {
			if (this.isPrivateOrProtected(member)) continue;

			const isStatic = this.hasModifier(member, ts.SyntaxKind.StaticKeyword);

			if (ts.isConstructorDeclaration(member)) {
				constructors.push(this.extractMemberDoc(member, 'constructor', sourceFile));
			} else if (ts.isPropertyDeclaration(member)) {
				const doc = this.extractMemberDoc(member, 'property', sourceFile);
				if (isStatic) staticProperties.push(doc);
				else properties.push(doc);
			} else if (ts.isMethodDeclaration(member)) {
				const doc = this.extractMemberDoc(member, 'method', sourceFile);
				if (isStatic) staticMethods.push(doc);
				else methods.push(doc);
			} else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
				accessors.push(this.extractMemberDoc(member, 'accessor', sourceFile));
			}
		}

		const groups: SymbolGroupDoc[] = [];
		if (constructors.length > 0) groups.push({ label: 'Constructor', members: constructors });
		if (properties.length > 0) groups.push({ label: 'Properties', members: properties });
		if (methods.length > 0) groups.push({ label: 'Methods', members: methods });
		if (staticProperties.length > 0) groups.push({ label: 'Static Properties', members: staticProperties });
		if (staticMethods.length > 0) groups.push({ label: 'Static Methods', members: staticMethods });
		if (accessors.length > 0) groups.push({ label: 'Accessors', members: accessors });

		return groups;
	}

	private extractInterface(name: string, _symbol: ts.Symbol, decl: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): SymbolDoc {
		const jsDoc = extractJSDoc(decl);

		let signature = `interface ${name}`;
		if (decl.heritageClauses) {
			for (const clause of decl.heritageClauses) {
				const types = clause.types.map(t => t.getText(sourceFile)).join(', ');
				signature += ` extends ${types}`;
			}
		}
		if (decl.typeParameters && decl.typeParameters.length > 0) {
			const params = decl.typeParameters.map(tp => tp.getText(sourceFile)).join(', ');
			signature = `interface ${name}<${params}>` + signature.slice(`interface ${name}`.length);
		}

		const groups = this.extractInterfaceMembers(decl, sourceFile);

		return {
			name, kind: 'interface', signature,
			description: jsDoc.description,
			groups: groups.length > 0 ? groups : undefined,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
			source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
			filePath: sourceFile.fileName,
			line: getLineNumber(decl, sourceFile),
		};
	}

	private extractInterfaceMembers(decl: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): SymbolGroupDoc[] {
		const properties: SymbolMemberDoc[] = [];
		const methods: SymbolMemberDoc[] = [];
		const indexSignatures: SymbolMemberDoc[] = [];

		for (const member of decl.members) {
			if (ts.isPropertySignature(member)) {
				properties.push(this.extractMemberDoc(member, 'property', sourceFile));
			} else if (ts.isMethodSignature(member)) {
				methods.push(this.extractMemberDoc(member, 'method', sourceFile));
			} else if (ts.isIndexSignatureDeclaration(member)) {
				indexSignatures.push(this.extractMemberDoc(member, 'index-signature', sourceFile));
			}
		}

		const groups: SymbolGroupDoc[] = [];
		if (properties.length > 0) groups.push({ label: 'Properties', members: properties });
		if (methods.length > 0) groups.push({ label: 'Methods', members: methods });
		if (indexSignatures.length > 0) groups.push({ label: 'Index Signatures', members: indexSignatures });

		return groups;
	}

	private extractEnum(name: string, _symbol: ts.Symbol, decl: ts.EnumDeclaration, sourceFile: ts.SourceFile): SymbolDoc {
		const jsDoc = extractJSDoc(decl);

		const parameters: SymbolParameter[] = [];
		for (const member of decl.members) {
			const memberName = member.name.getText(sourceFile);
			const memberJsDoc = extractJSDoc(member);
			let value = '';
			if (member.initializer) {
				value = member.initializer.getText(sourceFile);
			} else {
				// Computed enum value
				const memberSymbol = this.checker.getSymbolAtLocation(member.name);
				if (memberSymbol) {
					const constantValue = this.checker.getConstantValue(member);
					if (constantValue !== undefined) {
						value = typeof constantValue === 'string' ? `"${constantValue}"` : String(constantValue);
					}
				}
			}

			parameters.push({
				name: memberName,
				type: value,
				description: memberJsDoc.description,
				optional: false,
			});
		}

		return {
			name, kind: 'enum',
			signature: `enum ${name}`,
			description: jsDoc.description,
			parameters: parameters.length > 0 ? parameters : undefined,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
			source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
			filePath: sourceFile.fileName,
			line: getLineNumber(decl, sourceFile),
		};
	}

	private extractTypeAlias(name: string, _symbol: ts.Symbol, decl: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): SymbolDoc {
		const jsDoc = extractJSDoc(decl);
		const typeNode = decl.type;
		const typeText = typeNode.getText(sourceFile);
		let signature = `type ${name}`;
		if (decl.typeParameters && decl.typeParameters.length > 0) {
			const params = decl.typeParameters.map(tp => tp.getText(sourceFile)).join(', ');
			signature += `<${params}>`;
		}
		signature += ` = ${typeText}`;

		return {
			name, kind: 'type', signature,
			description: jsDoc.description,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
			source: this.buildSourceUrl(sourceFile.fileName, getLineNumber(decl, sourceFile)),
			filePath: sourceFile.fileName,
			line: getLineNumber(decl, sourceFile),
		};
	}

	private extractMemberDoc(
		member: ts.ClassElement | ts.TypeElement,
		kind: SymbolMemberDoc['kind'],
		sourceFile: ts.SourceFile,
	): SymbolMemberDoc {
		const jsDoc = extractJSDoc(member);
		let name = '';
		let signature = '';
		let parameters: SymbolParameter[] | undefined;
		let returns: SymbolReturn | undefined;
		let throws: SymbolThrows[] | undefined;

		if (ts.isConstructorDeclaration(member)) {
			name = 'constructor';
			const paramTexts = member.parameters.map(p => p.getText(sourceFile)).join(', ');
			signature = `new (${paramTexts})`;
			parameters = this.extractParameters(member.parameters, jsDoc);
		} else if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
			name = member.name?.getText(sourceFile) ?? '';
			const memberSymbol = member.name ? this.checker.getSymbolAtLocation(member.name) : undefined;
			if (memberSymbol) {
				const type = this.checker.getTypeOfSymbolAtLocation(memberSymbol, member);
				const callSigs = type.getCallSignatures();
				if (callSigs.length > 0) {
					signature = `${name}${this.checker.signatureToString(callSigs[0], member, ts.TypeFormatFlags.NoTruncation)}`;
				} else {
					signature = member.getText(sourceFile);
				}
			} else {
				signature = member.getText(sourceFile);
			}
			if ('parameters' in member) {
				parameters = this.extractParameters(member.parameters, jsDoc);
			}
			const memberSymbol2 = member.name ? this.checker.getSymbolAtLocation(member.name) : undefined;
			if (memberSymbol2) {
				const type = this.checker.getTypeOfSymbolAtLocation(memberSymbol2, member);
				const callSigs = type.getCallSignatures();
				if (callSigs.length > 0) {
					returns = this.extractReturn(callSigs[0], jsDoc);
				}
			}
			const throwsDocs = this.extractThrows(jsDoc);
			if (throwsDocs.length > 0) throws = throwsDocs;
		} else if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
			name = member.name?.getText(sourceFile) ?? '';
			const memberSymbol = member.name ? this.checker.getSymbolAtLocation(member.name) : undefined;
			if (memberSymbol) {
				const type = this.checker.getTypeOfSymbolAtLocation(memberSymbol, member);
				const typeStr = this.checker.typeToString(type, member, ts.TypeFormatFlags.NoTruncation);
				const optional = member.questionToken ? '?' : '';
				signature = `${name}${optional}: ${typeStr}`;
			} else {
				signature = member.getText(sourceFile);
			}
		} else if (ts.isGetAccessorDeclaration(member)) {
			name = member.name?.getText(sourceFile) ?? '';
			const memberSymbol = member.name ? this.checker.getSymbolAtLocation(member.name) : undefined;
			if (memberSymbol) {
				const type = this.checker.getTypeOfSymbolAtLocation(memberSymbol, member);
				const typeStr = this.checker.typeToString(type, member, ts.TypeFormatFlags.NoTruncation);
				signature = `get ${name}(): ${typeStr}`;
			} else {
				signature = member.getText(sourceFile);
			}
		} else if (ts.isSetAccessorDeclaration(member)) {
			name = member.name?.getText(sourceFile) ?? '';
			signature = member.getText(sourceFile);
		} else if (ts.isIndexSignatureDeclaration(member)) {
			name = '[index]';
			signature = member.getText(sourceFile);
		}

		return {
			name, kind, signature,
			description: jsDoc.description,
			parameters: parameters && parameters.length > 0 ? parameters : undefined,
			returns, throws,
			since: jsDoc.since, deprecated: jsDoc.deprecated,
		};
	}

	private extractParameters(params: ts.NodeArray<ts.ParameterDeclaration>, jsDoc: JSDocInfo): SymbolParameter[] {
		return params.map(param => {
			const name = param.name.getText();
			const paramSymbol = this.checker.getSymbolAtLocation(param.name);
			let type = 'unknown';
			if (paramSymbol) {
				const paramType = this.checker.getTypeOfSymbolAtLocation(paramSymbol, param);
				type = this.checker.typeToString(paramType, param, ts.TypeFormatFlags.NoTruncation);
			} else if (param.type) {
				type = param.type.getText();
			}

			const optional = !!param.questionToken || !!param.initializer;
			let defaultValue: string | undefined;
			if (param.initializer) {
				defaultValue = param.initializer.getText();
			}

			const description = jsDoc.params.get(name) ?? '';

			// Check for destructured object parameters with documented children
			let children: SymbolParameter[] | undefined;
			if (ts.isObjectBindingPattern(param.name)) {
				children = param.name.elements.map(element => {
					const childName = element.name.getText();
					const childDesc = jsDoc.params.get(`${name}.${childName}`) ?? jsDoc.params.get(childName) ?? '';
					const childSymbol = this.checker.getSymbolAtLocation(element.name);
					let childType = 'unknown';
					if (childSymbol) {
						const ct = this.checker.getTypeOfSymbolAtLocation(childSymbol, element);
						childType = this.checker.typeToString(ct, element, ts.TypeFormatFlags.NoTruncation);
					}
					return {
						name: childName,
						type: childType,
						description: childDesc,
						optional: !!element.dotDotDotToken || !!element.initializer,
						defaultValue: element.initializer?.getText(),
					};
				});
			}

			return { name, type, description, optional, defaultValue, children };
		});
	}

	private extractReturn(signature: ts.Signature | undefined, jsDoc: JSDocInfo): SymbolReturn | undefined {
		if (!signature) return undefined;
		const returnType = this.checker.getReturnTypeOfSignature(signature);
		const typeStr = this.checker.typeToString(returnType, undefined, ts.TypeFormatFlags.NoTruncation);
		if (typeStr === 'void' && !jsDoc.returns) return undefined;
		return {
			type: typeStr,
			description: jsDoc.returns ?? '',
		};
	}

	private extractThrows(jsDoc: JSDocInfo): SymbolThrows[] {
		return jsDoc.throws.map(text => {
			// Parse "ErrorType description" or just "description"
			const match = text.match(/^(\w+)\s+(.*)/);
			if (match) {
				return { type: match[1], description: match[2] };
			}
			return { type: 'Error', description: text };
		});
	}

	private isPrivateOrProtected(member: ts.ClassElement): boolean {
		const flags = ts.getCombinedModifierFlags(member as ts.Declaration);
		return !!(flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected));
	}

	private hasModifier(member: ts.ClassElement | ts.TypeElement, kind: ts.SyntaxKind): boolean {
		// Use canHaveModifiers + getModifiers for TS 5.x compatibility
		const node = member as ts.Node;
		if (!ts.canHaveModifiers(node)) return false;
		const modifiers = ts.getModifiers(node);
		return modifiers?.some((m: ts.Modifier) => m.kind === kind) ?? false;
	}

	private buildSourceUrl(filePath: string, line: number): string | undefined {
		if (!this.sourceUrl) return undefined;
		const rel = relative(this.rootDir, filePath).replace(/\\/g, '/');
		return `${this.sourceUrl.replace(/\/$/, '')}/${rel}#L${line}`;
	}
}

/** Find all TypeScript source files in a directory */
export function findSourceFiles(dir: string): string[] {
	const absDir = resolve(dir);
	if (!existsSync(absDir)) return [];
	const stat = statSync(absDir);
	if (!stat.isDirectory()) {
		return /\.tsx?$/.test(absDir) ? [absDir] : [];
	}
	return findTsFiles(absDir);
}
