import { describe, it, expect } from 'vitest';
import { generateSymbolMarkdown, generateMultiSymbolMarkdown, toSlug } from '../src/lib/symbol-generator.js';
import type { SymbolDoc } from '../src/extractors/types.js';

describe('toSlug', () => {
	it('converts camelCase to kebab-case', () => {
		expect(toSlug('createTransform')).toBe('create-transform');
	});

	it('converts PascalCase to kebab-case', () => {
		expect(toSlug('ThemeConfig')).toBe('theme-config');
	});

	it('handles consecutive uppercase letters', () => {
		expect(toSlug('HTMLElement')).toBe('html-element');
	});

	it('handles single word lowercase', () => {
		expect(toSlug('noop')).toBe('noop');
	});
});

describe('generateSymbolMarkdown', () => {
	const functionDoc: SymbolDoc = {
		name: 'renderContent',
		kind: 'function',
		signature: '(source: string, options?: RenderOptions) => RenderTree',
		description: 'Transforms a Markdoc document into a renderable tree.',
		parameters: [
			{ name: 'source', type: 'string', description: 'Raw Markdoc content to parse', optional: false },
			{
				name: 'options', type: 'RenderOptions', description: 'Configuration for the render pass', optional: true,
				children: [
					{ name: 'runes', type: 'RuneMap', description: 'Custom rune definitions', optional: true },
					{ name: 'variables', type: 'Record<string, any>', description: 'Template variables', optional: true },
				],
			},
		],
		returns: { type: 'RenderTree', description: 'A framework-agnostic tree for rendering.' },
		throws: [{ type: 'ParseError', description: 'if the source contains invalid Markdoc syntax.' }],
		since: '1.0.0',
		filePath: '/test/functions.ts',
		line: 10,
	};

	it('generates valid function symbol markup', () => {
		const md = generateSymbolMarkdown(functionDoc);

		expect(md).toContain('{% symbol kind="function" lang="typescript" since="1.0.0" %}');
		expect(md).toContain('## renderContent');
		expect(md).toContain('```typescript');
		expect(md).toContain('(source: string, options?: RenderOptions) => RenderTree');
		expect(md).toContain('- **source** `string` -- Raw Markdoc content to parse');
		expect(md).toContain('- **options** `RenderOptions` *(optional)* -- Configuration for the render pass');
		expect(md).toContain('  - **runes** `RuneMap` *(optional)* -- Custom rune definitions');
		expect(md).toContain('> Returns `RenderTree` -- A framework-agnostic tree for rendering.');
		expect(md).toContain('> Throws `ParseError` if the source contains invalid Markdoc syntax.');
		expect(md).toContain('{% /symbol %}');
	});

	it('includes frontmatter by default', () => {
		const md = generateSymbolMarkdown(functionDoc);
		expect(md).toMatch(/^---\ntitle: renderContent\n/);
	});

	it('excludes frontmatter when option is false', () => {
		const md = generateSymbolMarkdown(functionDoc, { frontmatter: false });
		expect(md).not.toContain('---');
	});

	it('generates deprecated symbol', () => {
		const doc: SymbolDoc = {
			name: 'legacyRender',
			kind: 'function',
			signature: '(source: string) => any',
			description: 'This function is deprecated.',
			deprecated: '2.0.0',
			filePath: '/test/functions.ts',
			line: 1,
		};

		const md = generateSymbolMarkdown(doc);
		expect(md).toContain('deprecated="2.0.0"');
	});

	it('generates source URL attribute', () => {
		const doc: SymbolDoc = {
			name: 'foo',
			kind: 'function',
			signature: '() => void',
			description: 'A function.',
			source: 'https://github.com/example/blob/main/src/foo.ts#L42',
			filePath: '/test/foo.ts',
			line: 42,
		};

		const md = generateSymbolMarkdown(doc);
		expect(md).toContain('source="https://github.com/example/blob/main/src/foo.ts#L42"');
	});

	it('generates interface with grouped members', () => {
		const doc: SymbolDoc = {
			name: 'ThemeConfig',
			kind: 'interface',
			signature: 'interface ThemeConfig',
			description: 'Top-level theme configuration.',
			groups: [
				{
					label: 'Properties',
					members: [
						{ name: 'prefix', kind: 'property', signature: 'prefix: string', description: 'BEM prefix.' },
						{ name: 'runes', kind: 'property', signature: 'runes: Record<string, RuneConfig>', description: 'Per-rune config.' },
					],
				},
			],
			filePath: '/test/types.ts',
			line: 1,
		};

		const md = generateSymbolMarkdown(doc);
		expect(md).toContain('{% symbol kind="interface"');
		expect(md).toContain('```typescript\ninterface ThemeConfig\n```');
		// Description paragraph should be after the signature fence (not before like functions)
		const bodyStart = md.indexOf('{% symbol');
		const fenceIdx = md.indexOf('```typescript\ninterface ThemeConfig', bodyStart);
		const descIdx = md.indexOf('Top-level theme configuration.', bodyStart);
		expect(fenceIdx).toBeGreaterThan(-1);
		expect(fenceIdx).toBeLessThan(descIdx);
		expect(md).toContain('### Properties');
		expect(md).toContain('#### prefix');
		expect(md).toContain('#### runes');
	});

	it('generates class with constructor group', () => {
		const doc: SymbolDoc = {
			name: 'ContentParser',
			kind: 'class',
			signature: 'class ContentParser extends EventTarget',
			description: 'The core parsing engine.',
			groups: [
				{
					label: 'Constructor',
					members: [
						{
							name: 'constructor', kind: 'constructor',
							signature: 'new (config: ParserConfig)',
							description: '',
							parameters: [
								{ name: 'config', type: 'ParserConfig', description: 'Parser configuration', optional: false },
							],
						},
					],
				},
				{
					label: 'Methods',
					members: [
						{
							name: 'parse', kind: 'method',
							signature: 'parse(source: string): ASTNode',
							description: 'Parse a source string into an AST.',
							parameters: [{ name: 'source', type: 'string', description: 'Raw content', optional: false }],
							returns: { type: 'ASTNode', description: 'The parsed AST' },
						},
					],
				},
			],
			filePath: '/test/classes.ts',
			line: 1,
		};

		const md = generateSymbolMarkdown(doc);
		expect(md).toContain('{% symbol kind="class"');
		expect(md).toContain('### Constructor');
		// Constructor shown without member sub-heading
		expect(md).toContain('new (config: ParserConfig)');
		expect(md).toContain('- **config** `ParserConfig` -- Parser configuration');
		expect(md).toContain('### Methods');
		expect(md).toContain('#### parse');
	});

	it('generates enum with members as parameters', () => {
		const doc: SymbolDoc = {
			name: 'RuneCategory',
			kind: 'enum',
			signature: 'enum RuneCategory',
			description: 'Categories for runes.',
			parameters: [
				{ name: 'Layout', type: '"layout"', description: 'Core structural runes', optional: false },
				{ name: 'Content', type: '"content"', description: 'Content structure runes', optional: false },
			],
			since: '1.2.0',
			filePath: '/test/enums.ts',
			line: 1,
		};

		const md = generateSymbolMarkdown(doc);
		expect(md).toContain('{% symbol kind="enum"');
		expect(md).toContain('- **Layout** `"layout"` -- Core structural runes');
		expect(md).toContain('- **Content** `"content"` -- Content structure runes');
	});

	it('generates type alias', () => {
		const doc: SymbolDoc = {
			name: 'RuneMap',
			kind: 'type',
			signature: 'type RuneMap = Record<string, RuneDefinition>',
			description: 'A mapping of rune names to definitions.',
			filePath: '/test/types.ts',
			line: 1,
		};

		const md = generateSymbolMarkdown(doc);
		expect(md).toContain('{% symbol kind="type"');
		expect(md).toContain('## RuneMap');
		expect(md).toContain('type RuneMap = Record<string, RuneDefinition>');
		// No groups or parameters for type aliases
		expect(md).not.toContain('###');
	});

	it('respects custom heading level', () => {
		const doc: SymbolDoc = {
			name: 'foo',
			kind: 'function',
			signature: '() => void',
			description: 'A function.',
			filePath: '/test/foo.ts',
			line: 1,
		};

		const md = generateSymbolMarkdown(doc, { headingLevel: 3 });
		expect(md).toContain('headingLevel=3');
		expect(md).toContain('### foo');
		// Must not contain '## foo' as a level-2 heading (but '### foo' is ok since it contains '##')
		expect(md).not.toMatch(/^## foo$/m);
	});
});

describe('generateMultiSymbolMarkdown', () => {
	it('generates multiple symbols in one file', () => {
		const docs: SymbolDoc[] = [
			{ name: 'foo', kind: 'function', signature: '() => void', description: 'Foo.', filePath: '/test.ts', line: 1 },
			{ name: 'bar', kind: 'function', signature: '() => void', description: 'Bar.', filePath: '/test.ts', line: 5 },
		];

		const md = generateMultiSymbolMarkdown(docs, 'utils.ts');
		expect(md).toContain('title: utils.ts');
		// Should have two symbol blocks, no nested frontmatter
		const symbolOpens = md.match(/{% symbol /g);
		expect(symbolOpens).toHaveLength(2);
		// Only one frontmatter block at the top
		const frontmatterBlocks = md.match(/^---$/gm);
		expect(frontmatterBlocks).toHaveLength(2); // opening and closing
	});
});
