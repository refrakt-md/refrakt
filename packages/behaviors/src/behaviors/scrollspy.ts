import type { CleanupFn } from '../types.js';

/**
 * Scroll-spy behavior for "On This Page" navigation.
 *
 * Discovers `[data-scrollspy]` containers, finds anchor links pointing to
 * heading IDs, and uses IntersectionObserver to set `data-active` on the
 * `<li>` whose heading is currently in view.
 *
 * Works with any theme/framework — pure DOM, no framework dependencies.
 */
export function scrollspyBehavior(container: HTMLElement | Document): CleanupFn {
	const navs = container.querySelectorAll<HTMLElement>('[data-scrollspy]');
	const cleanups: Array<() => void> = [];

	for (const nav of navs) {
		const links = nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
		if (links.length === 0) continue;

		// Build a map from heading element → <li> to mark active
		const headingToItem = new Map<Element, Element>();
		const headings: Element[] = [];

		for (const link of links) {
			const id = link.getAttribute('href')!.slice(1);
			const heading = document.getElementById(id);
			if (!heading) continue;

			const li = link.closest('li');
			if (!li) continue;

			headingToItem.set(heading, li);
			headings.push(heading);
		}

		if (headings.length === 0) continue;

		let activeItem: Element | null = null;

		const observer = new IntersectionObserver(
			(entries) => {
				// Find the topmost visible heading
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const item = headingToItem.get(entry.target);
						if (item && item !== activeItem) {
							activeItem?.removeAttribute('data-active');
							item.setAttribute('data-active', '');
							activeItem = item;
						}
						break;
					}
				}
			},
			{
				// Trigger when heading enters the top 20% of the viewport
				rootMargin: '0px 0px -80% 0px',
			},
		);

		for (const heading of headings) {
			observer.observe(heading);
		}

		cleanups.push(() => {
			observer.disconnect();
			activeItem?.removeAttribute('data-active');
		});
	}

	return () => cleanups.forEach((fn) => fn());
}
