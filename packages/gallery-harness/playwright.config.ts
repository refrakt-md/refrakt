import { defineConfig, devices } from '@playwright/test';

/**
 * Visual-regression config for the gallery harness. Deterministic by design:
 * a single pinned Chromium project, disabled animations/caret, and a
 * platform-free snapshot path (baselines are captured in the pinned CI
 * container — `mcr.microsoft.com/playwright` — so the platform suffix would
 * only add noise). `globalSetup` generates the gallery artifacts first.
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
