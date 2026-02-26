import type { CleanupFn } from '../types.js';

/**
 * Mobile menu behavior for layouts.
 *
 * Replaces Svelte reactive state ($state menuOpen/navOpen) with DOM-based toggling.
 * Discovers elements by data attributes and wires up:
 * - [data-mobile-menu-open] — opens the header menu panel
 * - [data-mobile-menu-close] — closes all panels
 * - [data-mobile-nav-toggle] — toggles the nav panel
 * - Escape key dismisses all open panels
 * - Body scroll lock when a panel is open
 *
 * Panels are toggled via [data-open] attribute. CSS should use:
 *   .rf-mobile-panel { display: none; }
 *   .rf-mobile-panel[data-open] { display: block; }
 */
export function mobileMenuBehavior(container: HTMLElement | Document): CleanupFn {
	const cleanups: Array<() => void> = [];
	const root = container instanceof Document ? container.documentElement : container;

	const panels = root.querySelectorAll<HTMLElement>('.rf-mobile-panel');
	if (panels.length === 0) return () => {};

	function closeAll() {
		panels.forEach(p => p.removeAttribute('data-open'));
		document.body.style.overflow = '';
	}

	function openPanel(panel: HTMLElement) {
		closeAll();
		panel.setAttribute('data-open', '');
		document.body.style.overflow = 'hidden';
	}

	// Open menu buttons — open the first non-nav panel
	const openBtns = root.querySelectorAll<HTMLElement>('[data-mobile-menu-open]');
	for (const btn of openBtns) {
		const handler = () => {
			const panel = root.querySelector<HTMLElement>('.rf-mobile-panel:not(.rf-mobile-panel--nav)');
			if (panel) openPanel(panel);
		};
		btn.addEventListener('click', handler);
		cleanups.push(() => btn.removeEventListener('click', handler));
	}

	// Close buttons
	const closeBtns = root.querySelectorAll<HTMLElement>('[data-mobile-menu-close]');
	for (const btn of closeBtns) {
		btn.addEventListener('click', closeAll);
		cleanups.push(() => btn.removeEventListener('click', closeAll));
	}

	// Nav panel toggle
	const navToggles = root.querySelectorAll<HTMLElement>('[data-mobile-nav-toggle]');
	for (const btn of navToggles) {
		const handler = () => {
			const navPanel = root.querySelector<HTMLElement>('.rf-mobile-panel--nav');
			if (!navPanel) return;
			if (navPanel.hasAttribute('data-open')) {
				closeAll();
			} else {
				openPanel(navPanel);
			}
		};
		btn.addEventListener('click', handler);
		cleanups.push(() => btn.removeEventListener('click', handler));
	}

	// Escape key
	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') closeAll();
	};
	document.addEventListener('keydown', onKeydown);
	cleanups.push(() => document.removeEventListener('keydown', onKeydown));

	return () => {
		closeAll();
		cleanups.forEach(fn => fn());
	};
}
