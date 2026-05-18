import type { CleanupFn } from '../types.js';
import { uniqueId } from '../utils.js';

/**
 * Collapsible nav behavior — runs on `[data-rune="nav"][data-collapsible="true"]`.
 *
 * Each NavGroup's heading becomes a focusable toggle that flips
 * `data-collapsed` between `"true"` and `"false"`. Build-time auto-open
 * sets the initial state per group based on the current URL; this
 * behavior layers click and keyboard interaction on top.
 */
export function navCollapsibleBehavior(el: HTMLElement): CleanupFn {
	if (el.getAttribute('data-collapsible') !== 'true') return () => {};

	const groups = Array.from(
		el.querySelectorAll<HTMLElement>('[data-rune="nav-group"]'),
	);
	if (groups.length === 0) return () => {};

	const cleanups: Array<() => void> = [];

	for (const group of groups) {
		const heading = group.querySelector<HTMLElement>(
			'[data-field="title"], h1, h2, h3, h4, h5, h6',
		);
		if (!heading) continue;

		const panel = group.querySelector<HTMLElement>(':scope > ul, :scope > ol');
		if (!panel) continue;

		const triggerId = heading.id || uniqueId('rf-nav-trigger');
		const panelId = panel.id || uniqueId('rf-nav-panel');
		heading.id = triggerId;
		panel.id = panelId;

		// Initial collapsed state — default to "true" if not set
		const current = group.getAttribute('data-collapsed') ?? 'true';
		if (current !== 'false') group.setAttribute('data-collapsed', 'true');

		heading.setAttribute('role', 'button');
		heading.setAttribute('tabindex', '0');
		heading.setAttribute('aria-controls', panelId);
		heading.setAttribute(
			'aria-expanded',
			group.getAttribute('data-collapsed') === 'false' ? 'true' : 'false',
		);
		panel.setAttribute('aria-labelledby', triggerId);

		const toggle = () => {
			const open = group.getAttribute('data-collapsed') === 'false';
			group.setAttribute('data-collapsed', open ? 'true' : 'false');
			heading.setAttribute('aria-expanded', open ? 'false' : 'true');
		};

		const onClick = (e: MouseEvent) => {
			e.preventDefault();
			toggle();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggle();
			}
		};

		heading.addEventListener('click', onClick);
		heading.addEventListener('keydown', onKey);
		cleanups.push(() => {
			heading.removeEventListener('click', onClick);
			heading.removeEventListener('keydown', onKey);
		});
	}

	return () => cleanups.forEach((fn) => fn());
}
