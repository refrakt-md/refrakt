import type { RendererNode, SerializedTag } from '@refrakt-md/types';

/** Rune types that require client-side behavior initialization */
const INTERACTIVE_RUNES = new Set([
	'tabs', 'accordion', 'code-group', 'reveal', 'data-table',
	'form', 'preview', 'gallery', 'juxtapose',
]);

/**
 * Check whether a rendered page tree contains any interactive runes
 * that require behavior initialization scripts.
 *
 * Used to conditionally include the behavior `<script>` tag,
 * shipping zero JS for static-only pages.
 */
export function hasInteractiveRunes(node: RendererNode): boolean {
	if (node === null || node === undefined || typeof node === 'string' || typeof node === 'number') {
		return false;
	}
	if (Array.isArray(node)) {
		return node.some(child => hasInteractiveRunes(child as RendererNode));
	}
	const tag = node as SerializedTag;
	if (tag.attributes) {
		const runeType = tag.attributes['data-rune'] as string | undefined;
		if (runeType && INTERACTIVE_RUNES.has(runeType)) {
			return true;
		}
		// Layout behaviors (mobile-menu, search) also need initialization
		if (tag.attributes['data-layout-behaviors']) {
			return true;
		}
	}
	if (tag.children) {
		return tag.children.some(child => hasInteractiveRunes(child as RendererNode));
	}
	return false;
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
