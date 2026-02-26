import type { BehaviorFn, InitOptions } from './types.js';
import { isFrameworkManaged } from './utils.js';
import { copyBehavior } from './behaviors/copy.js';
import { accordionBehavior } from './behaviors/accordion.js';
import { tabsBehavior } from './behaviors/tabs.js';
import { revealBehavior } from './behaviors/reveal.js';
import { datatableBehavior } from './behaviors/datatable.js';
import { formBehavior } from './behaviors/form.js';
import { previewBehavior } from './behaviors/preview.js';
import { scrollspyBehavior } from './behaviors/scrollspy.js';
import { mobileMenuBehavior } from './behaviors/mobile-menu.js';

/** Map of rune type → behavior function */
const behaviors: Record<string, BehaviorFn> = {
	accordion: accordionBehavior,
	accordionitem: accordionBehavior,
	tabgroup: tabsBehavior,
	codegroup: tabsBehavior,
	reveal: revealBehavior,
	datatable: datatableBehavior,
	form: formBehavior,
	preview: previewBehavior,
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

	// Scroll-spy for "On This Page" navigation (not rune-specific)
	const scrollspyCleanup = scrollspyBehavior(container);
	cleanups.push(scrollspyCleanup);

	return () => cleanups.forEach((fn) => fn());
}

/** Map of layout behavior name → behavior function */
const layoutBehaviors: Record<string, (container: HTMLElement | Document) => () => void> = {
	'mobile-menu': mobileMenuBehavior,
};

/**
 * Scan a container for layout elements and attach interactive behaviors.
 *
 * Discovers elements with `data-layout-behaviors` attributes and wires up
 * the appropriate behaviors (e.g., mobile-menu toggle).
 *
 * Returns a cleanup function that removes all event listeners.
 */
export function initLayoutBehaviors(
	container: HTMLElement | Document = document,
): () => void {
	const cleanups: Array<() => void> = [];

	container.querySelectorAll<HTMLElement>('[data-layout-behaviors]').forEach((el) => {
		const names = (el.getAttribute('data-layout-behaviors') ?? '').split(' ');
		for (const name of names) {
			const fn = layoutBehaviors[name];
			if (fn) {
				const cleanup = fn(el);
				if (cleanup) cleanups.push(cleanup);
			}
		}
	});

	return () => cleanups.forEach((fn) => fn());
}

export { copyBehavior } from './behaviors/copy.js';
export { accordionBehavior } from './behaviors/accordion.js';
export { tabsBehavior } from './behaviors/tabs.js';
export { revealBehavior } from './behaviors/reveal.js';
export { datatableBehavior } from './behaviors/datatable.js';
export { formBehavior } from './behaviors/form.js';
export { previewBehavior } from './behaviors/preview.js';
export { scrollspyBehavior } from './behaviors/scrollspy.js';
export { mobileMenuBehavior } from './behaviors/mobile-menu.js';
export type { BehaviorFn, CleanupFn, InitOptions } from './types.js';
