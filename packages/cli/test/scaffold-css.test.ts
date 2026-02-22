import { describe, it, expect, afterEach } from 'vitest';
import { scaffoldCssCommand } from '../src/commands/scaffold-css.js';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function tmpOutputDir(): string {
	return join(
		tmpdir(),
		`scaffold-css-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
}

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs) {
		rmSync(dir, { recursive: true, force: true });
	}
	cleanupDirs.length = 0;
});

describe('scaffoldCssCommand', () => {
	it('generates CSS files for runes', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		// Check that some key rune CSS files were generated
		expect(existsSync(join(outputDir, 'hint.css'))).toBe(true);
		expect(existsSync(join(outputDir, 'grid.css'))).toBe(true);
		expect(existsSync(join(outputDir, 'recipe.css'))).toBe(true);
		expect(existsSync(join(outputDir, 'api.css'))).toBe(true);
	});

	it('generates root block selector', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		const hintCss = readFileSync(join(outputDir, 'hint.css'), 'utf-8');
		expect(hintCss).toContain('.rf-hint {');
	});

	it('generates modifier selectors with default values', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		const hintCss = readFileSync(join(outputDir, 'hint.css'), 'utf-8');
		// Hint has default modifier hintType: 'note'
		expect(hintCss).toContain('.rf-hint--note {');
	});

	it('generates element selectors from structure', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		const hintCss = readFileSync(join(outputDir, 'hint.css'), 'utf-8');
		expect(hintCss).toContain('.rf-hint__header {');
		expect(hintCss).toContain('.rf-hint__icon {');
		expect(hintCss).toContain('.rf-hint__title {');
	});

	it('generates context modifier selectors', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		const hintCss = readFileSync(join(outputDir, 'hint.css'), 'utf-8');
		expect(hintCss).toContain('.rf-hint--in-hero {');
	});

	it('generates static modifier selectors', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		const tierCss = readFileSync(join(outputDir, 'tier.css'), 'utf-8');
		expect(tierCss).toContain('.rf-tier--featured {');
	});

	it('includes comment annotations', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		scaffoldCssCommand({ outputDir, force: false });

		const apiCss = readFileSync(join(outputDir, 'api.css'), 'utf-8');
		expect(apiCss).toContain('/* Api rune */');
		expect(apiCss).toContain('/* Elements */');
		expect(apiCss).toContain('from structure');
	});

	it('skips existing files by default', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		mkdirSync(outputDir, { recursive: true });
		const existingContent = '/* my custom hint styles */';
		writeFileSync(join(outputDir, 'hint.css'), existingContent);

		scaffoldCssCommand({ outputDir, force: false });

		// The existing file should be preserved
		const hintCss = readFileSync(join(outputDir, 'hint.css'), 'utf-8');
		expect(hintCss).toBe(existingContent);

		// Other files should still be generated
		expect(existsSync(join(outputDir, 'grid.css'))).toBe(true);
	});

	it('overwrites existing files with --force', () => {
		const outputDir = tmpOutputDir();
		cleanupDirs.push(outputDir);

		mkdirSync(outputDir, { recursive: true });
		writeFileSync(join(outputDir, 'hint.css'), '/* old */');

		scaffoldCssCommand({ outputDir, force: true });

		const hintCss = readFileSync(join(outputDir, 'hint.css'), 'utf-8');
		expect(hintCss).not.toBe('/* old */');
		expect(hintCss).toContain('.rf-hint {');
	});
});
