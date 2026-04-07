import type { RendererNode } from '@refrakt-md/types';
import { hasMatchingRunes } from '@refrakt-md/transform';
import { getBehaviorNames } from '@refrakt-md/behaviors';

/**
 * Check whether a rendered page tree contains any interactive runes
 * that require behavior initialization scripts.
 *
 * Used to conditionally include the behavior `<script>` tag,
 * shipping zero JS for static-only pages.
 */
export function hasInteractiveRunes(node: RendererNode): boolean {
	return hasMatchingRunes(node, getBehaviorNames());
}

/**
 * Generate the inline behavior initialization script for an Astro page.
 *
 * Supports both standard page loads and Astro View Transitions
 * via the `astro:page-load` event.
 */
export function behaviorScript(pages: unknown[], currentUrl: string): string {
	const contextData = JSON.stringify({ pages, currentUrl });
	return `
import { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

function init() {
  const contextEl = document.getElementById('rf-context');
  if (contextEl) {
    try {
      const ctx = JSON.parse(contextEl.textContent || '{}');
      RfContext.pages = ctx.pages;
      RfContext.currentUrl = ctx.currentUrl;
    } catch {}
  }
  registerElements();
  initRuneBehaviors();
  initLayoutBehaviors();
}

// Standard page load
init();

// View Transitions support — re-init after each navigation
document.addEventListener('astro:page-load', () => init());
`;
}
