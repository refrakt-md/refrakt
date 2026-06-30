/**
 * Sandboxed file reader for the snippet rune (SPEC-062) and its siblings
 * (expand SPEC-066, file-ref SPEC-078).
 *
 * Reads a project-root-relative path through an injected {@link ProjectFiles}
 * provider (SPEC-113) and optionally slices it by line range. The provider
 * owns containment — absolute-path reject, traversal reject, symlink-escape
 * reject — so this module no longer re-implements it; a denied or missing
 * read simply comes back as `null`. What stays here is the snippet-specific
 * value-add: line-range parsing, slicing, clamp warnings, and the structured
 * `SnippetSandboxError` the preprocess hook formats for the user.
 *
 * No `node:fs` import — all I/O goes through the provider, which keeps the
 * runes package tree-shakable for browser bundles.
 */

import type { ProjectFiles } from '@refrakt-md/types';

/** Diagnostics from a single read. */
export interface ReadFileResult {
	/** Resolved file content (possibly sliced by `lines`). */
	content: string;
	/** Project-root-relative POSIX path — what `data-snippet-source` carries. */
	relativePath: string;
	/** Warnings the preprocess hook should surface (e.g., end-clamp). */
	warnings: string[];
}

export interface ReadFileOptions {
	/** The project's files, rooted at the project root. Reads go through this. */
	files: ProjectFiles;
	/** The author-supplied `path=` attribute value (project-root-relative). */
	pathAttr: string;
	/** Optional `lines=` attribute value (`"10-25"`, `"10-"`, `"-20"`, `"10"`). */
	lines?: string;
	/** Optional source-page context used in error messages
	 *  ("Referenced from: docs/getting-started.md:42"). */
	referencingPage?: string;
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

/** Read a snippet's source file through the provider, with line slicing. The
 *  provider denies absolute / traversal / symlink-escape paths (and reports a
 *  missing or non-file path) as `null`, which becomes a single in-band error. */
export function readSnippetFile(opts: ReadFileOptions): ReadFileResult {
	const rawContent = opts.files.read(opts.pathAttr);
	if (rawContent === null) {
		const referenced = opts.referencingPage ? `\n\nReferenced from: ${opts.referencingPage}` : '';
		throw new SnippetSandboxError(
			`snippet path "${opts.pathAttr}" cannot be resolved — the file is missing, not a regular file, or outside the project root.${referenced}`,
		);
	}

	const range = parseLineRange(opts.lines);
	const { sliced, warnings } = sliceContent(rawContent, range);

	return {
		content: sliced,
		relativePath: opts.pathAttr,
		warnings,
	};
}

/**
 * Read a file's raw text content through the provider. Used by expand
 * (SPEC-066) when it needs the whole file (no line slicing) to parse as
 * Markdoc. The provider applies the same containment as snippet.
 */
export function readWholeSandboxedFile(opts: {
	files: ProjectFiles;
	relativePath: string;
}): string {
	const raw = opts.files.read(opts.relativePath);
	if (raw === null) {
		throw new SnippetSandboxError(
			`source file "${opts.relativePath}" cannot be resolved — it is missing, not a regular file, or outside the project root`,
		);
	}
	return raw;
}

/** All sandbox-rejection cases throw this — the preprocess hook can catch and
 *  format with source-line context for the user. */
export class SnippetSandboxError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SnippetSandboxError';
	}
}
