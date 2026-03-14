/**
 * Client-side runtime for @refrakt-md/html pages.
 *
 * Import this module in your client bundle to initialize interactive behaviors.
 * It reads page context from the embedded `<script id="rf-context">` element
 * and wires up all rune and layout behaviors.
 *
 * Usage:
 *   import { initPage } from '@refrakt-md/html/client';
 *   initPage();
 *
 * For SPA-style navigation where the DOM is replaced:
 *   import { initPage } from '@refrakt-md/html/client';
 *   // Call on each page swap — returns a cleanup function
 *   const cleanup = initPage();
 *   // Before swapping: cleanup();
 */

interface PageContext {
	pages: Array<{
		url: string;
		title: string;
		draft: boolean;
		description?: string;
		date?: string;
		author?: string;
		tags?: string[];
		image?: string;
		version?: string;
		versionGroup?: string;
	}>;
	currentUrl: string;
}

/**
 * Initialize all interactive behaviors for the current page.
 *
 * Reads context from the embedded JSON script, registers web component elements,
 * and initializes rune and layout behaviors.
 *
 * Returns a cleanup function that removes all behavior event listeners.
 */
export async function initPage(container: HTMLElement | Document = document): Promise<() => void> {
	// Dynamic import so tree-shaking works if behaviors aren't needed
	const { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } = await import('@refrakt-md/behaviors');

	// Read page context from embedded script
	const contextEl = (container === document ? document : container).querySelector?.('#rf-context');
	if (contextEl) {
		try {
			const ctx: PageContext = JSON.parse(contextEl.textContent ?? '{}');
			RfContext.pages = ctx.pages;
			RfContext.currentUrl = ctx.currentUrl;
		} catch {
			// Context parsing failed — behaviors will work without it
		}
	}

	registerElements();
	const cleanupRunes = initRuneBehaviors(container as HTMLElement);
	const cleanupLayout = initLayoutBehaviors(container as HTMLElement);

	return () => {
		cleanupRunes();
		cleanupLayout();
	};
}
