/**
 * The edge index (SPEC-136 D12, WORK-594).
 *
 * **Built as an addressable index, with ranking as one reader of it.** The
 * tempting shape is a function that walks content, scores as it goes, and
 * prints. That shape cannot answer WORK-596's `touching` query, which runs in
 * the opposite direction — from a changed file to the pages that document it —
 * and without the git scan at all. The cost of doing it properly is an
 * afternoon here and a rewrite avoided later.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { dedupeEdges, type Edge, type EdgeClass, extractEmbeddedEdges } from './extract.js';
import {
	type Commit,
	commitsSince,
	type GitHistory,
	lastChanged,
	scanHistory,
} from './git-scan.js';

export type { Edge, EdgeClass } from './extract.js';
export type { Commit, GitHistory } from './git-scan.js';
export { GitScanRefusal, scanHistory } from './git-scan.js';

export interface EdgeIndex {
	edges: Edge[];
	/** target path → edges pointing at it. The `touching` direction. */
	byTarget: Map<string, Edge[]>;
	/** referrer page → edges it declares. */
	byReferrer: Map<string, Edge[]>;
}

/** Collect content files under a directory, repo-root-relative POSIX. */
function collectPages(contentDir: string, repoRoot: string, out: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(contentDir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(contentDir, entry);
		if (statSync(full).isDirectory()) collectPages(full, repoRoot, out);
		else if (entry.endsWith('.md')) out.push(relative(repoRoot, full).split(sep).join('/'));
	}
	return out;
}

/**
 * Build the index from a content directory.
 *
 * Needs no git and no build, so `touching` can answer for a file created in the
 * working tree and never committed.
 */
export function buildEdgeIndex(opts: { repoRoot: string; contentDirs: string[] }): EdgeIndex {
	const edges: Edge[] = [];

	for (const dir of opts.contentDirs) {
		for (const page of collectPages(join(opts.repoRoot, dir), opts.repoRoot)) {
			let source: string;
			try {
				source = readFileSync(join(opts.repoRoot, page), 'utf8');
			} catch {
				continue;
			}
			edges.push(...extractEmbeddedEdges(page, source));
		}
	}

	return indexEdges(dedupeEdges(edges));
}

/** Index a list of edges in both directions. */
export function indexEdges(edges: Edge[]): EdgeIndex {
	const byTarget = new Map<string, Edge[]>();
	const byReferrer = new Map<string, Edge[]>();

	for (const edge of edges) {
		const t = byTarget.get(edge.target);
		if (t) t.push(edge);
		else byTarget.set(edge.target, [edge]);

		const r = byReferrer.get(edge.referrer);
		if (r) r.push(edge);
		else byReferrer.set(edge.referrer, [edge]);
	}

	return { edges, byTarget, byReferrer };
}

/**
 * The `touching` query — every page whose edges point at any of `paths`.
 *
 * Not a staleness measurement and not a filter over the ranked report: there is
 * no commit count, because the change has not happened yet. It takes no git
 * history, is unbounded by `--top`, and is the query that makes this feature
 * preventive rather than retrospective.
 */
export function edgesTouching(index: EdgeIndex, paths: string[]): Edge[] {
	const out: Edge[] = [];
	for (const path of paths) {
		out.push(...(index.byTarget.get(path) ?? []));
	}
	return out;
}

export interface RankedEdge {
	edge: Edge;
	/** Commits touching the target since the referrer last changed. */
	score: number;
	/** Unix seconds; undefined when the referrer is untracked. */
	referrerChanged?: number;
	targetChanged?: number;
	commits: Commit[];
}

export interface RankOptions {
	/** Narrow to one edge class. */
	edgeClass?: EdgeClass;
	/** Floor on the commit count. */
	min?: number;
}

/** Per-class base rate — how many edges of that class scored non-zero out of
 *  how many were scanned. Printed in the footer so degradation is visible
 *  rather than inferred. */
export interface BaseRate {
	class: EdgeClass;
	nonZero: number;
	scanned: number;
}

export interface RankResult {
	ranked: RankedEdge[];
	baseRates: BaseRate[];
	/** Total non-zero edges before `--top` truncation. */
	totalNonZero: number;
}

/**
 * Rank the index against a git history.
 *
 * One reader of the index among several — `touching` is another, and neither
 * owns it.
 *
 * An edge whose referrer is newer than every change to its target scores zero
 * and is omitted. A zero score is **the absence of evidence of staleness, not
 * evidence of freshness**: the referrer side resets on any edit, including a
 * typo fix (D6, a known and accepted false negative).
 */
export function rankEdges(
	index: EdgeIndex,
	history: GitHistory,
	opts: RankOptions = {},
): RankResult {
	const ranked: RankedEdge[] = [];
	const rates = new Map<EdgeClass, BaseRate>();

	for (const edge of index.edges) {
		if (opts.edgeClass && edge.class !== opts.edgeClass) continue;

		let rate = rates.get(edge.class);
		if (!rate) {
			rate = { class: edge.class, nonZero: 0, scanned: 0 };
			rates.set(edge.class, rate);
		}
		rate.scanned++;

		const referrerChanged = lastChanged(history, `${history.prefix}${edge.referrer}`);
		const targetChanged = lastChanged(history, `${history.prefix}${edge.target}`);

		// An untracked referrer has no "since" to measure from. Reporting it as
		// maximally stale would put every new page at the top of the report.
		if (referrerChanged === undefined) continue;

		// A SPEC-134 marker is a stronger statement than a commit count, so
		// where one exists it wins (D3). Gated: until WORK-591 lands, no edge
		// carries one and this is inert.
		if (edge.reviewed) continue;

		const commits = commitsSince(history, `${history.prefix}${edge.target}`, referrerChanged);
		if (commits.length === 0) continue;
		if (opts.min !== undefined && commits.length < opts.min) continue;

		rate.nonZero++;
		ranked.push({
			edge,
			score: commits.length,
			referrerChanged,
			targetChanged,
			commits,
		});
	}

	ranked.sort((a, b) => b.score - a.score || a.edge.referrer.localeCompare(b.edge.referrer));

	return {
		ranked,
		baseRates: [...rates.values()].sort((a, b) => a.class.localeCompare(b.class)),
		totalNonZero: ranked.length,
	};
}

/** Build the index and rank it in one call — the report's entry point. */
export function runStale(opts: {
	repoRoot: string;
	contentDirs: string[];
	edgeClass?: EdgeClass;
	min?: number;
}): RankResult & { index: EdgeIndex } {
	const index = buildEdgeIndex({ repoRoot: opts.repoRoot, contentDirs: opts.contentDirs });
	const history = scanHistory(opts.repoRoot);
	const result = rankEdges(index, history, { edgeClass: opts.edgeClass, min: opts.min });
	return { ...result, index };
}
