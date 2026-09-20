import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import type { PipelineWarning } from '@refrakt-md/types';
import { loadContent } from '../src/site.js';
import { createSiteLoader } from '../src/loader.js';
import { formatPipelineSummary, stderrReporter } from '../src/format.js';
import type { PipelineStats } from '../src/pipeline.js';

const fixtureDir = path.resolve(import.meta.dirname, 'fixtures/site');

/** Collects reporter invocations so a test can assert on count as well as payload. */
function recordingReporter() {
	const calls: { stats: PipelineStats; warnings: PipelineWarning[] }[] = [];
	return {
		calls,
		reporter: (stats: PipelineStats, warnings: PipelineWarning[]) => {
			calls.push({ stats, warnings });
		},
	};
}

describe('pipeline reporter (SPEC-135 D5 / WORK-575)', () => {
	describe('the seam at loadContent', () => {
		it('calls the reporter once per load, with the stats and warnings the Site carries', async () => {
			const { calls, reporter } = recordingReporter();

			const site = await loadContent(fixtureDir, { reporter });

			expect(calls).toHaveLength(1);
			// Same data, not a re-derivation — a reporter that disagreed with
			// `site.pipelineWarnings` would let the CLI and the build report
			// different things, which is what D5a exists to prevent.
			expect(calls[0].stats).toEqual(site.pipelineStats);
			expect(calls[0].warnings).toEqual(site.pipelineWarnings);
		});

		it('is silent when no reporter is passed, so direct consumers are unchanged', async () => {
			const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
			try {
				await loadContent(fixtureDir);
				expect(write).not.toHaveBeenCalled();
			} finally {
				write.mockRestore();
			}
		});

		it('is silent for the positional form, which has no reporter slot', async () => {
			const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
			try {
				await loadContent(fixtureDir, '/');
				expect(write).not.toHaveBeenCalled();
			} finally {
				write.mockRestore();
			}
		});
	});

	describe('the positional form still works', () => {
		it('produces the same site through either signature', async () => {
			const positional = await loadContent(fixtureDir, '/');
			const bag = await loadContent(fixtureDir, { basePath: '/' });

			expect(bag.pages.map((p) => p.route.url)).toEqual(positional.pages.map((p) => p.route.url));
			expect(bag.pipelineWarnings).toEqual(positional.pipelineWarnings);
		});

		it('defaults basePath to "/" in both forms', async () => {
			const bare = await loadContent(fixtureDir);
			const bag = await loadContent(fixtureDir, {});

			expect(bag.pages.map((p) => p.route.url)).toEqual(bare.pages.map((p) => p.route.url));
		});
	});

	describe('stderrReporter', () => {
		it('writes exactly what the adapters used to write by hand', async () => {
			const site = await loadContent(fixtureDir);
			const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
			try {
				stderrReporter(site.pipelineStats, site.pipelineWarnings);

				expect(write).toHaveBeenCalledTimes(1);
				expect(write).toHaveBeenCalledWith(
					formatPipelineSummary(site.pipelineStats, site.pipelineWarnings),
				);
			} finally {
				write.mockRestore();
			}
		});
	});

	describe('the cache boundary', () => {
		// The dev-server behaviour WORK-575 exists for. The SvelteKit plugin
		// keeps the loader's cache on in dev (`dev: false` in
		// virtual-modules.ts) and drives reloads through `invalidate()`, so
		// "once per load" must mean once per *actual* load — not once per
		// request, which would print the summary on every navigation.
		it('reports once on cache fill and not again on cache hits', async () => {
			const { calls, reporter } = recordingReporter();
			const loader = createSiteLoader({ dirPath: fixtureDir, reporter });

			await loader.load();
			await loader.load();
			await loader.load();

			expect(calls).toHaveLength(1);
		});

		it('reports again after invalidate(), which is what an HMR reload triggers', async () => {
			const { calls, reporter } = recordingReporter();
			const loader = createSiteLoader({ dirPath: fixtureDir, reporter });

			await loader.load();
			loader.invalidate();
			await loader.load();

			expect(calls).toHaveLength(2);
		});

		it('defaults to stderr, so an adapter gets diagnostics without opting in', async () => {
			const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
			try {
				const loader = createSiteLoader({ dirPath: fixtureDir });
				await loader.load();

				expect(write).toHaveBeenCalledTimes(1);
			} finally {
				write.mockRestore();
			}
		});

		it('can be silenced explicitly', async () => {
			const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
			try {
				const loader = createSiteLoader({ dirPath: fixtureDir, reporter: () => {} });
				await loader.load();

				expect(write).not.toHaveBeenCalled();
			} finally {
				write.mockRestore();
			}
		});
	});
});
