import type { PipelineWarning } from '@refrakt-md/types';
import type { PipelineStats } from './pipeline.js';

const ICON = {
	error: '✗  error',
	warning: '⚠  warn ',
	info: 'ℹ  info ',
} as const;

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));

/**
 * Format the cross-page pipeline's Phase 1/2/3/4 stats and the collected
 * warnings as a single multi-line string suitable for writing to stderr.
 *
 * Adapters call this after `loadContent` (or equivalent) completes so users
 * see the same build summary across every framework — currently the
 * SvelteKit plugin prints this; other adapters were silent.
 *
 * The function is pure — caller decides where to write. Empty / minimal
 * builds produce a single status line; builds with warnings interleave
 * each warning on its own line.
 *
 * ```
 *   Phase 1: Parse                 162 pages
 *   Phase 2: Register              847 entities
 *   Phase 3: Aggregate             14 packages
 *   Phase 4: Post-process          162 pages
 *
 *   ⚠  warn   some message  /some/url
 *
 *   ✓  Build complete (0 errors, 1 warning)
 * ```
 */
export function formatPipelineSummary(
	stats: PipelineStats,
	warnings: PipelineWarning[],
): string {
	const lines: string[] = [];
	lines.push(`  ${pad('Phase 1: Parse', 30)} ${stats.pageCount} pages`);
	lines.push(`  ${pad('Phase 2: Register', 30)} ${stats.entityCount} entities`);
	lines.push(`  ${pad('Phase 3: Aggregate', 30)} ${stats.packageCount} packages`);
	lines.push(`  ${pad('Phase 4: Post-process', 30)} ${stats.pageCount} pages`);

	const errorCount = warnings.filter(w => w.severity === 'error').length;
	const warnCount = warnings.filter(w => w.severity === 'warning').length;

	for (const w of warnings) {
		const icon = ICON[w.severity];
		const location = w.url ? `  ${w.url}` : '';
		lines.push('');
		lines.push(`  ${icon}  ${w.message}${location}`);
	}

	const status = errorCount > 0 ? '✗' : '✓';
	lines.push('');
	lines.push(
		`  ${status}  Build complete (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''})`,
	);
	lines.push('');

	return lines.map(l => l + '\n').join('');
}
