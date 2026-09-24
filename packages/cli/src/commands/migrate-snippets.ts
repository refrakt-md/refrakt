/**
 * `refrakt migrate snippets` — the `lines=` → anchor codemod (SPEC-131 D7,
 * WORK-590).
 *
 * Converting invocations by hand is tedious and exactly the kind of change
 * where a slip reintroduces the bug being fixed. The codemod reads each current
 * slice, infers an anchor from its first meaningful line, rewrites the
 * invocation, and **verifies the new resolution produces a byte-identical
 * slice** — refusing to rewrite when it does not.
 *
 * The diff stays reviewable; the verification is what makes it trustworthy.
 *
 * **Two things the verification does not cover**, both deliberate:
 *
 * - The byte-identical comparison runs **before** `reindent` (WORK-589). Run it
 *   after and every nested target fails verification for a difference the
 *   codemod itself introduced.
 * - Companion attributes need their own check. An invocation carrying
 *   `highlight=` needs those coordinates preserved or rewritten, and the slice
 *   comparison says nothing about them.
 *
 * **It never stamps SPEC-134 `reviewed` markers** (SPEC-134 D8). A marker
 * asserting that a human reviewed regions nobody looked at is a false claim in
 * precisely the shape that spec exists to prevent.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	AnchorResolutionError,
	BASE_LANGUAGES,
	maskSource,
	resolveAnchor,
	resolveLanguage,
} from '@refrakt-md/runes';

export interface MigrateSnippetsOptions {
	repoRoot?: string;
	contentDirs?: string[];
	/** Write the rewrites. Default is a dry run. */
	fix?: boolean;
	format?: 'text' | 'json';
}

export interface Rewrite {
	page: string;
	line: number;
	before: string;
	after: string;
	target: string;
	anchor: string;
}

export interface Refusal {
	page: string;
	line: number;
	invocation: string;
	reason: string;
}

export interface MigrateResult {
	rewrites: Rewrite[];
	refusals: Refusal[];
	/** Fenced invocations, which are examples rather than resolvable targets. */
	skippedFenced: number;
	/** Languages and formats the migration actually reached — the input to
	 *  D15's deferred config-surface decision. */
	languages: Record<string, number>;
}

/** Infer an anchor from a slice's first meaningful line. Returns the attribute
 *  text to substitute for `lines="…"`, or undefined when nothing usable is
 *  found. */
export function inferAnchor(
	slice: string,
	lang: ReturnType<typeof resolveLanguage>,
): { attr: string; description: string } | undefined {
	const lines = slice.split('\n');

	// Skip blank lines and comment lines: several existing invocations open on
	// a blank line or in the middle of a comment block, which is itself a
	// symptom of line addressing.
	const firstMeaningful = lines.find((line) => {
		const text = line.trim();
		if (text.length === 0) return false;
		if (!lang) return true;
		if (lang.lineComments.some((p) => text.startsWith(p))) return false;
		if (lang.blockComments.some(([open]) => text.startsWith(open))) return false;
		if (lang.blockComments.length > 0 && text.startsWith('*')) return false;
		return true;
	});

	if (firstMeaningful === undefined) return undefined;

	// A named declaration is the best anchor: prefer `symbol=`.
	if (lang && lang.keywords.length > 0) {
		const keywords = lang.keywords.join('|');
		const modifiers = lang.modifiers.length > 0 ? `(?:(?:${lang.modifiers.join('|')})\\s+)*` : '';
		const decl = new RegExp(`^\\s*${modifiers}(?:${keywords})\\s+([A-Za-z_$][\\w$]*)`);
		const m = decl.exec(firstMeaningful);
		if (m) return { attr: `symbol="${m[1]}"`, description: `symbol ${m[1]}` };
	}

	// Otherwise a regex anchored on the literal first line.
	const escaped = firstMeaningful
		.trim()
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(/"/g, '\\"');
	if (escaped.length === 0) return undefined;
	return { attr: `match="^\\s*${escaped}"`, description: `match on ${firstMeaningful.trim()}` };
}

const SNIPPET_TAG = /\{%\s*(snippet|file-ref)\b([^%]*)%\}/g;

export function migrateSnippets(opts: MigrateSnippetsOptions): MigrateResult {
	const repoRoot = opts.repoRoot ?? process.cwd();
	const contentDirs = opts.contentDirs ?? ['site/content'];
	const result: MigrateResult = {
		rewrites: [],
		refusals: [],
		skippedFenced: 0,
		languages: {},
	};

	for (const dir of contentDirs) {
		for (const page of collectMarkdown(join(repoRoot, dir), repoRoot)) {
			const source = readFileSync(join(repoRoot, page), 'utf8');
			// Fenced invocations are examples, not resolvable targets: they
			// cannot be verified byte-identically, so the codemod does not
			// attempt them. They are rewritten by hand to match whatever their
			// live counterparts become.
			const masked = maskSource(source, BASE_LANGUAGES.markdoc);
			const sourceLines = source.split('\n');
			const maskedLines = masked.split('\n');

			let nextSource = source;

			sourceLines.forEach((line, i) => {
				SNIPPET_TAG.lastIndex = 0;
				let m = SNIPPET_TAG.exec(line);
				while (m !== null) {
					const invocation = m[0];
					const attrs = m[2];
					const linesAttr = /\blines\s*=\s*"([^"]+)"/.exec(attrs);
					const pathAttr = /\bpath\s*=\s*"([^"]+)"/.exec(attrs);
					const current = m;
					m = SNIPPET_TAG.exec(line);

					if (!linesAttr || !pathAttr) continue;

					if (maskedLines[i] !== sourceLines[i]) {
						result.skippedFenced++;
						continue;
					}

					const target = pathAttr[1];
					let fileSource: string;
					try {
						fileSource = readFileSync(join(repoRoot, target), 'utf8');
					} catch {
						result.refusals.push({
							page,
							line: i + 1,
							invocation,
							reason: `target "${target}" could not be read`,
						});
						continue;
					}

					const lang = resolveLanguage(target);
					const langName =
						Object.entries(BASE_LANGUAGES).find(([, def]) => def === lang)?.[0] ?? 'unknown';

					const range = /^(\d*)-?(\d*)$/.exec(linesAttr[1].trim());
					if (!range) {
						result.refusals.push({
							page,
							line: i + 1,
							invocation,
							reason: `lines="${linesAttr[1]}" is not a simple range`,
						});
						continue;
					}

					const fileLines = fileSource.split('\n');
					const start = range[1] ? Number(range[1]) : 1;
					const end = range[2] ? Number(range[2]) : start;
					const before = fileLines.slice(start - 1, end).join('\n');

					const inferred = inferAnchor(before, lang);
					if (!inferred) {
						result.refusals.push({
							page,
							line: i + 1,
							invocation,
							reason: 'no anchor could be inferred from the slice',
						});
						continue;
					}

					// Resolve the inferred anchor and require a byte-identical
					// slice. This comparison runs BEFORE reindent.
					let after: string;
					try {
						const anchorOpts = inferred.attr.startsWith('symbol=')
							? { symbol: /symbol="([^"]+)"/.exec(inferred.attr)?.[1], doc: false }
							: { match: /match="(.+)"$/.exec(inferred.attr)?.[1]?.replace(/\\"/g, '"') };
						const resolved = resolveAnchor(fileSource, lang, anchorOpts, target);
						after = fileLines.slice(resolved.start - 1, resolved.end).join('\n');
					} catch (err) {
						result.refusals.push({
							page,
							line: i + 1,
							invocation,
							reason:
								err instanceof AnchorResolutionError
									? err.message
									: `resolution failed: ${String((err as Error)?.message ?? err)}`,
						});
						continue;
					}

					if (after !== before) {
						// A refusal is information, not an obstacle: it means
						// the anchor engine could not reproduce the slice, which
						// is exactly where a human should look.
						result.refusals.push({
							page,
							line: i + 1,
							invocation,
							reason: 'the anchored slice is not byte-identical to the line-addressed one',
						});
						continue;
					}

					const rewritten = invocation.replace(linesAttr[0], inferred.attr);
					result.rewrites.push({
						page,
						line: i + 1,
						before: invocation,
						after: rewritten,
						target,
						anchor: inferred.description,
					});
					result.languages[langName] = (result.languages[langName] ?? 0) + 1;
					nextSource = nextSource.replace(current[0], rewritten);
				}
			});

			if (opts.fix && nextSource !== source) {
				writeFileSync(join(repoRoot, page), nextSource, 'utf8');
			}
		}
	}

	return result;
}

function collectMarkdown(dir: string, repoRoot: string, out: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) collectMarkdown(full, repoRoot, out);
		else if (entry.endsWith('.md')) out.push(full.slice(repoRoot.length + 1));
	}
	return out;
}
