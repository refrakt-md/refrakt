import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

/**
 * Resolve the CSS directory for rune styles.
 *
 * Discovery order:
 * 1. Explicit --css flag
 * 2. Resolve @refrakt-md/lumina package → styles/runes/
 * 3. Monorepo fallback: packages/lumina/styles/runes/
 */
export function resolveCssDir(explicitDir?: string): string | null {
	if (explicitDir) {
		const abs = resolve(explicitDir);
		if (!existsSync(abs)) {
			throw new Error(`CSS directory not found: ${abs}`);
		}
		return abs;
	}

	// Try resolving from @refrakt-md/lumina package
	try {
		const require = createRequire(import.meta.url);
		const luminaPkg = require.resolve('@refrakt-md/lumina/package.json');
		const luminaDir = dirname(luminaPkg);
		const runesDir = join(luminaDir, 'styles', 'runes');
		if (existsSync(runesDir)) {
			return runesDir;
		}
	} catch {
		// Package not found, try monorepo fallback
	}

	// Monorepo fallback
	const monoRepo = resolve('packages/lumina/styles/runes');
	if (existsSync(monoRepo)) {
		return monoRepo;
	}

	return null;
}

/** Read a single CSS file for a BEM block name (e.g., "hint" → hint.css) */
export function readCssForBlock(cssDir: string, block: string): { content: string; path: string } | null {
	const filePath = join(cssDir, `${block}.css`);
	if (!existsSync(filePath)) return null;
	return { content: readFileSync(filePath, 'utf-8'), path: filePath };
}

/** Read all CSS files from the directory */
export function readAllCss(cssDir: string): Array<{ content: string; path: string }> {
	const files = readdirSync(cssDir)
		.filter(f => f.endsWith('.css'))
		.sort();

	return files.map(f => {
		const filePath = join(cssDir, f);
		return { content: readFileSync(filePath, 'utf-8'), path: filePath };
	});
}
