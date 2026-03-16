import type { CleanupFn } from '../types.js';
import { uniqueId } from '../utils.js';

/**
 * Tabs behavior for `[data-rune="tab-group"]` and `[data-rune="code-group"]`.
 *
 * The rune schemas produce the correct accessible structure:
 * `<div role="tablist">` with `<button role="tab">` children, and
 * `<div data-name="panels">` with `<div role="tabpanel">` children.
 *
 * This behavior adds ARIA wiring, click/keyboard handlers, and panel switching.
 *
 * - ArrowLeft/ArrowRight keyboard navigation (with wrapping)
 * - Home/End jump to first/last tab
 * - ARIA: aria-selected, aria-controls, aria-labelledby
 */
export function tabsBehavior(el: HTMLElement): CleanupFn {
	const tabBar = el.querySelector<HTMLElement>('[data-name="tabs"]');
	const panelsContainer = el.querySelector<HTMLElement>('[data-name="panels"]');
	if (!tabBar || !panelsContainer) return () => {};

	const buttons = Array.from(tabBar.children).filter(
		(c): c is HTMLButtonElement => c instanceof HTMLElement && c.tagName === 'BUTTON',
	);

	const panelItems = Array.from(panelsContainer.children).filter(
		(c): c is HTMLElement => c instanceof HTMLElement,
	);

	if (buttons.length === 0 || panelItems.length === 0) return () => {};

	// Generate IDs for ARIA wiring
	const tabIds = buttons.map(() => uniqueId('rf-tab'));
	const panelIds = panelItems.map(() => uniqueId('rf-tabpanel'));

	// Wire up ARIA attributes
	for (let i = 0; i < buttons.length; i++) {
		buttons[i].id = tabIds[i];
		if (panelIds[i]) buttons[i].setAttribute('aria-controls', panelIds[i]);
	}

	for (let i = 0; i < panelItems.length; i++) {
		if (panelIds[i]) panelItems[i].id = panelIds[i];
		if (tabIds[i]) panelItems[i].setAttribute('aria-labelledby', tabIds[i]);
	}

	// Derive the active modifier class from the first button's BEM class
	const buttonClass = buttons[0].className.split(' ')[0] || '';

	let activeIndex = 0;

	function setActive(index: number) {
		activeIndex = index;
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute('aria-selected', String(i === activeIndex));
			if (buttonClass) buttons[i].classList.toggle(`${buttonClass}--active`, i === activeIndex);
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

		// Restore ARIA state
		for (const btn of buttons) {
			btn.removeAttribute('id');
			btn.removeAttribute('aria-controls');
			btn.removeAttribute('aria-selected');
			if (buttonClass) btn.classList.remove(`${buttonClass}--active`);
		}
		for (const panel of panelItems) {
			panel.hidden = false;
			panel.removeAttribute('id');
			panel.removeAttribute('aria-labelledby');
		}
	};
}
