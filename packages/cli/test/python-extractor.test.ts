import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { PythonExtractor } from '../src/extractors/python.js';

const fixturesDir = resolve(import.meta.dirname, 'fixtures');

let extractor: PythonExtractor;

beforeAll(async () => {
	extractor = new PythonExtractor(fixturesDir, 'https://github.com/example/repo/blob/main');
	await extractor.init();
});

describe('PythonExtractor — functions', () => {
	it('extracts exported functions from __all__', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const names = result.symbols.map(s => s.name);
		expect(names).toContain('greet');
		expect(names).toContain('calculate_area');
		expect(names).toContain('fetch_data');
		expect(names).toContain('process_items');
		expect(names).toContain('deprecated_func');
		expect(names).toContain('numpy_func');
		expect(names).toContain('sphinx_func');
	});

	it('excludes private functions', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const names = result.symbols.map(s => s.name);
		expect(names).not.toContain('_private_helper');
		expect(names).not.toContain('_also_private');
	});

	it('extracts function descriptions', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const greet = result.symbols.find(s => s.name === 'greet')!;
		expect(greet.description).toContain('Generate a greeting message');
	});

	it('extracts parameters with types from Google docstring', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const greet = result.symbols.find(s => s.name === 'greet')!;
		expect(greet.parameters).toBeDefined();
		expect(greet.parameters!.length).toBe(2);

		const nameParam = greet.parameters!.find(p => p.name === 'name')!;
		expect(nameParam.type).toBe('str');
		expect(nameParam.description).toContain('The name of the person');

		const greetingParam = greet.parameters!.find(p => p.name === 'greeting')!;
		expect(greetingParam.type).toBe('str');
		expect(greetingParam.optional).toBe(true);
		expect(greetingParam.defaultValue).toBe('"Hello"');
	});

	it('extracts return type', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const greet = result.symbols.find(s => s.name === 'greet')!;
		expect(greet.returns).toBeDefined();
		expect(greet.returns!.type).toBe('str');
	});

	it('extracts raises', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const calcArea = result.symbols.find(s => s.name === 'calculate_area')!;
		expect(calcArea.throws).toBeDefined();
		expect(calcArea.throws!.length).toBe(1);
		expect(calcArea.throws![0].type).toBe('ValueError');
	});

	it('extracts *args and **kwargs', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const fetchData = result.symbols.find(s => s.name === 'fetch_data')!;
		expect(fetchData.parameters).toBeDefined();
		const kwargs = fetchData.parameters!.find(p => p.name === '**kwargs');
		expect(kwargs).toBeDefined();
	});

	it('extracts versionadded as since', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const fetchData = result.symbols.find(s => s.name === 'fetch_data')!;
		expect(fetchData.since).toBe('2.1');
	});

	it('extracts deprecated', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const depFunc = result.symbols.find(s => s.name === 'deprecated_func')!;
		expect(depFunc.deprecated).toBeDefined();
	});

	it('extracts NumPy-style docstrings', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const numpyFunc = result.symbols.find(s => s.name === 'numpy_func')!;
		expect(numpyFunc.parameters).toBeDefined();
		expect(numpyFunc.parameters!.find(p => p.name === 'data')?.description).toContain('input data');
		expect(numpyFunc.since).toBe('1.5');
	});

	it('extracts Sphinx-style docstrings', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const sphinxFunc = result.symbols.find(s => s.name === 'sphinx_func')!;
		expect(sphinxFunc.parameters).toBeDefined();
		expect(sphinxFunc.parameters!.find(p => p.name === 'path')?.type).toBe('str');
		expect(sphinxFunc.returns).toBeDefined();
		expect(sphinxFunc.throws).toBeDefined();
		expect(sphinxFunc.throws!.length).toBe(2);
	});

	it('sets kind to function', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		for (const sym of result.symbols) {
			expect(sym.kind).toBe('function');
		}
	});

	it('generates source URLs with line numbers', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const greet = result.symbols.find(s => s.name === 'greet')!;
		expect(greet.source).toMatch(/^https:\/\/github\.com\/example\/repo\/blob\/main\/functions\.py#L\d+$/);
	});

	it('includes line numbers', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const greet = result.symbols.find(s => s.name === 'greet')!;
		expect(greet.line).toBeGreaterThan(0);
	});

	it('builds signatures with decorators and types', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'functions.py'));
		const greet = result.symbols.find(s => s.name === 'greet')!;
		expect(greet.signature).toContain('def greet(');
		expect(greet.signature).toContain('-> str');
	});
});

describe('PythonExtractor — classes', () => {
	it('extracts classes', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const names = result.symbols.map(s => s.name);
		expect(names).toContain('HttpClient');
		expect(names).toContain('Color');
		expect(names).toContain('Serializable');
		expect(names).toContain('BaseProcessor');
	});

	it('excludes private classes', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const names = result.symbols.map(s => s.name);
		expect(names).not.toContain('_InternalHelper');
	});

	it('classifies Enum subclass as enum', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const color = result.symbols.find(s => s.name === 'Color')!;
		expect(color.kind).toBe('enum');
	});

	it('extracts enum members as parameters', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const color = result.symbols.find(s => s.name === 'Color')!;
		expect(color.parameters).toBeDefined();
		const memberNames = color.parameters!.map(p => p.name);
		expect(memberNames).toContain('RED');
		expect(memberNames).toContain('GREEN');
		expect(memberNames).toContain('BLUE');
		expect(memberNames).toContain('YELLOW');
		expect(color.parameters!.find(p => p.name === 'RED')!.type).toBe('"red"');
	});

	it('classifies Protocol subclass as interface', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const serializable = result.symbols.find(s => s.name === 'Serializable')!;
		expect(serializable.kind).toBe('interface');
	});

	it('classifies ABC subclass as interface', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const processor = result.symbols.find(s => s.name === 'BaseProcessor')!;
		expect(processor.kind).toBe('interface');
	});

	it('classifies regular class as class', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		expect(client.kind).toBe('class');
	});

	it('extracts class member groups', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		expect(client.groups).toBeDefined();
		const labels = client.groups!.map(g => g.label);
		expect(labels).toContain('Constructor');
		expect(labels).toContain('Properties');
		expect(labels).toContain('Methods');
		expect(labels).toContain('Static Methods');
		expect(labels).toContain('Class Methods');
	});

	it('extracts constructor with parameters', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		const ctorGroup = client.groups!.find(g => g.label === 'Constructor')!;
		const ctor = ctorGroup.members[0];
		expect(ctor.name).toBe('constructor');
		expect(ctor.parameters).toBeDefined();
		const paramNames = ctor.parameters!.map(p => p.name);
		expect(paramNames).toContain('base_url');
		expect(paramNames).toContain('timeout');
		// self should be excluded
		expect(paramNames).not.toContain('self');
	});

	it('extracts properties', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		const propsGroup = client.groups!.find(g => g.label === 'Properties')!;
		const propNames = propsGroup.members.map(m => m.name);
		expect(propNames).toContain('url');
		expect(propNames).toContain('is_connected');
		const urlProp = propsGroup.members.find(m => m.name === 'url')!;
		expect(urlProp.kind).toBe('property');
		expect(urlProp.signature).toContain('str');
	});

	it('extracts methods', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		const methodsGroup = client.groups!.find(g => g.label === 'Methods')!;
		const methodNames = methodsGroup.members.map(m => m.name);
		expect(methodNames).toContain('get');
		expect(methodNames).toContain('post');
	});

	it('excludes private methods', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		const allMemberNames = client.groups!.flatMap(g => g.members.map(m => m.name));
		expect(allMemberNames).not.toContain('_internal_retry');
		expect(allMemberNames).not.toContain('__repr__');
	});

	it('extracts static methods', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		const staticGroup = client.groups!.find(g => g.label === 'Static Methods')!;
		expect(staticGroup.members.map(m => m.name)).toContain('format_url');
	});

	it('extracts class methods', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		const classMethodGroup = client.groups!.find(g => g.label === 'Class Methods')!;
		expect(classMethodGroup.members.map(m => m.name)).toContain('from_env');
	});

	it('extracts class description', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		expect(client.description).toContain('simple HTTP client');
	});

	it('extracts class-level since', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const client = result.symbols.find(s => s.name === 'HttpClient')!;
		expect(client.since).toBe('1.0');
	});

	it('extracts class-level deprecated', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const processor = result.symbols.find(s => s.name === 'BaseProcessor')!;
		expect(processor.deprecated).toBe('2.0');
	});

	it('builds class signatures with base classes', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const color = result.symbols.find(s => s.name === 'Color')!;
		expect(color.signature).toContain('class Color(Enum)');
	});

	it('extracts interface members as groups', () => {
		const result = extractor.extractFile(resolve(fixturesDir, 'classes.py'));
		const serializable = result.symbols.find(s => s.name === 'Serializable')!;
		expect(serializable.groups).toBeDefined();
		const methodGroup = serializable.groups!.find(g => g.label === 'Methods');
		expect(methodGroup).toBeDefined();
		expect(methodGroup!.members.map(m => m.name)).toContain('to_dict');
	});
});

describe('PythonExtractor — error handling', () => {
	it('throws if init() not called', () => {
		const rawExtractor = new PythonExtractor(fixturesDir);
		expect(() => rawExtractor.extractFile(resolve(fixturesDir, 'functions.py'))).toThrow('init()');
	});
});
