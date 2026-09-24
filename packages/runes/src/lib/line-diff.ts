/**
 * Line-level LCS diff.
 *
 * Extracted from `tags/diff.ts` (WORK-592), where it was module-local, so that
 * both the `diff` rune and the `snippet review` terminal renderer read one
 * implementation. A pure move: the algorithm is unchanged.
 */

export interface DiffHunk {
	type: 'equal' | 'add' | 'remove';
	text: string;
}

/**
 * Compute a line-level diff using LCS (Longest Common Subsequence).
 *
 * Returns hunks with type and raw text. Presentation — highlighting, gutters,
 * terminal colour — is the caller's.
 */
export function computeLineDiff(before: string, after: string): DiffHunk[] {
	const a = before.split('\n');
	const b = after.split('\n');

	// Build LCS table
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	}

	// Backtrack to produce hunks
	let i = m;
	let j = n;
	const stack: DiffHunk[] = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			stack.push({ type: 'equal', text: a[i - 1] });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			stack.push({ type: 'add', text: b[j - 1] });
			j--;
		} else {
			stack.push({ type: 'remove', text: a[i - 1] });
			i--;
		}
	}

	stack.reverse();
	return stack;
}

/**
 * A one-line summary of what changed between two slices.
 *
 * D7's example reads "+2 fields, 1 removed", which requires *interpreting* the
 * diff rather than reporting it. The spec left the granularity open; this is
 * the settled answer, and the reasoning is recorded because it was a real
 * choice:
 *
 * Counting added and removed lines is cheap and honest. Naming *fields* would
 * mean parsing the slice, which needs a language-aware layer this feature does
 * not have and SPEC-131 D1 deliberately declined to build. A count that says
 * "3 added, 1 removed" tells an author how much to expect; a count that claimed
 * "2 fields" while actually counting lines would be worse than the cheap
 * version, because it would sound authoritative.
 */
export function summarizeDiff(before: string, after: string): string {
	const hunks = computeLineDiff(before, after);
	const added = hunks.filter((h) => h.type === 'add').length;
	const removed = hunks.filter((h) => h.type === 'remove').length;

	if (added === 0 && removed === 0) return 'no line changes';
	const parts: string[] = [];
	if (added > 0) parts.push(`+${added} line${added === 1 ? '' : 's'}`);
	if (removed > 0) parts.push(`-${removed} line${removed === 1 ? '' : 's'}`);
	return parts.join(', ');
}
