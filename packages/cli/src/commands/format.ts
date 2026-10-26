/**
 * `refrakt format` — re-indent Markdoc by SPEC-170 D5 (WORK-657).
 *
 * A block tag's content is indented one tab only when the tag holds another
 * block tag. Only leading whitespace changes, and a file whose AST the rewrite
 * would change is refused and left alone. The rule lives in
 * `formatIndentation` (`@refrakt-md/runes`), which the language server and the
 * MCP server call too, so every surface formats the same way.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { formatIndentation } from '@refrakt-md/runes';

export interface FormatOptions {
	/** Files or directories; directories are walked for `.md` files. */
	paths: string[];
	/** Report what would change and write nothing. */
	check?: boolean;
	/** Paths to leave out — files, or directories and everything under them.
	 *  For generated content, which its generator rewrites. */
	ignore?: string[];
	format?: 'text' | 'json';
	cwd?: string;
}

export interface FormatReport {
	/** Files examined. */
	files: number;
	/** Files that were (or, with `check`, would be) re-indented. */
	changed: string[];
	/** Files left alone because re-indenting would change their AST. */
	refused: Array<{ file: string; line: number; message: string }>;
}

/** Directories a walk never enters: generated output and dependencies. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.svelte-kit', '.git']);

function collect(path: string, out: string[], ignored: Set<string>): void {
	if (ignored.has(path)) return;
	const stat = statSync(path);
	if (stat.isFile()) {
		if (path.endsWith('.md')) out.push(path);
		return;
	}
	for (const entry of readdirSync(path).sort()) {
		if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
		collect(join(path, entry), out, ignored);
	}
}

/** Format, or check, the given paths. Pure apart from the files it writes. */
export function runFormat(options: FormatOptions): FormatReport {
	const cwd = options.cwd ?? process.cwd();
	const files: string[] = [];
	const ignored = new Set((options.ignore ?? []).map((p) => resolve(cwd, p)));
	for (const p of options.paths.length > 0 ? options.paths : ['.']) {
		collect(resolve(cwd, p), files, ignored);
	}
	const report: FormatReport = { files: files.length, changed: [], refused: [] };
	for (const file of files) {
		const name = relative(cwd, file) || file;
		const result = formatIndentation(readFileSync(file, 'utf-8'));
		if (result.refused) {
			report.refused.push({ file: name, ...result.refused });
			continue;
		}
		if (!result.changed) continue;
		report.changed.push(name);
		if (!options.check) writeFileSync(file, result.output);
	}
	return report;
}

/** The CLI entry: prints the report and returns the exit code. */
export function formatCommand(options: FormatOptions): number {
	const report = runFormat(options);
	if (options.format === 'json') {
		console.log(JSON.stringify({ check: !!options.check, ...report }, null, 2));
	} else {
		for (const r of report.refused) console.error(`${r.file}:${r.line}: ${r.message}`);
		if (options.check) {
			for (const file of report.changed) console.log(`would re-indent ${file}`);
			if (report.changed.length === 0 && report.refused.length === 0) {
				console.log(`${report.files} files follow the indentation rule.`);
			} else if (report.changed.length > 0) {
				console.log(
					`\n${report.changed.length} of ${report.files} files would be re-indented. Run \`refrakt format\` to apply.`,
				);
			}
		} else {
			for (const file of report.changed) console.log(`re-indented ${file}`);
			console.log(`${report.changed.length} of ${report.files} files re-indented.`);
		}
	}
	if (report.refused.length > 0) return 1;
	return options.check && report.changed.length > 0 ? 1 : 0;
}
