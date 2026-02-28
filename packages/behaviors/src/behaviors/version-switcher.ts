import type { CleanupFn } from '../types.js';

/**
 * Version switcher behavior for layout computed content.
 *
 * Discovers `[data-version-switcher]` containers, finds the <select> element,
 * and navigates to the selected page URL on change.
 */
export function versionSwitcherBehavior(container: HTMLElement | Document): CleanupFn {
	const navs = container.querySelectorAll<HTMLElement>('[data-version-switcher]');
	const cleanups: Array<() => void> = [];

	for (const nav of navs) {
		const select = nav.querySelector<HTMLSelectElement>('select');
		if (!select) continue;

		const handler = () => {
			const url = select.value;
			if (url && url !== window.location.pathname) {
				window.location.href = url;
			}
		};

		select.addEventListener('change', handler);
		cleanups.push(() => select.removeEventListener('change', handler));
	}

	return () => cleanups.forEach((fn) => fn());
}
