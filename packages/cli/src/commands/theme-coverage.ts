import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { themeVocabulary } from '@refrakt-md/runes';
import { vocabularyCoverage, type VocabularyCoverageRow } from '@refrakt-md/transform';

/**
 * `refrakt theme coverage` — ADR-043 decision 5 (WORK-672). For every value of
 * the theme vocabulary, whether the theme styles it, leaves it to the base
 * stylesheet, or nothing does. A report: a value at its default needs no rule,
 * so `none` is information, not failure. Part of a theme's definition of done,
 * beside `refrakt contracts --check`.
 */
export interface ThemeCoverageOptions {
	/** The theme's CSS: files or directories, read recursively. */
	css: string[];
	/** The base stylesheet; defaults to `@refrakt-md/skeleton`. `null` skips it. */
	base?: string | null;
	json?: boolean;
}

export function themeCoverageCommand(options: ThemeCoverageOptions): VocabularyCoverageRow[] {
	const cwd = process.cwd();
	const theme = options.css.flatMap((p) => readCss(resolve(cwd, p)));
	if (theme.length === 0) {
		throw new Error(`No CSS found under ${options.css.join(', ')}.`);
	}
	const baseDir = options.base === null ? null : (options.base ?? skeletonDir(cwd));
	const base = baseDir ? readCss(resolve(cwd, baseDir)) : [];
	const rows = vocabularyCoverage(themeVocabulary(), theme, base);

	if (options.json) {
		console.log(JSON.stringify(rows, null, 2));
		return rows;
	}
	const count = (c: string) => rows.filter((r) => r.coverage === c).length;
	console.log(
		`Theme vocabulary: ${rows.length} values — ${count('theme')} styled by the theme, ${count('base')} left to the base stylesheet, ${count('none')} unstyled.\n`,
	);
	let dimension = '';
	for (const r of rows) {
		if (r.dimension !== dimension) {
			dimension = r.dimension;
			console.log(`  ${dimension}`);
		}
		const mark = r.coverage === 'theme' ? '✓' : r.coverage === 'base' ? '·' : '✗';
		console.log(`    ${mark} ${r.selector}${r.coverage === 'base' ? '  (base)' : ''}`);
	}
	if (count('none') > 0) {
		console.log(
			'\n✗ marks a value nothing styles. A value at its default needs no rule; any other is a gap to style or a choice to record.',
		);
	}
	if (!baseDir) console.log('\n(No base stylesheet read: pass --base <dir> to include one.)');
	return rows;
}

function readCss(path: string): string[] {
	if (!existsSync(path)) throw new Error(`Not found: ${path}`);
	if (statSync(path).isFile()) return path.endsWith('.css') ? [readFileSync(path, 'utf-8')] : [];
	const out: string[] = [];
	for (const entry of readdirSync(path, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
		out.push(...readCss(join(path, entry.name)));
	}
	return out;
}

/** The installed skeleton package's directory, if there is one: the nearest
 *  `node_modules/@refrakt-md/skeleton` up from `cwd` (its `exports` do not
 *  publish `package.json`, so it is not resolved through `require`). */
function skeletonDir(cwd: string): string | null {
	for (let dir = cwd; ; dir = dirname(dir)) {
		const candidate = join(dir, 'node_modules', '@refrakt-md', 'skeleton');
		if (existsSync(join(candidate, 'package.json'))) return candidate;
		if (dirname(dir) === dir) return null;
	}
}
