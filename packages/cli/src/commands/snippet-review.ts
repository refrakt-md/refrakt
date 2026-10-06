/**
 * `refrakt snippet review` (SPEC-134, WORK-591 + WORK-592).
 *
 * Markers are never hand-written. This is the tool that writes them, and the
 * review experience that makes writing one mean something.
 *
 * ```bash
 * refrakt snippet review site/content/runes/file-ref.md   # stamp unmarked
 * refrakt snippet review --all
 * refrakt snippet review --check                          # report, own exit code
 * refrakt snippet review --update --interactive           # re-stamp what changed
 * ```
 *
 * **The tool shows content, never hashes (D5).** A commit full of changed hex
 * strings is unreviewable and would make the marker ceremonial. A commit where
 * someone saw each before/after and confirmed the prose still holds is the
 * entire deliverable.
 *
 * **Recovering the "before" is the part that is not obvious.** A hash cannot be
 * turned back into content, so the reviewed version is read out of git: the
 * commit that introduced this marker value is when the review happened, so the
 * target file *at that commit* is what the author actually read. Resolving the
 * same anchor there gives the old slice to diff against.
 *
 * **A fired marker is a prompt, not a failure (D7).** The output is a
 * changed-files list. Framed as a failing test with a red X, authors re-stamp
 * reflexively to get green — producing markers that certify nothing and cost a
 * command.
 */

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
	BASE_LANGUAGES,
	compareMarker,
	formatMarker,
	hashSlice,
	type MarkerVerdict,
	maskSource,
	parseMarker,
	sliceForInvocation,
} from '@refrakt-md/runes';
import { computeLineDiff, summarizeDiff } from '@refrakt-md/runes';

export interface SnippetReviewOptions {
	repoRoot?: string;
	contentDirs?: string[];
	/** Specific pages to act on. Empty means every page under contentDirs. */
	pages?: string[];
	all?: boolean;
	check?: boolean;
	update?: boolean;
	interactive?: boolean;
	format?: 'text' | 'json';
}

interface Invocation {
	page: string;
	line: number;
	raw: string;
	rune: string;
	attrs: string;
	path: string;
	reviewed?: string;
}

export interface ReviewFinding {
	page: string;
	line: number;
	target: string;
	anchor: string;
	verdict: MarkerVerdict;
	summary: string;
	/** Present when the reviewed version could be recovered from git. */
	diff?: string;
}

const TAG = /\{%\s*(snippet|file-ref)\b([^%]*)%\}/g;

function attr(attrs: string, name: string): string | undefined {
	return new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1];
}

function collect(dir: string, repoRoot: string, out: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) collect(full, repoRoot, out);
		else if (entry.endsWith('.md')) out.push(relative(repoRoot, full).split(sep).join('/'));
	}
	return out;
}

/** Every live invocation carrying a `path=`. Fenced ones are examples of the
 *  syntax rather than references, so they are not marked. */
function findInvocations(repoRoot: string, pages: string[]): Invocation[] {
	const found: Invocation[] = [];

	for (const page of pages) {
		let source: string;
		try {
			source = readFileSync(join(repoRoot, page), 'utf8');
		} catch {
			continue;
		}
		const masked = maskSource(source, BASE_LANGUAGES.markdoc).split('\n');
		source.split('\n').forEach((line, i) => {
			if (masked[i] !== line) return;
			TAG.lastIndex = 0;
			let m = TAG.exec(line);
			while (m !== null) {
				const attrs = m[2];
				const path = attr(attrs, 'path');
				if (path) {
					found.push({
						page,
						line: i + 1,
						raw: m[0],
						rune: m[1],
						attrs,
						path,
						reviewed: attr(attrs, 'reviewed'),
					});
				}
				m = TAG.exec(line);
			}
		});
	}

	return found;
}

/** Resolve an invocation against a given version of its target file. */
function sliceFor(inv: Invocation, fileSource: string): string | undefined {
	// Shared with the staleness ranking (`@refrakt-md/runes`): if the two
	// resolved an anchor differently, a marker would read as stale on one side
	// and current on the other.
	return sliceForInvocation(inv.attrs, inv.path, fileSource);
}

function git(command: string, cwd: string): string | undefined {
	try {
		return execSync(command, {
			cwd,
			encoding: 'utf-8',
			maxBuffer: 64 * 1024 * 1024,
			stdio: ['pipe', 'pipe', 'pipe'],
		});
	} catch {
		return undefined;
	}
}

/**
 * The slice as it stood when the marker was written.
 *
 * The commit that introduced this marker value is when the review happened, so
 * the target file at that commit is what the author actually read. Without this
 * the tool could only show a hash changing, which D5 forbids.
 */
function reviewedSlice(repoRoot: string, inv: Invocation): string | undefined {
	if (!inv.reviewed) return undefined;
	const sha = git(
		`git log -1 --format=%H -S'reviewed="${inv.reviewed}"' -- "${inv.page}"`,
		repoRoot,
	)?.trim();
	if (!sha) return undefined;

	const old = git(`git show ${sha}:"${inv.path}"`, repoRoot);
	if (old === undefined) return undefined;

	return sliceFor(inv, old);
}

/** Render a unified-ish diff for the terminal. Content, never hashes. */
export function renderDiff(before: string, after: string): string {
	return computeLineDiff(before, after)
		.map((h) => {
			if (h.type === 'add') return `+ ${h.text}`;
			if (h.type === 'remove') return `- ${h.text}`;
			return `  ${h.text}`;
		})
		.join('\n');
}

export interface ReviewResult {
	findings: ReviewFinding[];
	stamped: number;
	restampedSilently: number;
	noops: Array<{ page: string; line: number; reason: string }>;
}

export function runSnippetReview(opts: SnippetReviewOptions): ReviewResult {
	const repoRoot = opts.repoRoot ?? process.cwd();
	const contentDirs = opts.contentDirs ?? ['site/content'];

	const pages =
		opts.pages && opts.pages.length > 0
			? opts.pages
			: contentDirs.flatMap((d) => collect(join(repoRoot, d), repoRoot));

	const result: ReviewResult = { findings: [], stamped: 0, restampedSilently: 0, noops: [] };
	const edits = new Map<string, Array<{ from: string; to: string }>>();

	for (const inv of findInvocations(repoRoot, pages)) {
		let fileSource: string;
		try {
			fileSource = readFileSync(join(repoRoot, inv.path), 'utf8');
		} catch {
			continue;
		}

		// D10 — an invocation that cannot change can never fire, so stamping it
		// means nothing. Report rather than stamp.
		if (inv.rune === 'expand') {
			result.noops.push({
				page: inv.page,
				line: inv.line,
				reason: '`expand` embeds a whole document, so there is no slice to hash',
			});
			continue;
		}

		const current = sliceFor(inv, fileSource);
		if (current === undefined) {
			// The anchor refused. SPEC-131 already reports that; this layer
			// stays silent rather than double-reporting (D9).
			continue;
		}

		const pair = hashSlice(current);

		if (!inv.reviewed) {
			// Unmarked. Stamping is only done on request — never in bulk by
			// default (D8).
			if (opts.update || opts.check) continue;
			const stamped = inv.raw.replace(
				/\s*\/?%\}$/,
				(tail) => ` reviewed="${formatMarker(pair)}"${tail}`,
			);
			pushEdit(edits, inv.page, inv.raw, stamped);
			result.stamped++;
			continue;
		}

		const stored = parseMarker(inv.reviewed);
		const comparison = compareMarker(stored.strict, current, stored.loose);

		if (comparison.verdict === 'current') continue;

		if (comparison.verdict === 'formatting-only') {
			// Proven formatting-only — re-stamp without prompting (D3). This is
			// what stops a repo-wide formatter run from costing fifty reviews.
			if (opts.update) {
				pushEdit(
					edits,
					inv.page,
					inv.raw,
					inv.raw.replace(/reviewed="[^"]*"/, `reviewed="${formatMarker(pair)}"`),
				);
				result.restampedSilently++;
			}
			continue;
		}

		const before = reviewedSlice(repoRoot, inv);
		result.findings.push({
			page: inv.page,
			line: inv.line,
			target: inv.path,
			anchor: attr(inv.attrs, 'symbol') ?? attr(inv.attrs, 'match') ?? inv.path,
			verdict: 'stale',
			summary: before ? summarizeDiff(before, current) : 'content changed',
			diff: before ? renderDiff(before, current) : undefined,
		});

		if (opts.update && !opts.interactive) {
			pushEdit(
				edits,
				inv.page,
				inv.raw,
				inv.raw.replace(/reviewed="[^"]*"/, `reviewed="${formatMarker(pair)}"`),
			);
		}
	}

	if (!opts.check) applyEdits(repoRoot, edits);

	return result;
}

function pushEdit(
	edits: Map<string, Array<{ from: string; to: string }>>,
	page: string,
	from: string,
	to: string,
): void {
	const list = edits.get(page);
	if (list) list.push({ from, to });
	else edits.set(page, [{ from, to }]);
}

function applyEdits(
	repoRoot: string,
	edits: Map<string, Array<{ from: string; to: string }>>,
): void {
	for (const [page, list] of edits) {
		let source = readFileSync(join(repoRoot, page), 'utf8');
		for (const { from, to } of list) source = source.replace(from, to);
		writeFileSync(join(repoRoot, page), source, 'utf8');
	}
}

export async function snippetReviewCommand(opts: SnippetReviewOptions): Promise<void> {
	const result = runSnippetReview(opts);

	if (opts.format === 'json') {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		process.exit(opts.check && result.findings.length > 0 ? 1 : 0);
	}

	const out: string[] = [];

	if (result.findings.length > 0) {
		// D7's wording. A changed-files list, not a failing check.
		out.push(
			`${result.findings.length} documented region${result.findings.length === 1 ? '' : 's'} changed since last review:`,
		);
		out.push('');
		for (const f of result.findings) {
			out.push(`  ${f.page}:${f.line} — ${f.anchor} (${f.summary})`);
			if (f.diff && (opts.update || opts.interactive)) {
				out.push('');
				for (const line of f.diff.split('\n')) out.push(`    ${line}`);
				out.push('');
			}
		}
		out.push('');
		out.push('Re-read the prose around each, then `refrakt snippet review --update` to re-stamp.');
	}

	if (result.stamped > 0) out.push(`Stamped ${result.stamped} unmarked invocation(s).`);
	if (result.restampedSilently > 0) {
		out.push(`Re-stamped ${result.restampedSilently} formatting-only change(s) without prompting.`);
	}
	for (const n of result.noops) {
		out.push(`No-op: ${n.page}:${n.line} — ${n.reason}.`);
	}

	if (out.length === 0) out.push('All review markers are current.');

	process.stdout.write(`${out.join('\n')}\n`);

	// `--check` has its own exit code, independent of the pipeline diagnostic
	// channel — it is the surface that works in a job.
	process.exit(opts.check && result.findings.length > 0 ? 1 : 0);
}
