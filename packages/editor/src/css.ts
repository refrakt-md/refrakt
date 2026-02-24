import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Bundle a CSS file by recursively inlining @import statements.
 * Handles relative paths only (no url() or external imports).
 */
export function bundleCss(entryPath: string): string {
	const seen = new Set<string>();
	return resolveImports(entryPath, seen);
}

function resolveImports(filePath: string, seen: Set<string>): string {
	const abs = resolve(filePath);
	if (seen.has(abs)) return '';
	seen.add(abs);

	if (!existsSync(abs)) return `/* missing: ${filePath} */`;

	const css = readFileSync(abs, 'utf-8');
	const dir = dirname(abs);

	return css.replace(/@import\s+['"]([^'"]+)['"];?/g, (_match, importPath: string) => {
		const resolved = resolve(dir, importPath);
		return resolveImports(resolved, seen);
	});
}
