import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';

/**
 * Reusable visual-regression test registration for the refrakt gallery.
 *
 * A theme provides its generated gallery artifacts (`refrakt gallery`) and this
 * registers the Playwright tests: per-`data-gallery-cell` element screenshots
 * for the rune gallery (light + dark) and whole-page screenshots for each
 * layout fixture (per viewport). Baselines are stored per theme under
 * `__screenshots__/<theme>/…`. A second theme adopts the harness by calling
 * `registerGalleryTests` with its own artifacts + baselines — no logic copy.
 */

/** Runes whose rendered output is non-deterministic in a screenshot — network
 *  tiles / external iframes / embeds. Excluded from baselines (the gallery
 *  still renders them; we just don't snapshot them). */
export const DEFAULT_EXCLUDED_RUNES = ['map', 'sandbox', 'embed'];

export interface Viewport {
	name: string;
	width: number;
	height: number;
}

/** Viewports for whole-page layout screenshots (responsive chrome coverage). */
export const DEFAULT_VIEWPORTS: Viewport[] = [
	{ name: 'mobile', width: 390, height: 844 },
	{ name: 'tablet', width: 768, height: 1024 },
	{ name: 'desktop', width: 1280, height: 900 },
];

/** Wait for fonts to load and the inlined behaviors (initPage, run on
 *  DOMContentLoaded) to enhance the DOM, so the screenshot is of the settled
 *  page. Animations/transitions are already disabled by the gallery CSS. */
async function settle(page: Page): Promise<void> {
	await page.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready);
	await page.waitForTimeout(250);
}

export interface LayoutArtifact {
	name: string;
	light: string;
	dark: string;
}

export interface GalleryArtifacts {
	/** Theme name — namespaces the baselines (`<theme>/…`). */
	theme: string;
	/** Absolute paths to the rune-gallery HTML files. */
	runeGallery: { light: string; dark: string };
	/** Absolute paths to the per-layout fixture HTML files. */
	layouts: LayoutArtifact[];
	/** Runes to skip (default: network/iframe runes). */
	excludeRunes?: string[];
	/** Viewports for layout shots (default: mobile/tablet/desktop). */
	viewports?: Viewport[];
}

export function registerGalleryTests(artifacts: GalleryArtifacts): void {
	const exclude = new Set(artifacts.excludeRunes ?? DEFAULT_EXCLUDED_RUNES);
	const viewports = artifacts.viewports ?? DEFAULT_VIEWPORTS;
	const { theme } = artifacts;

	// Rune gallery — per-cell element clips, per mode. A diff localises to the
	// rune that changed.
	for (const mode of ['light', 'dark'] as const) {
		test(`${theme} · runes (${mode})`, async ({ page }) => {
			await page.goto(pathToFileURL(artifacts.runeGallery[mode]).href);
			await settle(page);
			const cells = page.locator('[data-gallery-cell]');
			const count = await cells.count();
			for (let i = 0; i < count; i++) {
				const cell = cells.nth(i);
				const rune = (await cell.getAttribute('data-rune')) ?? '';
				if (exclude.has(rune)) continue;
				const anchor = (await cell.getAttribute('data-gallery-cell')) ?? `cell-${i}`;
				await expect(cell).toHaveScreenshot(`${theme}/runes/${mode}/${anchor}.png`);
			}
		});
	}

	// Layout fixtures — whole-page, per mode, per viewport.
	for (const layout of artifacts.layouts) {
		for (const mode of ['light', 'dark'] as const) {
			for (const vp of viewports) {
				test(`${theme} · layout ${layout.name} (${mode}, ${vp.name})`, async ({ page }) => {
					await page.setViewportSize({ width: vp.width, height: vp.height });
					await page.goto(pathToFileURL(layout[mode]).href);
					await settle(page);
					await expect(page).toHaveScreenshot(`${theme}/layouts/${layout.name}-${mode}-${vp.name}.png`, { fullPage: true });
				});
			}
		}
	}
}
