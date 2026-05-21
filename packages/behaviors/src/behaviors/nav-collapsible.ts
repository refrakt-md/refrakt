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

		// SPEC-054 wraps each nav-group's body content (lists, nested navs,
		// intro/footer slots) in a `<div data-name="panel">`. Animate that
		// wrapper; for older trees that don't have it, fall back to the
		// direct <ul>/<ol>.
		const panel = group.querySelector<HTMLElement>(
			':scope > [data-name="panel"], :scope > ul, :scope > ol',
		);
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
			const wasOpen = group.getAttribute('data-collapsed') === 'false';
			const startH = panel.getBoundingClientRect().height;
			const endH = wasOpen ? 0 : panel.scrollHeight;

			panel.style.height = startH + 'px';
			void panel.offsetHeight;
			group.setAttribute('data-collapsed', wasOpen ? 'true' : 'false');
			heading.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
			panel.style.height = endH + 'px';

			const settle = () => {
				panel.style.height = '';
				panel.removeEventListener('transitionend', onEnd);
				clearTimeout(fallback);
			};
			const onEnd = (e: TransitionEvent) => {
				if (e.target !== panel || e.propertyName !== 'height') return;
				settle();
			};
			panel.addEventListener('transitionend', onEnd);
			const fallback = setTimeout(settle, 260);
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
