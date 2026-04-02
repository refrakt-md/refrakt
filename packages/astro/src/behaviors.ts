import type { RendererNode, SerializedTag } from '@refrakt-md/types';
import { getBehaviorNames } from '@refrakt-md/behaviors';

/**
 * Check whether a rendered page tree contains any interactive runes
 * that require behavior initialization scripts.
 *
 * Queries the behavior registry from `@refrakt-md/behaviors` to determine
 * which rune types are interactive — automatically includes both core
 * and community-registered behaviors.
 *
 * Used to conditionally include the behavior `<script>` tag,
 * shipping zero JS for static-only pages.
 */
export function hasInteractiveRunes(node: RendererNode): boolean {
	const interactiveRunes = getBehaviorNames();
	return _hasInteractive(node, interactiveRunes);
}

function _hasInteractive(node: RendererNode, interactiveRunes: Set<string>): boolean {
	if (node === null || node === undefined || typeof node === 'string' || typeof node === 'number') {
		return false;
	}
	if (Array.isArray(node)) {
		return node.some(child => _hasInteractive(child as RendererNode, interactiveRunes));
	}
	const tag = node as SerializedTag;
	if (tag.attributes) {
		const runeType = tag.attributes['data-rune'] as string | undefined;
		if (runeType && interactiveRunes.has(runeType)) {
			return true;
		}
		// Layout behaviors (mobile-menu, search) also need initialization
		if (tag.attributes['data-layout-behaviors']) {
			return true;
		}
	}
	if (tag.children) {
		return tag.children.some(child => _hasInteractive(child as RendererNode, interactiveRunes));
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
