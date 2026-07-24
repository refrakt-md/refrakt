import type { CleanupFn } from '../types.js';
import { bstr } from '../i18n.js';

/**
 * Mobile menu behavior for layouts.
 *
 * Replaces Svelte reactive state ($state menuOpen/navOpen) with DOM-based toggling.
 * Discovers elements by data attributes and wires up:
 * - [data-mobile-menu-toggle] — toggles the header menu panel (open ↔ close)
 * - [data-mobile-menu-open] — opens the header menu panel (legacy)
 * - [data-mobile-menu-close] — closes all panels
 * - [data-mobile-nav-toggle] — toggles the nav panel
 * - Escape key dismisses all open panels
 * - Body scroll lock when a panel is open
 *
 * Panels are toggled via [data-open] attribute. Triggers reflect state via
 * `aria-expanded` and a matching `aria-label`. CSS should use:
 *   .rf-mobile-panel { display: none; }
 *   .rf-mobile-panel[data-open] { display: block; }
 */
export function mobileMenuBehavior(container: HTMLElement | Document): CleanupFn {
	const cleanups: Array<() => void> = [];
	const root = container instanceof Document ? container.documentElement : container;

	const panels = root.querySelectorAll<HTMLElement>('.rf-mobile-panel');
	if (panels.length === 0) return () => {};

	const mainPanel = root.querySelector<HTMLElement>('.rf-mobile-panel:not(.rf-mobile-panel--nav)');
	const navPanel = root.querySelector<HTMLElement>('.rf-mobile-panel--nav');
	const menuToggles = root.querySelectorAll<HTMLElement>('[data-mobile-menu-toggle], [data-mobile-menu-open]');
	const navToggles = root.querySelectorAll<HTMLElement>('[data-mobile-nav-toggle]');

	function syncTriggers() {
		const mainOpen = !!mainPanel?.hasAttribute('data-open');
		menuToggles.forEach(btn => {
			btn.setAttribute('aria-expanded', mainOpen ? 'true' : 'false');
			btn.setAttribute('aria-label', mainOpen ? bstr('behavior.mobileMenu.close') : bstr('behavior.mobileMenu.open'));
		});
		const navOpen = !!navPanel?.hasAttribute('data-open');
		navToggles.forEach(btn => {
			btn.setAttribute('aria-expanded', navOpen ? 'true' : 'false');
		});
	}

	function closeAll() {
		panels.forEach(p => p.removeAttribute('data-open'));
		document.body.style.overflow = '';
		syncTriggers();
	}

	function openPanel(panel: HTMLElement) {
		panels.forEach(p => {
			if (p !== panel) p.removeAttribute('data-open');
		});
		panel.setAttribute('data-open', '');
		document.body.style.overflow = 'hidden';
		syncTriggers();
	}

	// Header menu toggle — same button opens and closes
	for (const btn of menuToggles) {
		const handler = () => {
			if (!mainPanel) return;
			if (mainPanel.hasAttribute('data-open')) {
				closeAll();
			} else {
				openPanel(mainPanel);
			}
		};
		btn.addEventListener('click', handler);
		cleanups.push(() => btn.removeEventListener('click', handler));
	}

	// Explicit close buttons (kept for themes that still wire them)
	const closeBtns = root.querySelectorAll<HTMLElement>('[data-mobile-menu-close]');
	for (const btn of closeBtns) {
		btn.addEventListener('click', closeAll);
		cleanups.push(() => btn.removeEventListener('click', closeAll));
	}

	// Nav panel toggle (e.g. docs toolbar hamburger)
	for (const btn of navToggles) {
		const handler = () => {
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

	syncTriggers();

	return () => {
		closeAll();
		cleanups.forEach(fn => fn());
	};
}
