import { resolve, join, relative, dirname } from 'node:path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import type { SymbolDoc } from '../extractors/types.js';
import { loadExtractor } from '../extractors/index.js';
import { generateSymbolMarkdown, toSlug } from '../lib/symbol-generator.js';
import { generateLayoutMarkdown } from '../lib/layout-generator.js';

export interface ExtractOptions {
	input: string;
	output: string;
	lang?: 'typescript' | 'python';
	validate?: boolean;
	sourceUrl?: string;
	title?: string;
}

function detectLanguage(inputPath: string): 'typescript' | 'python' {
	const abs = resolve(inputPath);

	// Check if input is a single file
	if (existsSync(abs) && statSync(abs).isFile()) {
		if (abs.endsWith('.ts') || abs.endsWith('.tsx')) return 'typescript';
		if (abs.endsWith('.py')) return 'python';
	}

	// Check for tsconfig.json
	if (existsSync(join(abs, 'tsconfig.json')) ||
		existsSync(join(dirname(abs), 'tsconfig.json'))) {
		return 'typescript';
	}

	// Check directory contents
	if (existsSync(abs) && statSync(abs).isDirectory()) {
		try {
			const files = readdirSync(abs);
			if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) return 'typescript';
			if (files.some(f => f.endsWith('.py'))) return 'python';
		} catch {
			// fall through
		}
	}

	return 'typescript';
}

function findSourceFiles(inputPath: string, lang: 'typescript' | 'python'): string[] {
	const abs = resolve(inputPath);

	if (!existsSync(abs)) return [];

	const stat = statSync(abs);
	if (stat.isFile()) return [abs];

	const ext = lang === 'typescript' ? /\.tsx?$/ : /\.py$/;
	return walkFiles(abs, ext);
}

function walkFiles(dir: string, ext: RegExp): string[] {
	const files: string[] = [];
	const entries = readdirSync(dir);
	for (const entry of entries) {
		if (entry === 'node_modules' || entry === '__pycache__' || entry.startsWith('.')) continue;
		const fullPath = resolve(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...walkFiles(fullPath, ext));
		} else if (ext.test(entry)
			&& !entry.endsWith('.d.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')
			&& !entry.startsWith('test_') && !entry.endsWith('_test.py')
			&& entry !== 'conftest.py' && entry !== 'setup.py') {
			files.push(fullPath);
		}
	}
	return files;
}

export async function extractCommand(opts: ExtractOptions): Promise<void> {
	const inputPath = resolve(opts.input);
	const outputPath = resolve(opts.output);
	const lang = opts.lang ?? detectLanguage(inputPath);

	if (!existsSync(inputPath)) {
		console.error(`Error: Input path does not exist: ${inputPath}`);
		process.exit(1);
	}

	// Use the directory as rootDir for the extractor (even if input is a single file)
	const extractorRoot = statSync(inputPath).isDirectory() ? inputPath : dirname(inputPath);

	// Load the appropriate extractor
	const extractor = await loadExtractor(lang, extractorRoot, opts.sourceUrl);

	// Find all source files
	const sourceFiles = findSourceFiles(inputPath, lang);
	if (sourceFiles.length === 0) {
		console.error(`No ${lang} source files found in ${inputPath}`);
		process.exit(1);
	}

	// Extract symbols from all files
	const allSymbols: SymbolDoc[] = [];
	for (const file of sourceFiles) {
		const result = extractor.extractFile(file);
		allSymbols.push(...result.symbols);
	}

	if (allSymbols.length === 0) {
		console.log('No exported symbols found.');
		return;
	}

	console.log(`Found ${allSymbols.length} symbols in ${sourceFiles.length} files`);

	// Detect slug collisions and resolve them
	const slugMap = new Map<string, SymbolDoc[]>();
	for (const doc of allSymbols) {
		const slug = toSlug(doc.name);
		const existing = slugMap.get(slug) ?? [];
		existing.push(doc);
		slugMap.set(slug, existing);
	}

	// Generate Markdown for each symbol
	const generated = new Map<string, string>();

	for (const [slug, docs] of slugMap) {
		if (docs.length === 1) {
			const filePath = join(outputPath, `${slug}.md`);
			generated.set(filePath, generateSymbolMarkdown(docs[0], { lang }));
		} else {
			// Resolve collisions by appending kind
			for (const doc of docs) {
				const uniqueSlug = `${slug}-${doc.kind}`;
				const filePath = join(outputPath, `${uniqueSlug}.md`);
				generated.set(filePath, generateSymbolMarkdown(doc, { lang }));
			}
		}
	}

	// Generate _layout.md
	const layoutPath = join(outputPath, '_layout.md');
	const layoutContent = generateLayoutMarkdown(allSymbols, { title: opts.title });
	generated.set(layoutPath, layoutContent);

	// Validate mode: compare generated to existing
	if (opts.validate) {
		let stale = false;
		for (const [filePath, content] of generated) {
			if (!existsSync(filePath)) {
				console.error(`MISSING: ${relative(process.cwd(), filePath)}`);
				stale = true;
			} else {
				const existing = readFileSync(filePath, 'utf-8');
				if (existing !== content) {
					console.error(`STALE: ${relative(process.cwd(), filePath)}`);
					stale = true;
				}
			}
		}

		if (stale) {
			console.error('\nAPI reference is out of date. Run `refrakt extract` to regenerate.');
			process.exit(1);
		} else {
			console.log(`OK: ${generated.size} files up to date (${allSymbols.length} symbols)`);
		}
		return;
	}

	// Write mode
	if (!existsSync(outputPath)) {
		mkdirSync(outputPath, { recursive: true });
	}

	let written = 0;
	for (const [filePath, content] of generated) {
		const dir = dirname(filePath);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(filePath, content);
		written++;
	}

	console.log(`Written ${written} files to ${relative(process.cwd(), outputPath)}`);
}
