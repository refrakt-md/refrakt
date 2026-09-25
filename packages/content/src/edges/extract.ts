/**
 * Edge extraction (SPEC-136, WORK-594).
 *
 * Documentation already declares edges into the repository. Indexing them costs
 * nothing per reference and needs no new syntax, no marker, and no change to a
 * single existing page — which is the whole argument for this being the cheap,
 * wide signal underneath {@link SPEC-134}'s precise one.
 *
 * Extraction reads **Markdoc source**, not a resolved tree. That is deliberate:
 * the index has to answer for `snippet path=` attributes exactly as authored,
 * and `touching` must work without a build.
 */

/** Which extractor produced an edge. Carried so the report can state a base
 *  rate per class, and so `--class` can narrow. */
export type EdgeClass = 'declared' | 'embedded' | 'described-link' | 'prose';

export interface Edge {
	/** Page that makes the claim, repo-root-relative POSIX. */
	referrer: string;
	/** 1-indexed line of the claim within the referrer. */
	line: number;
	/** What is being referred to — a repo path, or a content page. */
	target: string;
	class: EdgeClass;
	/** Whether a SPEC-134 `reviewed` marker is attached to this reference.
	 *  Undefined while WORK-591 has not landed — see D3. */
	reviewed?: string;
	/** True when an attached marker no longer certifies the target's current
	 *  content. A marker outranks a commit count (D3) — but only while it is
	 *  true. A stale one is a statement that has expired, so the edge ranks
	 *  normally instead of being suppressed by it. */
	markerStale?: boolean;
	/** The invocation's raw attributes, kept so the marker can be checked
	 *  against the target. Embedded edges only, and stripped before the edge
	 *  is published. */
	attrs?: string;
}

import { BASE_LANGUAGES, maskSource } from '@refrakt-md/runes';

/** Runes that carry a `path=` into the repository. */
const EMBEDDED_RUNES = ['snippet', 'file-ref', 'expand'];

/**
 * Blank fenced blocks and inline code spans before extracting.
 *
 * A `{% snippet path="…" %}` inside a ```` ```markdoc ```` fence is an
 * *example* of the syntax, not a reference to that file — the `snippet` doc
 * page is full of them. Counting those inflates the index with claims nobody
 * made, and on this corpus it was 4 of 10.
 *
 * Reuses SPEC-131's Markdown masker (WORK-588) rather than re-deriving fence
 * tracking. Masking preserves line offsets, so the line numbers reported are
 * still the real ones.
 */
function withoutExamples(source: string): string {
	return maskSource(source, BASE_LANGUAGES.markdoc);
}

/**
 * Blank fenced blocks only, leaving inline code spans intact.
 *
 * The prose class extracts **backticked** paths, and the full Markdown mask
 * blanks inline code spans — so masking both would make that extractor find
 * nothing at all. A fenced block is still an example and must go; an inline
 * span is where the path lives.
 *
 * Line offsets are preserved, so reported line numbers stay real.
 */
function withoutFences(source: string): string {
	const fences = BASE_LANGUAGES.markdoc.fences;
	let open: string | undefined;

	return source
		.split('\n')
		.map((line) => {
			const trimmed = line.trimStart();
			if (open !== undefined) {
				if (trimmed.startsWith(open)) {
					open = undefined;
					return line;
				}
				return ' '.repeat(line.length);
			}
			const fence = fences.find((f) => trimmed.startsWith(f));
			if (fence !== undefined) {
				open = fence;
				return line;
			}
			return line;
		})
		.join('\n');
}

/**
 * Embedded-source edges — `snippet`, `file-ref` and `expand` `path=`.
 *
 * The class whose extraction is already trustworthy, which is why WORK-594
 * establishes the index and the output shape against it even though it reaches
 * only a fraction of the corpus. WORK-595 is where the rest is reached.
 */
export function extractEmbeddedEdges(referrer: string, source: string): Edge[] {
	const edges: Edge[] = [];
	const runeAlternation = EMBEDDED_RUNES.map((r) => r.replace('-', '\\-')).join('|');
	const tag = new RegExp(`\\{%\\s*(${runeAlternation})\\b([^%]*)%\\}`, 'g');

	withoutExamples(source)
		.split('\n')
		.forEach((line, i) => {
			tag.lastIndex = 0;
			let m = tag.exec(line);
			while (m !== null) {
				const attrs = m[2];
				const path = /\bpath\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
				if (path) {
					const reviewed = /\breviewed\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
					edges.push({
						referrer,
						line: i + 1,
						target: path,
						class: 'embedded',
						...(reviewed ? { reviewed, attrs } : {}),
					});
				}
				m = tag.exec(line);
			}
		});

	return edges;
}

/**
 * Precision order, highest first — the spec's own table.
 *
 * `declared` wins because an author chose the file; `prose` loses because a
 * backticked path may be a name-drop.
 */
const PRECISION: Record<EdgeClass, number> = {
	declared: 0,
	embedded: 1,
	'described-link': 2,
	prose: 3,
};

/**
 * Deduplicate to one edge per referrer + target.
 *
 * A page quoting one file five times makes one claim about it, not five — and
 * a page that *declares* a file and also mentions it in prose is still making
 * one claim. Keying on the class as well produced duplicate rows in the ranked
 * report the moment the first `documents:` entry was added, because the same
 * page reached the same target two ways.
 *
 * The surviving edge is the highest-precision one, so a declared edge is never
 * displaced by a prose mention of the same file. Ties break on the earliest
 * line.
 */
export function dedupeEdges(edges: Edge[]): Edge[] {
	const seen = new Map<string, Edge>();
	for (const edge of edges) {
		const key = `${edge.referrer}\u0000${edge.target}`;
		const existing = seen.get(key);
		if (!existing) {
			seen.set(key, edge);
			continue;
		}
		const better =
			PRECISION[edge.class] < PRECISION[existing.class] ||
			(edge.class === existing.class && edge.line < existing.line);
		if (better) seen.set(key, edge);
	}
	return [...seen.values()];
}

/** An error raised by a *declared* edge — D14's asymmetry. */
export interface DeclaredEdgeError {
	referrer: string;
	entry: string;
	message: string;
}

/**
 * Declared edges — the `documents:` frontmatter field (D13).
 *
 * The highest-precision class, because there is no extraction heuristic to be
 * wrong. It exists because a page's subject is not always in its words: 209 of
 * 237 pages in this repository name no file at all.
 *
 * **A declared path that resolves to nothing is an error** (D14). D7 skips an
 * unresolvable *mention* because the likeliest explanation is that the
 * extractor misfired on something that was never a path. A `documents` entry
 * has no such excuse — the author asserted the relationship, so a miss means
 * the file moved and the declaration did not. Without this, the mechanism
 * designed to catch rot would quietly accumulate its own.
 *
 * No cascade from a `_layout.md`: a layout declaring what it documents would
 * attribute that claim to every page beneath it, which is precisely the
 * over-broad edge the prose class already risks.
 */
export function extractDeclaredEdges(
	referrer: string,
	frontmatter: { documents?: unknown },
	exists: (path: string) => boolean,
): { edges: Edge[]; errors: DeclaredEdgeError[] } {
	const raw = frontmatter.documents;
	if (raw === undefined) return { edges: [], errors: [] };

	if (!Array.isArray(raw)) {
		return {
			edges: [],
			errors: [
				{
					referrer,
					entry: String(raw),
					message: '`documents` must be a list of repo-root-relative paths',
				},
			],
		};
	}

	const edges: Edge[] = [];
	const errors: DeclaredEdgeError[] = [];

	for (const entry of raw) {
		if (typeof entry !== 'string' || entry.length === 0) {
			errors.push({ referrer, entry: String(entry), message: 'is not a path' });
			continue;
		}
		// Same containment as `snippet path=`: absolute paths and traversal
		// escapes are rejected identically.
		if (entry.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(entry)) {
			errors.push({
				referrer,
				entry,
				message: 'must be repo-root-relative, with no absolute path or `..` escape',
			});
			continue;
		}
		if (!exists(entry)) {
			errors.push({ referrer, entry, message: 'resolves to no existing file' });
			continue;
		}
		edges.push({ referrer, line: 1, target: entry, class: 'declared' });
	}

	return { edges, errors };
}

/** A link in a table cell whose neighbouring cell carries prose. */
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
/** A list item whose link is followed by a dash and prose. */
const DESCRIBED_ITEM = /^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*[—–-]\s*\S/;
const LINK = /\[([^\]]+)\]\(([^)]+)\)/;

/**
 * Described-link edges — an internal link carrying an adjacent description
 * (D16).
 *
 * A link says *go here*. It asserts nothing, and `site/content` carries 748
 * internal links, overwhelmingly navigation. But **an overview page listing its
 * children with one-line summaries is duplicating the target's content**, and
 * the duplicate is what rots. The link identifies which target is being
 * summarised; the *description* is the claim.
 *
 * Two shapes, both structural rather than heuristic. Nothing else counts — not
 * a link in a paragraph, not a bare list item, not a nav entry.
 *
 * `{% ref %}` / `{% xref %}` entity links produce nothing here: extraction
 * reads Markdoc source rather than resolved hrefs, so they never look like
 * Markdown links in the first place.
 */
export function extractDescribedLinkEdges(
	referrer: string,
	source: string,
	resolvePage: (href: string) => string | undefined,
): Edge[] {
	const edges: Edge[] = [];

	withoutExamples(source)
		.split('\n')
		.forEach((line, i) => {
			const hrefs: string[] = [];

			const row = TABLE_ROW.exec(line);
			if (row) {
				// Split on unescaped pipes; a cell with a link counts only when
				// some *other* cell carries prose.
				const cells = row[1].split('|').map((c) => c.trim());
				const linked = cells.filter((c) => LINK.test(c));
				const prose = cells.filter((c) => !LINK.test(c) && c.length > 0);
				if (linked.length > 0 && prose.length > 0) {
					for (const cell of linked) {
						const m = LINK.exec(cell);
						if (m) hrefs.push(m[2]);
					}
				}
			} else {
				const item = DESCRIBED_ITEM.exec(line);
				if (item) hrefs.push(item[2]);
			}

			for (const href of hrefs) {
				// Internal only — an external URL is not a claim about this repo.
				if (/^[a-z]+:/i.test(href) || href.startsWith('#')) continue;
				// The anchor is stripped here rather than in the resolver: the
				// claim is about the page, not the section, and every caller
				// would otherwise have to remember to do it.
				const clean = href.split('#')[0].replace(/\/$/, '');
				if (clean.length === 0) continue;
				const target = resolvePage(clean);
				// A described link whose target does not resolve to a content
				// page is skipped, not reported: it is an inferred edge.
				if (!target) continue;
				edges.push({ referrer, line: i + 1, target, class: 'described-link' });
			}
		});

	return edges;
}

/** A backticked, repo-root-relative-looking path. */
const BACKTICKED = /`([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)`/g;

/**
 * Prose path mentions — a backticked repo-relative path in body text (D7).
 *
 * The highest-yield class in the spec's measurement and the one with the worst
 * precision: a backticked path in "formatting is owned by `biome.jsonc`" is a
 * mention, not a documented claim. The design accepts that, because D1 removes
 * any consequence from a false positive and D9 bounds the output — a mention
 * that ranks highly costs a reader three seconds.
 *
 * Extraction is deliberately narrow: a backticked path that **resolves to a
 * file that exists today**. Unbackticked paths, globs and paths that no longer
 * exist are all skipped. A path that no longer exists is a different and louder
 * defect, and belongs to link checking rather than here.
 */
export function extractProseEdges(
	referrer: string,
	source: string,
	exists: (path: string) => boolean,
): Edge[] {
	const edges: Edge[] = [];

	// Fences only: the whole point of this class is the backticked span, which
	// the full Markdown mask would blank.
	withoutFences(source)
		.split('\n')
		.forEach((line, i) => {
			BACKTICKED.lastIndex = 0;
			let m = BACKTICKED.exec(line);
			while (m !== null) {
				const candidate = m[1];
				m = BACKTICKED.exec(line);
				if (candidate.startsWith('/') || candidate.includes('..')) continue;
				// **A bare root-level filename is not a path claim.** The first
				// run over `site/content` put four near-identical rows in the
				// top ten — `refrakt.config.json`, mentioned in passing by four
				// unrelated pages and changing for reasons none of them are
				// about. A root config file is the shape of D7's own false
				// positive ("formatting is owned by `biome.jsonc`"): mentioned
				// everywhere, documented nowhere. Requiring a directory
				// separator is what distinguishes a deliberate pointer from a
				// name-drop.
				if (!candidate.includes('/')) continue;
				// Resolving to a file that exists today is the rest of the
				// filter. A path that no longer exists is a different and
				// louder defect and belongs to link checking, not here.
				if (!exists(candidate)) continue;
				edges.push({ referrer, line: i + 1, target: candidate, class: 'prose' });
			}
		});

	return edges;
}
