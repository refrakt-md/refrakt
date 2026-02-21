import type { CleanupFn } from '../types.js';
import { uniqueId } from '../utils.js';

/**
 * Tabs behavior for `[data-rune="tabgroup"]` and `[data-rune="codegroup"]`.
 *
 * Discovers Tab/TabPanel items in the identity-transformed HTML structure,
 * creates a tablist bar with buttons, and toggles panel visibility.
 *
 * - ArrowLeft/ArrowRight keyboard navigation (with wrapping)
 * - Home/End jump to first/last tab
 * - ARIA: role="tablist", role="tab", role="tabpanel", aria-selected, aria-controls
 */
export function tabsBehavior(el: HTMLElement): CleanupFn {
	const ul = el.querySelector('ul');
	if (!ul) return () => {};

	const items = Array.from(ul.children).filter(
		(c): c is HTMLElement => c instanceof HTMLElement && c.tagName === 'LI',
	);

	// Separate Tab items from TabPanel items
	const tabItems: HTMLElement[] = [];
	const panelItems: HTMLElement[] = [];

	for (const item of items) {
		const typeof_ = item.getAttribute('typeof');
		if (typeof_ === 'Tab') {
			tabItems.push(item);
		} else if (typeof_ === 'TabPanel') {
			panelItems.push(item);
		}
	}

	if (tabItems.length === 0 || panelItems.length === 0) return () => {};

	// Extract tab names from Tab items
	const tabNames: string[] = tabItems.map((item) => {
		const nameEl = item.querySelector('[property="name"]');
		return nameEl?.textContent?.trim() || item.textContent?.trim() || '';
	});

	// Generate IDs for ARIA wiring
	const tabIds = tabNames.map(() => uniqueId('rf-tab'));
	const panelIds = panelItems.map(() => uniqueId('rf-tabpanel'));

	// Create tab bar
	const tabBar = document.createElement('div');
	tabBar.setAttribute('role', 'tablist');
	tabBar.className = el.getAttribute('data-rune') === 'codegroup'
		? 'rf-codegroup__tabs'
		: 'rf-tabs__bar';

	const buttonClass = el.getAttribute('data-rune') === 'codegroup'
		? 'rf-codegroup__tab'
		: 'rf-tabs__button';

	const buttons: HTMLButtonElement[] = tabNames.map((name, i) => {
		const btn = document.createElement('button');
		btn.className = buttonClass;
		btn.setAttribute('role', 'tab');
		btn.setAttribute('aria-selected', String(i === 0));
		btn.id = tabIds[i];
		if (panelIds[i]) btn.setAttribute('aria-controls', panelIds[i]);
		btn.textContent = name;
		tabBar.appendChild(btn);
		return btn;
	});

	// Insert tab bar — for codegroup, after topbar; for tabs, before the ul
	const topbar = el.querySelector('[data-name="topbar"]');
	if (topbar) {
		topbar.after(tabBar);
	} else {
		ul.before(tabBar);
	}

	// Set up panels with ARIA attributes
	for (let i = 0; i < panelItems.length; i++) {
		panelItems[i].setAttribute('role', 'tabpanel');
		if (panelIds[i]) panelItems[i].id = panelIds[i];
		if (tabIds[i]) panelItems[i].setAttribute('aria-labelledby', tabIds[i]);
	}

	// Hide Tab label items (replaced by tablist buttons)
	for (const item of tabItems) {
		item.hidden = true;
	}

	let activeIndex = 0;

	function setActive(index: number) {
		activeIndex = index;
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute('aria-selected', String(i === activeIndex));
			buttons[i].classList.toggle(`${buttonClass}--active`, i === activeIndex);
		}
		for (let i = 0; i < panelItems.length; i++) {
			panelItems[i].hidden = i !== activeIndex;
		}
	}

	// Initial state
	setActive(0);

	// Click handlers
	const cleanups: Array<() => void> = [];

	for (let i = 0; i < buttons.length; i++) {
		const handler = () => setActive(i);
		buttons[i].addEventListener('click', handler);
		cleanups.push(() => buttons[i].removeEventListener('click', handler));
	}

	// Keyboard navigation
	const onKeydown = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement;
		const index = buttons.indexOf(target as HTMLButtonElement);
		if (index === -1) return;

		let next: number | null = null;

		switch (e.key) {
			case 'ArrowRight':
				next = (index + 1) % buttons.length;
				break;
			case 'ArrowLeft':
				next = (index - 1 + buttons.length) % buttons.length;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = buttons.length - 1;
				break;
			default:
				return;
		}

		if (next !== null) {
			e.preventDefault();
			buttons[next].focus();
			setActive(next);
		}
	};

	tabBar.addEventListener('keydown', onKeydown);
	cleanups.push(() => tabBar.removeEventListener('keydown', onKeydown));

	return () => {
		cleanups.forEach((fn) => fn());

		// Restore DOM: remove tab bar, unhide items
		tabBar.remove();
		for (const item of tabItems) {
			item.hidden = false;
		}
		for (const item of panelItems) {
			item.hidden = false;
			item.removeAttribute('role');
			item.removeAttribute('id');
			item.removeAttribute('aria-labelledby');
		}
	};
}
