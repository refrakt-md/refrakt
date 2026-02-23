import { describe, it, expect, afterEach } from 'vitest';
import { extractCommand } from '../src/commands/extract.js';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const fixturesDir = resolve(import.meta.dirname, 'fixtures');

function tmpOutputDir(): string {
	return join(
		tmpdir(),
		`extract-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
}

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs) {
		rmSync(dir, { recursive: true, force: true });
	}
	cleanupDirs.length = 0;
});

describe('extractCommand', () => {
	it('generates Markdown files from TypeScript source', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
		});

		expect(existsSync(join(outputDir, 'render-content.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'noop.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'legacy-render.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'create-parser.md'))).toBe(true);
	});

	it('generates _layout.md with nav', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
		});

		expect(existsSync(join(outputDir, '_layout.md'))).toBe(true);
		const layout = readFileSync(join(outputDir, '_layout.md'), 'utf-8');
		expect(layout).toContain('{% nav %}');
		expect(layout).toContain('render-content');
	});

	it('generates valid symbol markup', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
		});

		const md = readFileSync(join(outputDir, 'render-content.md'), 'utf-8');
		expect(md).toContain('{% symbol kind="function"');
		expect(md).toContain('{% /symbol %}');
		expect(md).toContain('## renderContent');
		expect(md).toContain('```typescript');
	});

	it('includes source-url when provided', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
			sourceUrl: 'https://github.com/example/blob/main/test/fixtures',
		});

		const md = readFileSync(join(outputDir, 'render-content.md'), 'utf-8');
		expect(md).toContain('source="https://github.com/example/blob/main/test/fixtures/functions.ts');
	});

	it('uses custom title for navigation', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
			title: 'Functions API',
		});

		const layout = readFileSync(join(outputDir, '_layout.md'), 'utf-8');
		expect(layout).toContain('## Functions API');
	});

	it('extracts from a directory', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		await extractCommand({
			input: fixturesDir,
			output: outputDir,
			lang: 'typescript',
		});

		// Should find symbols from all fixture files
		expect(existsSync(join(outputDir, 'render-content.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'content-parser.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'theme-options.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'rune-category.md'))).toBe(true);
		expect(existsSync(join(outputDir, 'rune-map.md'))).toBe(true);
	});

	it('validate mode passes for freshly generated files', async () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		// First generate
		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
		});

		// Then validate — should not throw
		await extractCommand({
			input: join(fixturesDir, 'functions.ts'),
			output: outputDir,
			lang: 'typescript',
			validate: true,
		});
	});
});
