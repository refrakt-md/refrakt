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
import { compareMarker, parseMarker, sliceForInvocation } from '@refrakt-md/runes';
import {
	type DeclaredEdgeError,
	dedupeEdges,
	type Edge,
	type EdgeClass,
	extractDeclaredEdges,
	extractDescribedLinkEdges,
	extractEmbeddedEdges,
	extractProseEdges,
} from './extract.js';
import { parseFrontmatter } from '../frontmatter.js';
import { globMatcher, resolveStaleSettings } from './exclude.js';
import {
	type Commit,
	commitsSince,
	type GitHistory,
	lastChanged,
	scanHistory,
} from './git-scan.js';

export type { Edge, EdgeClass, DeclaredEdgeError } from './extract.js';
export type { Commit, GitHistory } from './git-scan.js';
export { changedSince, GitScanRefusal, scanHistory } from './git-scan.js';
export {
	globMatcher,
	globToRegExp,
	resolveStaleSettings,
	StaleConfigRefusal,
	type StaleSettings,
} from './exclude.js';

export interface EdgeIndex {
	edges: Edge[];
	/** Declared edges that resolve to nothing — D14 reports these loudly, where
	 *  every inferred class stays silent. */
	errors: DeclaredEdgeError[];
	/** target path → edges pointing at it. The `touching` direction. */
	byTarget: Map<string, Edge[]>;
	/** referrer page → edges it declares. */
	byReferrer: Map<string, Edge[]>;
	/** What the project's `stale` config removed. Reported, never silent: an
	 *  exclusion list that hides its own effect is how the report converges on
	 *  empty without anyone deciding that it should. */
	excluded: ExclusionCount;
}

export interface ExclusionCount {
	/** Pages skipped whole, matching an `archival` glob. */
	archivalPages: number;
	/** Edges dropped because their target matched a `generated` glob. */
	generatedTargets: number;
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
export function buildEdgeIndex(opts: {
	repoRoot: string;
	contentDirs: string[];
	/** Referrer globs — matching pages contribute no edges at all. */
	archival?: string[];
	/** Target globs — edges pointing at a match are dropped. */
	generated?: string[];
}): EdgeIndex {
	const edges: Edge[] = [];
	const errors: DeclaredEdgeError[] = [];
	const isArchival = globMatcher(opts.archival);
	const isGenerated = globMatcher(opts.generated);
	const excluded: ExclusionCount = { archivalPages: 0, generatedTargets: 0 };

	const exists = (path: string): boolean => {
		try {
			return statSync(join(opts.repoRoot, path)).isFile();
		} catch {
			return false;
		}
	};

	// Every content page, for resolving described-link targets. A link points
	// at a route; the edge needs the file behind it.
	const allPages = opts.contentDirs.flatMap((d) =>
		collectPages(join(opts.repoRoot, d), opts.repoRoot),
	);
	const byRoute = new Map<string, string>();
	for (const page of allPages) {
		for (const dir of opts.contentDirs) {
			if (!page.startsWith(`${dir}/`)) continue;
			const rel = page.slice(dir.length + 1);
			const route = `/${rel.replace(/\.md$/, '').replace(/\/index$/, '')}`;
			byRoute.set(route === '/index' ? '/' : route, page);
		}
	}
	// Both `<path>.md` and `<path>/index.md` resolve. The anchor is already
	// stripped by the extractor.
	const resolvePage = (route: string): string | undefined =>
		byRoute.get(route) ?? byRoute.get(`${route}/index`);

	for (const page of allPages) {
		// An archival page is skipped before extraction, not filtered after it,
		// so it disappears from `touching` too — "what documents this file"
		// must not answer with a record of what was once true.
		if (isArchival(page)) {
			excluded.archivalPages++;
			continue;
		}

		let source: string;
		try {
			source = readFileSync(join(opts.repoRoot, page), 'utf8');
		} catch {
			continue;
		}

		const { frontmatter } = parseFrontmatter(source);

		edges.push(...extractEmbeddedEdges(page, source));

		// A `_layout.md` declares nothing on behalf of the pages beneath it
		// (D13) — that claim would be attributed to every one of them.
		if (!page.endsWith('/_layout.md')) {
			const declared = extractDeclaredEdges(page, frontmatter, exists);
			edges.push(...declared.edges);
			errors.push(...declared.errors);
		}

		edges.push(...extractDescribedLinkEdges(page, source, resolvePage));
		edges.push(...extractProseEdges(page, source, exists));
	}

	// A marker outranks a commit count, but only while it is still true. This
	// is where the two are told apart — here rather than in `rankEdges`, which
	// reads no files, and against the same slice `snippet review` hashes.
	for (const edge of edges) {
		if (!edge.reviewed || edge.attrs === undefined) continue;
		edge.markerStale = !markerIsCurrent(opts.repoRoot, edge.target, edge.attrs, edge.reviewed);
		edge.attrs = undefined;
	}

	const deduped = dedupeEdges(edges);
	const kept = deduped.filter((edge) => {
		if (!isGenerated(edge.target)) return true;
		excluded.generatedTargets++;
		return false;
	});

	return { ...indexEdges(kept), errors, excluded };
}

/**
 * Does an attached marker still certify the target's current content?
 *
 * A formatting-only change counts as current: SPEC-134 D3 already decided that
 * a reformat does not cost a review, and re-deciding it here would make the two
 * tools disagree.
 *
 * An anchor that refuses, or a target that cannot be read, answers `true`. The
 * refusal is SPEC-131's to report, and treating "could not check" as "stale"
 * would put every broken anchor at the top of a report about documentation.
 */
function markerIsCurrent(
	repoRoot: string,
	target: string,
	attrs: string,
	reviewed: string,
): boolean {
	let source: string;
	try {
		source = readFileSync(join(repoRoot, target), 'utf8');
	} catch {
		return true;
	}

	const current = sliceForInvocation(attrs, target, source);
	if (current === undefined) return true;

	const stored = parseMarker(reviewed);
	const verdict = compareMarker(stored.strict, current, stored.loose).verdict;
	return verdict === 'current' || verdict === 'formatting-only';
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

	return {
		edges,
		errors: [],
		byTarget,
		byReferrer,
		excluded: { archivalPages: 0, generatedTargets: 0 },
	};
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
		// where one exists it wins (D3) — but only while it is still true. A
		// marker the target has outgrown has expired as a statement, so the
		// commit count stands again.
		if (edge.reviewed && !edge.markerStale) continue;

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

/** Build the index and rank it in one call — the report's entry point.
 *
 *  `contentDirs`, `archival` and `generated` all come from the project's
 *  `refrakt.config.json` when not passed explicitly (tests pass fixtures). None
 *  of the three has a built-in value: a directory layout is a property of the
 *  project, not of the tool. */
export function runStale(opts: {
	repoRoot: string;
	contentDirs?: string[];
	archival?: string[];
	generated?: string[];
	edgeClass?: EdgeClass;
	min?: number;
}): RankResult & { index: EdgeIndex } {
	const settings =
		opts.contentDirs === undefined
			? resolveStaleSettings(opts.repoRoot)
			: {
					contentDirs: opts.contentDirs,
					archival: opts.archival ?? [],
					generated: opts.generated ?? [],
				};

	const index = buildEdgeIndex({
		repoRoot: opts.repoRoot,
		contentDirs: settings.contentDirs,
		archival: opts.archival ?? settings.archival,
		generated: opts.generated ?? settings.generated,
	});
	const history = scanHistory(opts.repoRoot);
	const result = rankEdges(index, history, { edgeClass: opts.edgeClass, min: opts.min });
	return { ...result, index };
}
