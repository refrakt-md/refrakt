import type { BehaviorFn, InitOptions } from './types.js';
import { isFrameworkManaged } from './utils.js';
import { copyBehavior } from './behaviors/copy.js';
import { accordionBehavior } from './behaviors/accordion.js';
import { drawerBehavior } from './behaviors/drawer.js';
import { tabsBehavior } from './behaviors/tabs.js';
import { revealBehavior } from './behaviors/reveal.js';
import { datatableBehavior } from './behaviors/datatable.js';
import { formBehavior } from './behaviors/form.js';
import { previewBehavior } from './behaviors/preview.js';
import { mockupBehavior } from './behaviors/mockup.js';
import { scrollspyBehavior } from './behaviors/scrollspy.js';
import { scrollRevealBehavior } from './behaviors/scroll-reveal.js';
import { versionSwitcherBehavior } from './behaviors/version-switcher.js';
import { mobileMenuBehavior } from './behaviors/mobile-menu.js';
import { searchBehavior } from './behaviors/search.js';
import { themeToggleBehavior } from './behaviors/theme-toggle.js';
import { sectionNavBehavior } from './behaviors/section-nav.js';
import { galleryBehavior } from './behaviors/gallery.js';
import { carouselBehavior } from './behaviors/carousel.js';
import { juxtaposeBehavior } from './behaviors/juxtapose.js';
import { navCollapsibleBehavior } from './behaviors/nav-collapsible.js';
import { navMenubarBehavior } from './behaviors/nav-menubar.js';
import type { CleanupFn } from './types.js';

function navBehavior(el: HTMLElement): CleanupFn {
	const cleanups: CleanupFn[] = [];
	const collapsible = navCollapsibleBehavior(el);
	if (collapsible) cleanups.push(collapsible);
	const menubar = navMenubarBehavior(el);
	if (menubar) cleanups.push(menubar);
	return () => cleanups.forEach((fn) => fn?.());
}

/** Map of rune type → behavior function (mutable — packages can register additional behaviors) */
const behaviors: Record<string, BehaviorFn> = {
	accordion: accordionBehavior,
	'accordion-item': accordionBehavior,
	'tab-group': tabsBehavior,
	'code-group': tabsBehavior,
	reveal: revealBehavior,
	'data-table': datatableBehavior,
	form: formBehavior,
	preview: previewBehavior,
	mockup: mockupBehavior,
	gallery: galleryBehavior,
	juxtapose: juxtaposeBehavior,
	nav: navBehavior,
	drawer: drawerBehavior,
};

/**
 * Register additional behavior functions (e.g., from community/official packages).
 * New entries are added; existing entries are NOT overwritten.
 * Use overrideBehavior() to explicitly replace an existing behavior.
 */
export function registerBehaviors(additional: Record<string, BehaviorFn>): void {
	for (const [name, fn] of Object.entries(additional)) {
		if (!(name in behaviors)) {
			behaviors[name] = fn;
		}
	}
}

/**
 * Replace a registered behavior with a new implementation.
 * Use this when a package explicitly overrides a core behavior.
 */
export function overrideBehavior(name: string, fn: BehaviorFn): void {
	behaviors[name] = fn;
}

/**
 * Map of `data-layout` value → block-agnostic behavior (SPEC-100).
 *
 * Unlike `behaviors` (keyed by `data-rune`), these bind on `[data-layout="<value>"]`
 * regardless of the host's rune — so a *layout mode* such as `carousel` can be
 * adopted by any rune through config + the shared DOM contract, with no per-rune
 * behavior code. Mounted by `initRuneBehaviors`.
 */
const layoutModeBehaviors: Record<string, BehaviorFn> = {
	carousel: carouselBehavior,
};

/**
 * Register block-agnostic behaviors keyed by `data-layout` value (e.g.
 * `{ carousel: carouselBehavior }`). New entries are added; existing entries are
 * NOT overwritten (mirrors {@link registerBehaviors}).
 */
export function registerLayoutModeBehaviors(additional: Record<string, BehaviorFn>): void {
	for (const [name, fn] of Object.entries(additional)) {
		if (!(name in layoutModeBehaviors)) {
			layoutModeBehaviors[name] = fn;
		}
	}
}

/** Names of the `data-layout` values that have a registered layout-mode behavior. */
export function getLayoutModeBehaviorNames(): Set<string> {
	return new Set(Object.keys(layoutModeBehaviors));
}

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

		// SPEC-090 — a presentational media guest (demoted under a whole-tile link,
		// or a cover backdrop) is not enhanced: it renders its static fallback and
		// stays non-interactive (the engine also sets pointer-events:none on it).
		if (el.closest('[data-guest-posture="presentational"]')) return;

		// Apply filters
		if (options?.only && !options.only.includes(rune)) return;
		if (options?.exclude && options.exclude.includes(rune)) return;

		const fn = behaviors[rune];
		if (fn) {
			const cleanup = fn(el);
			if (cleanup) cleanups.push(cleanup);
		}
	});

	// Attribute-triggered layout-mode behaviors (SPEC-100). Bound on
	// `[data-layout="<value>"]` independent of `data-rune`, so a layout mode
	// (e.g. carousel) works on any adopting rune with zero per-rune behavior code.
	// A host may run both its rune behavior and a layout-mode behavior (e.g.
	// gallery: lightbox + carousel) — these are distinct concerns, not a
	// double-mount; each layout-mode behavior mounts at most once per host.
	container.querySelectorAll<HTMLElement>('[data-layout]').forEach((el) => {
		if (isFrameworkManaged(el)) return;
		if (el.closest('[data-guest-posture="presentational"]')) return;
		const layout = el.getAttribute('data-layout')!;
		const fn = layoutModeBehaviors[layout];
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

	// Scroll-reveal motion (SPEC-105) — sets the root data-animate gate +
	// data-in-view as containers scroll in (not rune-specific; keys on the
	// data-reveal attribute, not data-rune).
	const scrollRevealCleanup = scrollRevealBehavior(container);
	cleanups.push(scrollRevealCleanup);

	// Version switcher for versioned pages (not rune-specific)
	const versionSwitcherCleanup = versionSwitcherBehavior(container);
	cleanups.push(versionSwitcherCleanup);

	return () => cleanups.forEach((fn) => fn());
}

/** Map of layout behavior name → behavior function */
const layoutBehaviors: Record<string, (container: HTMLElement | Document) => () => void> = {
	'mobile-menu': mobileMenuBehavior,
	'search': searchBehavior,
	'theme-toggle': themeToggleBehavior,
	'section-nav': sectionNavBehavior,
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

/**
 * Return the set of rune type names that have registered behaviors.
 *
 * Useful for adapters that need to detect at build time whether a page
 * contains interactive runes (e.g., to conditionally include behavior scripts).
 * Includes both core and community-registered behaviors.
 */
export function getBehaviorNames(): Set<string> {
	return new Set(Object.keys(behaviors));
}

export { copyBehavior } from './behaviors/copy.js';
export { accordionBehavior } from './behaviors/accordion.js';
export { drawerBehavior } from './behaviors/drawer.js';
export { tabsBehavior } from './behaviors/tabs.js';
export { revealBehavior } from './behaviors/reveal.js';
export { datatableBehavior } from './behaviors/datatable.js';
export { formBehavior } from './behaviors/form.js';
export { previewBehavior } from './behaviors/preview.js';
export { scrollspyBehavior } from './behaviors/scrollspy.js';
export { scrollRevealBehavior } from './behaviors/scroll-reveal.js';
export { versionSwitcherBehavior } from './behaviors/version-switcher.js';
export { mobileMenuBehavior } from './behaviors/mobile-menu.js';
export { sectionNavBehavior } from './behaviors/section-nav.js';
export { searchBehavior } from './behaviors/search.js';
export { themeToggleBehavior } from './behaviors/theme-toggle.js';
export { galleryBehavior } from './behaviors/gallery.js';
export { carouselBehavior } from './behaviors/carousel.js';
export { juxtaposeBehavior } from './behaviors/juxtapose.js';
export { navCollapsibleBehavior } from './behaviors/nav-collapsible.js';
export { navMenubarBehavior } from './behaviors/nav-menubar.js';
export type { BehaviorFn, CleanupFn, InitOptions } from './types.js';

// Web component elements — framework-neutral custom elements for interactive runes
export { registerElements, RfContext, RfDiagram, RfNav, RfMap, RfSandbox } from './elements/index.js';
export type { PageEntry, DesignTokens } from './elements/index.js';
