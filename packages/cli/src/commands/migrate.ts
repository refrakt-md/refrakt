/**
 * `refrakt migrate <codemod> [paths…]` — content codemods for breaking changes.
 *
 * The first (and currently only) codemod is `elevation`, which rewrites the
 * deprecated SPEC-086 shadow-scale values (`none|sm|md|lg`) on the `elevation`
 * attribute to the SPEC-107 depth-ladder vocabulary. It is deliberately scoped
 * to the `elevation` attribute alone — `frame-shadow` carries the identical
 * `none/sm/md/lg` values and must NOT be touched (SPEC-107 §1).
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

/** SPEC-107 §5 — the deprecated `elevation` scale → ladder mapping. */
const ELEVATION_MAP: Record<string, string> = {
	none: 'flat',     // ⚠ keeps the surface — NOT flush
	sm: 'raised',
	md: 'raised',
	lg: 'floating',
};

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdoc', '.mdoc']);

/**
 * Match the `elevation` attribute and capture its quote + value, so the value
 * can be remapped while the rest is preserved. `\b` keeps `frame-shadow` and any
 * other attribute out of scope; the value alternation only fires on the four
 * deprecated tokens, so already-migrated ladder values pass through untouched.
 */
const ELEVATION_RE = /\belevation(\s*=\s*)(["'])(none|sm|md|lg)\2/g;

interface ElevationOptions {
	paths: string[];
	apply: boolean;
}

export async function runMigrateCommand(args: string[]): Promise<void> {
	const sub = args[0];
	if (!sub || sub === '--help' || sub === '-h') {
		printUsage();
		process.exit(sub ? 0 : 1);
	}

	if (sub === 'elevation') {
		runElevationCodemod(args.slice(1));
		return;
	}

	console.error(`Error: Unknown migrate codemod "${sub}"\n`);
	printUsage();
	process.exit(1);
}

function runElevationCodemod(args: string[]): void {
	const opts = parseElevationArgs(args);
	const files = collectMarkdownFiles(opts.paths);

	if (files.length === 0) {
		console.error('Error: no markdown files found at the given path(s).');
		process.exit(1);
	}

	let changedFiles = 0;
	let totalReplacements = 0;

	for (const file of files) {
		const original = readFileSync(file, 'utf-8');
		let count = 0;
		const migrated = original.replace(ELEVATION_RE, (_m, eq: string, quote: string, value: string) => {
			count++;
			return `elevation${eq}${quote}${ELEVATION_MAP[value]}${quote}`;
		});
		if (count === 0) continue;

		changedFiles++;
		totalReplacements += count;

		if (opts.apply) {
			writeFileSync(file, migrated);
			console.log(`Updated ${file} (${count} ${plural(count, 'replacement')})`);
		} else {
			console.log(`\n${file} (${count} ${plural(count, 'replacement')})`);
			console.log(diffChangedLines(original, migrated));
		}
	}

	if (changedFiles === 0) {
		console.log('No deprecated `elevation` values found — nothing to migrate.');
		return;
	}

	const verb = opts.apply ? 'Migrated' : 'Would migrate';
	console.log(
		`\n${verb} ${totalReplacements} `
		+ `${plural(totalReplacements, 'elevation value')} across ${changedFiles} ${plural(changedFiles, 'file')}.`,
	);
	if (!opts.apply) {
		console.log('(Dry run — pass --apply to write changes.)');
	}
}

/** Recursively collect markdown files from the given files/directories. */
function collectMarkdownFiles(paths: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	const visit = (p: string): void => {
		const abs = resolve(p);
		if (!existsSync(abs)) {
			console.error(`Error: path not found: ${p}`);
			process.exit(1);
		}
		const stat = statSync(abs);
		if (stat.isDirectory()) {
			for (const entry of readdirSync(abs)) {
				if (entry.startsWith('.') || entry === 'node_modules') continue;
				visit(join(abs, entry));
			}
		} else if (MARKDOWN_EXTENSIONS.has(extname(abs)) && !seen.has(abs)) {
			seen.add(abs);
			out.push(abs);
		}
	};

	for (const p of paths) visit(p);
	return out.sort();
}

function parseElevationArgs(args: string[]): ElevationOptions {
	const paths: string[] = [];
	let apply = false;

	for (const arg of args) {
		if (arg === '--apply') {
			apply = true;
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown option "${arg}"`);
			process.exit(1);
		} else {
			paths.push(arg);
		}
	}

	if (paths.length === 0) paths.push('.');
	return { paths, apply };
}

function plural(n: number, word: string): string {
	return n === 1 ? word : `${word}s`;
}

/** Print only the lines that changed, before/after — enough to eyeball the
 *  rewrite without a full diff implementation. */
function diffChangedLines(before: string, after: string): string {
	const b = before.split('\n');
	const a = after.split('\n');
	const lines: string[] = [];
	for (let i = 0; i < b.length; i++) {
		if (b[i] !== a[i]) {
			lines.push(`  - ${b[i]}`);
			lines.push(`  + ${a[i]}`);
		}
	}
	return lines.join('\n');
}

function printUsage(): void {
	console.log(`
Usage: refrakt migrate <codemod> [paths…] [options]

Codemods:
  elevation            Rewrite deprecated \`elevation="none|sm|md|lg"\` values to
                       the SPEC-107 ladder (none→flat, sm→raised, md→raised,
                       lg→floating). Scoped to the \`elevation\` attribute only —
                       \`frame-shadow\` is left untouched.

Options:
  [paths…]             Files or directories to scan (default: current directory).
                       Directories are walked recursively for .md/.markdoc files.
  --apply              Write changes to disk (default: dry-run prints a diff).
  --help, -h           Show this help message.

Examples:
  refrakt migrate elevation site/content              # Preview the rewrite
  refrakt migrate elevation site/content --apply      # Write the migration
  refrakt migrate elevation content/runes/card.md --apply
`);
}
