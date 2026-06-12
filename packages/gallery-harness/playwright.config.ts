import { defineConfig, devices } from '@playwright/test';

/**
 * Visual-regression config for the gallery harness. Deterministic by design:
 * a single pinned Chromium project, disabled animations/caret, and a
 * platform-free snapshot path. Baselines under `__screenshots__/` are
 * **ephemeral and gitignored** (capture-then-compare / compare-against-base) —
 * not committed golden PNGs — so capture them in the pinned container
 * (`mcr.microsoft.com/playwright`). `globalSetup` generates the gallery first.
 */
export default defineConfig({
	testDir: './tests',
	globalSetup: './global-setup.ts',
	// Baselines live under __screenshots__/<the name passed to toHaveScreenshot>.
	snapshotPathTemplate: '{testDir}/../__screenshots__/{arg}{ext}',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: process.env.CI ? 'github' : 'list',
	expect: {
		toHaveScreenshot: {
			animations: 'disabled',
			caret: 'hide',
			maxDiffPixelRatio: 0,
		},
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
