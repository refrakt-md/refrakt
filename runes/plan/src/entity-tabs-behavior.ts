import { tabsBehavior } from '@refrakt-md/behaviors';
import type { CleanupFn } from '@refrakt-md/behaviors';

/**
 * Composite behavior for plan entity tab groups.
 *
 * Wraps tabsBehavior (ARIA wiring, keyboard nav, panel switching) and adds:
 * - Anchor navigation coordination: when the user clicks a TOC link or
 *   section-nav entry pointing to a heading inside an inactive panel,
 *   activates that panel first so the browser can scroll to the target.
 * - Exposes the active tab name as a data attribute on the container
 *   so CSS can dim the TOC when a non-Overview tab is active.
 */
export function entityTabsBehavior(el: HTMLElement): CleanupFn {
	const tabsCleanup = tabsBehavior(el);

	const cleanups: Array<() => void> = [];

	const tabBar = el.querySelector<HTMLElement>('[data-name="tabs"]');
	const panelsContainer = el.querySelector<HTMLElement>('[data-name="panels"]');
	if (!tabBar || !panelsContainer) return tabsCleanup;

	const buttons = Array.from(tabBar.querySelectorAll<HTMLButtonElement>('button[role="tab"]'));
	const panels = Array.from(panelsContainer.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

	// Set initial active-tab data attribute
	el.setAttribute('data-active-tab', buttons[0]?.getAttribute('data-tab') ?? 'overview');

	// Watch for tab changes to update the data-active-tab attribute
	const observer = new MutationObserver(() => {
		const activeButton = buttons.find(b => b.getAttribute('aria-selected') === 'true');
		if (activeButton) {
			el.setAttribute('data-active-tab', activeButton.getAttribute('data-tab') ?? '');
		}
	});
	for (const btn of buttons) {
		observer.observe(btn, { attributes: true, attributeFilter: ['aria-selected'] });
	}
	cleanups.push(() => observer.disconnect());

	/**
	 * Given a target element ID, find which panel contains it and activate that panel.
	 * Returns true if a panel switch occurred.
	 */
	function activatePanelForTarget(targetId: string): boolean {
		const target = document.getElementById(targetId);
		if (!target) return false;

		// Find which panel contains this target
		const containingPanel = panels.find(p => p.contains(target));
		if (!containingPanel) return false;

		// If already active, no switch needed
		if (containingPanel.getAttribute('data-state') === 'active') return false;

		// Find the button index for this panel and click it
		const panelIndex = panels.indexOf(containingPanel);
		if (panelIndex >= 0 && buttons[panelIndex]) {
			buttons[panelIndex].click();
			return true;
		}
		return false;
	}

	// Intercept anchor clicks from TOC and section-nav
	const onAnchorClick = (e: MouseEvent) => {
		const link = (e.target as HTMLElement).closest('a[href^="#"]');
		if (!link) return;

		const targetId = (link as HTMLAnchorElement).getAttribute('href')?.slice(1);
		if (!targetId) return;

		// Only intercept if the target is inside our tab panels
		const target = document.getElementById(targetId);
		if (!target || !panelsContainer.contains(target)) return;

		if (activatePanelForTarget(targetId)) {
			// Panel was switched — re-scroll after the panel becomes visible
			e.preventDefault();
			requestAnimationFrame(() => {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			});
		}
	};
	document.addEventListener('click', onAnchorClick);
	cleanups.push(() => document.removeEventListener('click', onAnchorClick));

	// Handle back/forward navigation with hash changes
	const onHashChange = () => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			activatePanelForTarget(hash);
		}
	};
	window.addEventListener('hashchange', onHashChange);
	cleanups.push(() => window.removeEventListener('hashchange', onHashChange));

	return () => {
		tabsCleanup();
		el.removeAttribute('data-active-tab');
		cleanups.forEach(fn => fn());
	};
}
