/**
 * `refrakt stale` — staleness ranking for documentation references (SPEC-136,
 * WORK-594).
 *
 * ```
 * staleness = commits touching the target since the referrer last changed
 * ```
 *
 * **This ranks. It never fails (D1).** No exit code on findings, no build
 * failure, no required check, not even an opt-in flag to make it failing. The
 * failure mode of getting that wrong is specific and fatal: the cheapest way to
 * turn any edge green is to edit the referring page, so a gate would train
 * people to make trivial documentation edits to clear it — actively destroying
 * the signal it measures. The measure only survives if nothing depends on it
 * being zero.
 *
 * **A refusal is a different event, and does exit non-zero.** D1 is about
 * findings. Being unable to run at all — a shallow clone, a non-git tree —
 * produced no answer, and a CI step that silently succeeds while measuring
 * nothing is exactly the silent-wrong this feature exists to avoid.
 */

import {
	GitScanRefusal,
	type RankedEdge,
	runStale,
	StaleConfigRefusal,
} from '@refrakt-md/content/edges';

export interface StaleOptions {
	top?: number;
	class?: string;
	min?: number;
	format?: 'text' | 'json';
	repoRoot?: string;
	/** Override the content roots taken from `refrakt.config.json`. */
	contentDirs?: string[];
}

function formatDate(seconds: number | undefined): string {
	if (seconds === undefined) return 'untracked';
	return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** The commit subjects are the report's whole value (D9). "11 commits" is a
 *  number; "generate breadcrumb and timeline positions from a declared index"
 *  is a person recognising that the page they wrote is out of date. */
function renderEntry(entry: RankedEdge, out: string[]): void {
	const score = String(entry.score).padStart(3, ' ');
	out.push(`${score}  ${entry.edge.referrer}  →  ${entry.edge.target}`);
	out.push(
		`     last changed ${formatDate(entry.referrerChanged)} · target ${formatDate(entry.targetChanged)}`,
	);

	const shown = entry.commits.slice(0, 3);
	for (const commit of shown) {
		out.push(`     ${commit.sha} ${commit.subject}`);
	}
	const remaining = entry.commits.length - shown.length;
	if (remaining > 0) out.push(`     … ${remaining} more`);
	out.push('');
}

export async function staleCommand(opts: StaleOptions): Promise<void> {
	const repoRoot = opts.repoRoot ?? process.cwd();
	const top = opts.top ?? 10;

	let result: ReturnType<typeof runStale>;
	try {
		// Content roots and both exclusion lists come from
		// `refrakt.config.json`. Nothing about this repository's folder names is
		// compiled in — every project's structure is its own.
		result = runStale({
			repoRoot,
			contentDirs: opts.contentDirs,
			edgeClass: opts.class as never,
			min: opts.min,
		});
	} catch (err) {
		if (err instanceof GitScanRefusal || err instanceof StaleConfigRefusal) {
			// Could not measure. Distinct from "measured, nothing wrong".
			if (opts.format === 'json') {
				process.stdout.write(`${JSON.stringify({ error: err.message, ranked: [] }, null, 2)}\n`);
			} else {
				process.stderr.write(`refrakt stale: ${err.message}\n`);
			}
			process.exit(1);
		}
		throw err;
	}

	const shown = result.ranked.slice(0, top);

	if (opts.format === 'json') {
		process.stdout.write(
			`${JSON.stringify(
				{
					ranked: shown.map((e) => ({
						referrer: e.edge.referrer,
						line: e.edge.line,
						target: e.edge.target,
						class: e.edge.class,
						score: e.score,
						referrerChanged: e.referrerChanged,
						targetChanged: e.targetChanged,
						commits: e.commits,
					})),
					totalNonZero: result.totalNonZero,
					baseRates: result.baseRates,
					scanned: result.index.edges.length,
					excluded: result.index.excluded,
				},
				null,
				2,
			)}\n`,
		);
		// Always zero. Findings are never a failure.
		process.exit(0);
	}

	const out: string[] = [];

	if (shown.length === 0) {
		out.push('No stale edges found.');
		out.push('');
		out.push(
			'A zero score is the absence of evidence of staleness, not evidence of freshness: the',
		);
		out.push('referrer side resets on any edit to the page, including one that changed nothing');
		out.push('about what it claims.');
	} else {
		out.push('Most likely stale, by commits to the target since the page last changed:');
		out.push('');
		for (const entry of shown) renderEntry(entry, out);

		if (result.totalNonZero > shown.length) {
			out.push(`… ${result.totalNonZero - shown.length} more non-zero edges (--top ${top}).`);
			out.push('');
		}
	}

	// The footer states each class's base rate, so degradation in an
	// extraction rule is visible rather than inferred.
	const rates = result.baseRates.map((r) => `${r.class} ${r.nonZero}/${r.scanned}`).join(', ');
	out.push(`Base rate — ${rates || 'no edges scanned'}.`);

	// What the project's config removed, stated every run. An exclusion list
	// that hides its own effect is how a report converges on empty without
	// anyone deciding that it should.
	const { archivalPages, generatedTargets } = result.index.excluded;
	if (archivalPages > 0 || generatedTargets > 0) {
		const parts: string[] = [];
		if (archivalPages > 0) parts.push(`${archivalPages} archival page(s) skipped`);
		if (generatedTargets > 0) parts.push(`${generatedTargets} edge(s) to generated targets`);
		out.push(`Excluded by config — ${parts.join(', ')}.`);
	}

	process.stdout.write(`${out.join('\n')}\n`);
	process.exit(0);
}
