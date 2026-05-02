/**
 * Tiny Levenshtein-distance "did you mean?" helper for CLI suggestions.
 * Matches the implementation in `@refrakt-md/transform/node`'s `resolveSite`
 * helper — kept local here so the CLI doesn't depend on transform internals.
 */

export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i]![0] = i;
	for (let j = 0; j <= n; j++) dp[0]![j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
		}
	}
	return dp[m]![n]!;
}

/** Return the candidate closest to `input`, but only when distance ≤ 2.
 *  Returns undefined when there's no good match (avoids confusing suggestions). */
export function closestMatch(input: string, candidates: string[]): string | undefined {
	if (candidates.length === 0) return undefined;
	let best: { name: string; distance: number } | undefined;
	for (const candidate of candidates) {
		const distance = levenshtein(input, candidate);
		if (!best || distance < best.distance) {
			best = { name: candidate, distance };
		}
	}
	return best && best.distance <= 2 ? best.name : undefined;
}
