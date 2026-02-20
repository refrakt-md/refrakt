import type { BehaviorFn, InitOptions } from './types.js';
import { isFrameworkManaged } from './utils.js';
import { copyBehavior } from './behaviors/copy.js';
import { accordionBehavior } from './behaviors/accordion.js';

/** Map of rune type → behavior function */
const behaviors: Record<string, BehaviorFn> = {
	accordion: accordionBehavior,
	accordionitem: accordionBehavior,
};

/**
 * Scan a container for rune elements and attach interactive behaviors.
 *
 * Discovers elements with `data-rune` attributes, checks for theme-framework
 * overrides (Alpine.js, Stimulus), and wires up the appropriate behavior.
 * Also enhances all `<pre>` elements with copy-to-clipboard buttons.
 *
 * Returns a cleanup function that removes all event listeners and injected elements.
 */
export function initRuneBehaviors(
	container: HTMLElement | Document = document,
	options?: InitOptions,
): () => void {
	const cleanups: Array<() => void> = [];

	// Rune-specific behaviors
	container.querySelectorAll<HTMLElement>('[data-rune]').forEach((el) => {
		const rune = el.getAttribute('data-rune')!;

		// Skip if a theme framework has claimed this element
		if (isFrameworkManaged(el)) return;

		// Apply filters
		if (options?.only && !options.only.includes(rune)) return;
		if (options?.exclude && options.exclude.includes(rune)) return;

		const fn = behaviors[rune];
		if (fn) {
			const cleanup = fn(el);
			if (cleanup) cleanups.push(cleanup);
		}
	});

	// Copy buttons for all code blocks (not rune-specific)
	const copyCleanup = copyBehavior(container);
	cleanups.push(copyCleanup);

	return () => cleanups.forEach((fn) => fn());
}

export { copyBehavior } from './behaviors/copy.js';
export { accordionBehavior } from './behaviors/accordion.js';
export type { BehaviorFn, CleanupFn, InitOptions } from './types.js';
