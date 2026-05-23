/**
 * Sandboxed file reader for the snippet rune (SPEC-062).
 *
 * Resolves a project-root-relative path, enforces the snippet sandbox
 * (absolute-path reject, traversal reject, symlink-escape reject,
 * existence + file-type check), and optionally slices by line range.
 *
 * Pure synchronous I/O — runs at build time during the preprocess
 * phase. Errors are thrown as `Error` instances with structured messages
 * the preprocess hook formats for the user.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Diagnostics from a single read. */
export interface ReadFileResult {
	/** Resolved file content (possibly sliced by `lines`). */
	content: string;
	/** Absolute resolved path. */
	absolutePath: string;
	/** Project-root-relative POSIX path — what `data-snippet-source` carries. */
	relativePath: string;
	/** Warnings the preprocess hook should surface (e.g., end-clamp). */
	warnings: string[];
}

export interface ReadFileOptions {
	/** The author-supplied `path=` attribute value (project-root-relative). */
	pathAttr: string;
	/** Absolute path to the project root (the directory containing
	 *  `refrakt.config.json`). The sandbox anchor. */
	projectRoot: string;
	/** Optional `lines=` attribute value (`"10-25"`, `"10-"`, `"-20"`, `"10"`). */
	lines?: string;
	/** Optional source-page context used in error messages
	 *  ("Referenced from: docs/getting-started.md:42"). */
	referencingPage?: string;
}

/** Convert host-OS file path to POSIX form (forward slashes). */
function posixPath(p: string): string {
	return path.sep === '/' ? p : p.split(path.sep).join('/');
}

/**
 * Validate a path attribute against the snippet sandbox rules.
 * Throws `SnippetSandboxError` on rejection; returns the absolute resolved
 * path on success.
 */
export function resolveSnippetPath(pathAttr: string, projectRoot: string): string {
	if (typeof pathAttr !== 'string' || pathAttr.length === 0) {
		throw new SnippetSandboxError('snippet `path` attribute is required');
	}
	if (path.isAbsolute(pathAttr)) {
		throw new SnippetSandboxError(
			`snippet path "${pathAttr}" is absolute; project-root-relative paths only`,
		);
	}
	const joined = path.resolve(projectRoot, pathAttr);
	const normalized = path.normalize(joined);
	const rootWithSep = projectRoot.endsWith(path.sep) ? projectRoot : projectRoot + path.sep;
	if (!normalized.startsWith(rootWithSep) && normalized !== projectRoot) {
		throw new SnippetSandboxError(
			`snippet path "${pathAttr}" escapes the project root after normalization`,
		);
	}
	// Symlink-escape check via realpath. Fails open if realpath errors
	// (which mostly means the file doesn't exist — we'll surface that below).
	try {
		const real = fs.realpathSync(normalized);
		if (!real.startsWith(rootWithSep) && real !== projectRoot) {
			throw new SnippetSandboxError(
				`snippet path "${pathAttr}" resolves through a symlink that escapes the project root`,
			);
		}
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw err;
		}
		// File doesn't exist — let the stat check below produce the canonical
		// "file not found" error with the resolved path in the message.
	}
	return normalized;
}

/** Range parsed from the `lines=` attribute. */
interface LineRange {
	/** 1-indexed start (inclusive). Undefined means "from start of file". */
	start?: number;
	/** 1-indexed end (inclusive). Undefined means "to end of file". */
	end?: number;
}

/** Parse a `lines=` attribute. Returns null when the attribute is empty/absent;
 *  throws `SnippetSandboxError` on malformed input. */
export function parseLineRange(raw: string | undefined): LineRange | null {
	if (raw === undefined || raw === null || raw === '') return null;
	if (typeof raw !== 'string') {
		throw new SnippetSandboxError(`snippet \`lines\` attribute must be a string, got ${typeof raw}`);
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0) return null;

	// "10" — single line shorthand
	if (/^\d+$/.test(trimmed)) {
		const n = Number(trimmed);
		if (!Number.isFinite(n) || n < 1) throw new SnippetSandboxError(`snippet \`lines\` value "${raw}" is not a positive integer`);
		return { start: n, end: n };
	}

	// "10-25" | "10-" | "-20"
	const m = /^(\d*)-(\d*)$/.exec(trimmed);
	if (!m) {
		throw new SnippetSandboxError(`snippet \`lines\` value "${raw}" is malformed; expected "N", "N-M", "N-", or "-M"`);
	}
	const startStr = m[1];
	const endStr = m[2];
	const start = startStr.length > 0 ? Number(startStr) : undefined;
	const end = endStr.length > 0 ? Number(endStr) : undefined;
	if (start !== undefined && (!Number.isFinite(start) || start < 1)) {
		throw new SnippetSandboxError(`snippet \`lines\` start "${startStr}" is not a positive integer`);
	}
	if (end !== undefined && (!Number.isFinite(end) || end < 1)) {
		throw new SnippetSandboxError(`snippet \`lines\` end "${endStr}" is not a positive integer`);
	}
	if (start !== undefined && end !== undefined && end < start) {
		throw new SnippetSandboxError(`snippet \`lines\` value "${raw}" is inverted (end before start)`);
	}
	return { start, end };
}

/** Slice file content by line range. Returns the sliced text and any warnings
 *  about clamping. Throws `SnippetSandboxError` when the range is entirely
 *  past EOF. */
export function sliceContent(
	content: string,
	range: LineRange | null,
): { sliced: string; warnings: string[] } {
	if (range === null) return { sliced: content, warnings: [] };

	const lines = content.split('\n');
	const total = lines.length;
	const startLine = range.start ?? 1;
	let endLine = range.end ?? total;
	const warnings: string[] = [];

	if (startLine > total) {
		throw new SnippetSandboxError(
			`snippet \`lines\` start ${startLine} is past end of file (${total} lines)`,
		);
	}
	if (endLine > total) {
		warnings.push(
			`snippet \`lines\` end ${endLine} exceeds file length; clamped to ${total}`,
		);
		endLine = total;
	}

	// Convert to 0-indexed slice bounds. `slice(a, b)` returns indices [a, b);
	// we want lines [startLine, endLine] inclusive → slice(startLine - 1, endLine).
	const sliced = lines.slice(startLine - 1, endLine).join('\n');
	return { sliced, warnings };
}

/** Read a snippet's source file with full sandbox enforcement + line slicing. */
export function readSnippetFile(opts: ReadFileOptions): ReadFileResult {
	const absolutePath = resolveSnippetPath(opts.pathAttr, opts.projectRoot);

	let stat: fs.Stats;
	try {
		stat = fs.statSync(absolutePath);
	} catch {
		const referenced = opts.referencingPage ? `\n\nReferenced from: ${opts.referencingPage}` : '';
		throw new SnippetSandboxError(
			`snippet path "${opts.pathAttr}" cannot be resolved.\n\nResolved to: ${absolutePath}\nReason: file not found${referenced}`,
		);
	}
	if (!stat.isFile()) {
		throw new SnippetSandboxError(
			`snippet path "${opts.pathAttr}" must be a file (got ${stat.isDirectory() ? 'directory' : 'other'})`,
		);
	}

	const rawContent = fs.readFileSync(absolutePath, 'utf-8');
	const range = parseLineRange(opts.lines);
	const { sliced, warnings } = sliceContent(rawContent, range);

	const relativePath = posixPath(path.relative(opts.projectRoot, absolutePath));

	return {
		content: sliced,
		absolutePath,
		relativePath,
		warnings,
	};
}

/**
 * Read a file's raw text content with the snippet sandbox applied.
 * Used by expand (SPEC-066) when it needs the whole file (no line
 * slicing) to parse as Markdoc. Lives here so the `node:fs` import
 * stays inside this Node-only helper module — expand-pipeline.ts
 * imports the function, not `fs` directly, which keeps the runes
 * package tree-shakable for browser bundles.
 */
export function readWholeSandboxedFile(opts: {
	relativePath: string;
	projectRoot: string;
}): string {
	const absolutePath = resolveSnippetPath(opts.relativePath, opts.projectRoot);
	if (!fs.existsSync(absolutePath)) {
		throw new SnippetSandboxError(`source file "${opts.relativePath}" does not exist`);
	}
	const stat = fs.statSync(absolutePath);
	if (!stat.isFile()) {
		throw new SnippetSandboxError(
			`source file "${opts.relativePath}" must be a regular file (got ${stat.isDirectory() ? 'directory' : 'other'})`,
		);
	}
	return fs.readFileSync(absolutePath, 'utf-8');
}

/** All sandbox-rejection cases throw this — the preprocess hook can catch and
 *  format with source-line context for the user. */
export class SnippetSandboxError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SnippetSandboxError';
	}
}
