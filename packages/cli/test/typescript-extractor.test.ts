import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { TypeScriptExtractor } from '../src/extractors/typescript.js';
import type { SymbolDoc } from '../src/extractors/types.js';

const fixturesDir = resolve(import.meta.dirname, 'fixtures');

describe('TypeScriptExtractor', () => {
	let extractor: TypeScriptExtractor;

	beforeAll(() => {
		extractor = new TypeScriptExtractor(fixturesDir);
	});

	describe('function extraction', () => {
		let symbols: SymbolDoc[];

		beforeAll(() => {
			const result = extractor.extractFile(resolve(fixturesDir, 'functions.ts'));
			symbols = result.symbols;
		});

		it('extracts exported functions', () => {
			const names = symbols.map(s => s.name);
			expect(names).toContain('renderContent');
			expect(names).toContain('noop');
			expect(names).toContain('legacyRender');
			expect(names).toContain('createParser');
		});

		it('extracts function kind', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			expect(fn.kind).toBe('function');
		});

		it('extracts JSDoc description', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			expect(fn.description).toContain('Renders content from a source string');
		});

		it('extracts @since', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			expect(fn.since).toBe('1.0.0');
		});

		it('extracts @deprecated', () => {
			const fn = symbols.find(s => s.name === 'legacyRender')!;
			expect(fn.deprecated).toBe('2.0.0');
		});

		it('extracts parameters with JSDoc descriptions', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			expect(fn.parameters).toBeDefined();
			const source = fn.parameters!.find(p => p.name === 'source');
			expect(source).toBeDefined();
			expect(source!.type).toBe('string');
			expect(source!.description).toContain('Raw Markdoc content');
		});

		it('extracts optional parameters', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			const options = fn.parameters!.find(p => p.name === 'options');
			expect(options).toBeDefined();
			expect(options!.optional).toBe(true);
		});

		it('extracts return type', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			expect(fn.returns).toBeDefined();
			expect(fn.returns!.type).toBe('RenderTree');
			expect(fn.returns!.description).toContain('rendered tree');
		});

		it('extracts @throws', () => {
			const fn = symbols.find(s => s.name === 'renderContent')!;
			expect(fn.throws).toBeDefined();
			expect(fn.throws!.length).toBeGreaterThan(0);
			expect(fn.throws![0].type).toBe('ParseError');
		});

		it('extracts arrow function exports', () => {
			const fn = symbols.find(s => s.name === 'createParser')!;
			expect(fn).toBeDefined();
			expect(fn.kind).toBe('function');
			expect(fn.signature).toContain('=>');
		});

		it('detects hooks from name pattern', () => {
			const fn = symbols.find(s => s.name === 'useCounter')!;
			expect(fn).toBeDefined();
			expect(fn.kind).toBe('hook');
		});

		it('skips non-exported declarations', () => {
			const names = symbols.map(s => s.name);
			expect(names).not.toContain('RenderOptions');
			expect(names).not.toContain('Parser');
		});

		it('extracts line numbers', () => {
			for (const sym of symbols) {
				expect(sym.line).toBeGreaterThan(0);
			}
		});
	});

	describe('class extraction', () => {
		let symbols: SymbolDoc[];

		beforeAll(() => {
			const result = extractor.extractFile(resolve(fixturesDir, 'classes.ts'));
			symbols = result.symbols;
		});

		it('extracts class kind', () => {
			const cls = symbols.find(s => s.name === 'ContentParser')!;
			expect(cls.kind).toBe('class');
		});

		it('extracts class heritage', () => {
			const cls = symbols.find(s => s.name === 'ContentParser')!;
			expect(cls.signature).toContain('extends EventTarget');
		});

		it('extracts member groups', () => {
			const cls = symbols.find(s => s.name === 'ContentParser')!;
			expect(cls.groups).toBeDefined();
			const labels = cls.groups!.map(g => g.label);
			expect(labels).toContain('Constructor');
			expect(labels).toContain('Properties');
			expect(labels).toContain('Methods');
		});

		it('skips private and protected members', () => {
			const cls = symbols.find(s => s.name === 'ContentParser')!;
			const allMembers = cls.groups!.flatMap(g => g.members);
			const names = allMembers.map(m => m.name);
			expect(names).not.toContain('_cache');
			expect(names).not.toContain('reset');
		});

		it('extracts static methods', () => {
			const cls = symbols.find(s => s.name === 'ContentParser')!;
			const staticGroup = cls.groups!.find(g => g.label === 'Static Methods');
			expect(staticGroup).toBeDefined();
			const names = staticGroup!.members.map(m => m.name);
			expect(names).toContain('create');
		});

		it('extracts method parameters and returns', () => {
			const cls = symbols.find(s => s.name === 'ContentParser')!;
			const methods = cls.groups!.find(g => g.label === 'Methods')!;
			const parse = methods.members.find(m => m.name === 'parse')!;
			expect(parse.parameters).toBeDefined();
			expect(parse.parameters!.find(p => p.name === 'source')).toBeDefined();
			expect(parse.returns).toBeDefined();
			expect(parse.returns!.type).toBe('ASTNode');
		});

		it('extracts ParserConfig as an interface', () => {
			const iface = symbols.find(s => s.name === 'ParserConfig')!;
			expect(iface).toBeDefined();
			expect(iface.kind).toBe('interface');
		});
	});

	describe('interface extraction', () => {
		let symbols: SymbolDoc[];

		beforeAll(() => {
			const result = extractor.extractFile(resolve(fixturesDir, 'interfaces.ts'));
			symbols = result.symbols;
		});

		it('extracts interface kind', () => {
			const iface = symbols.find(s => s.name === 'ThemeOptions')!;
			expect(iface.kind).toBe('interface');
		});

		it('extracts interface members', () => {
			const iface = symbols.find(s => s.name === 'ThemeOptions')!;
			expect(iface.groups).toBeDefined();
			const props = iface.groups!.find(g => g.label === 'Properties');
			expect(props).toBeDefined();
			const names = props!.members.map(m => m.name);
			expect(names).toContain('name');
			expect(names).toContain('version');
		});

		it('extracts interface methods', () => {
			const iface = symbols.find(s => s.name === 'ThemeOptions')!;
			const methods = iface.groups!.find(g => g.label === 'Methods');
			expect(methods).toBeDefined();
			const apply = methods!.members.find(m => m.name === 'apply')!;
			expect(apply.parameters).toBeDefined();
			expect(apply.returns).toBeDefined();
		});
	});

	describe('enum extraction', () => {
		let symbols: SymbolDoc[];

		beforeAll(() => {
			const result = extractor.extractFile(resolve(fixturesDir, 'enums.ts'));
			symbols = result.symbols;
		});

		it('extracts enum kind', () => {
			const enm = symbols.find(s => s.name === 'RuneCategory')!;
			expect(enm.kind).toBe('enum');
		});

		it('extracts enum members as parameters', () => {
			const enm = symbols.find(s => s.name === 'RuneCategory')!;
			expect(enm.parameters).toBeDefined();
			const layout = enm.parameters!.find(p => p.name === 'Layout');
			expect(layout).toBeDefined();
			expect(layout!.type.replace(/'/g, '"')).toBe('"layout"');
			expect(layout!.description).toContain('Core structural');
		});

		it('extracts @since for enums', () => {
			const enm = symbols.find(s => s.name === 'RuneCategory')!;
			expect(enm.since).toBe('1.2.0');
		});
	});

	describe('type alias extraction', () => {
		let symbols: SymbolDoc[];

		beforeAll(() => {
			const result = extractor.extractFile(resolve(fixturesDir, 'types.ts'));
			symbols = result.symbols;
		});

		it('extracts type alias kind', () => {
			const typ = symbols.find(s => s.name === 'RuneMap')!;
			expect(typ.kind).toBe('type');
		});

		it('extracts type signature', () => {
			const typ = symbols.find(s => s.name === 'RuneMap')!;
			expect(typ.signature).toContain('Record<string, RuneDefinition>');
		});

		it('extracts generic type alias', () => {
			const typ = symbols.find(s => s.name === 'EventHandler')!;
			expect(typ).toBeDefined();
			expect(typ.signature).toContain('EventHandler');
		});
	});

	describe('source URL generation', () => {
		it('builds source URLs when sourceUrl is provided', () => {
			const extractor2 = new TypeScriptExtractor(fixturesDir, 'https://github.com/example/blob/main/test/fixtures');
			const result = extractor2.extractFile(resolve(fixturesDir, 'functions.ts'));
			const fn = result.symbols.find(s => s.name === 'renderContent')!;
			expect(fn.source).toMatch(/^https:\/\/github\.com\/example\/blob\/main\/test\/fixtures\/functions\.ts#L\d+$/);
		});

		it('omits source URL when sourceUrl is not provided', () => {
			const result = extractor.extractFile(resolve(fixturesDir, 'functions.ts'));
			const fn = result.symbols.find(s => s.name === 'renderContent')!;
			expect(fn.source).toBeUndefined();
		});
	});
});
