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
						...(reviewed ? { reviewed } : {}),
					});
				}
				m = tag.exec(line);
			}
		});

	return edges;
}

/** Deduplicate edges by referrer + target, keeping the earliest line.
 *  A page quoting one file five times makes one claim about it, not five. */
export function dedupeEdges(edges: Edge[]): Edge[] {
	const seen = new Map<string, Edge>();
	for (const edge of edges) {
		const key = `${edge.referrer}\u0000${edge.target}\u0000${edge.class}`;
		const existing = seen.get(key);
		if (!existing || edge.line < existing.line) seen.set(key, edge);
	}
	return [...seen.values()];
}
