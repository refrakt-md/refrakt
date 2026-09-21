import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		// The gallery harness uses Playwright (`*.spec.ts`), run separately via
		// `playwright test` — keep it out of the vitest run.
		exclude: [...configDefaults.exclude, 'packages/gallery-harness/**'],
		// Vitest's 5s/10s defaults assume unit tests. A good part of this suite
		// runs whole pipelines over real corpora, and the whole suite runs in
		// parallel across workers — so the slow tests contend with each other on
		// a 2-core CI runner and take far longer there than they do alone.
		//
		// That has cost a release: the run on `main` for #635 failed with
		// "Test timed out in 5000ms" on a plan pipeline test that takes 307ms in
		// isolation, which stopped the changesets step and left a changeset
		// unconsumed on the release PR.
		//
		// A raised limit does not weaken the suite: a test that genuinely hangs
		// still fails, just later. The default only ever fails healthy tests.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});
