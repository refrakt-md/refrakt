import type { CleanupFn } from '../types.js';

/**
 * Section navigation behavior for plan pages.
 *
 * Discovers headings with `[data-known-section]` inside the layout,
 * builds a compact dropdown menu listing those sections, and wires up:
 * - [data-section-nav-toggle] — opens/closes the section nav dropdown
 * - Smooth-scroll to the selected section on click
 * - Scrollspy integration — highlights the currently visible section
 * - Dismiss on selection, Escape, or outside click
 *
 * The dropdown is injected next to the toggle button in the toolbar.
 */
export function sectionNavBehavior(container: HTMLElement | Document): CleanupFn {
	const root = container instanceof Document ? container.documentElement : container;
	const toggleEl = root.querySelector<HTMLButtonElement>('[data-section-nav-toggle]');
	if (!toggleEl) return () => {};
	const toggle = toggleEl;

	// Find all known-section headings in the page content
	const headings = root.querySelectorAll<HTMLElement>('[data-known-section]');
	if (headings.length === 0) {
		// No known sections — hide the toggle button entirely
		toggle.style.display = 'none';
		return () => {};
	}

	const cleanups: Array<() => void> = [];

	// Build the dropdown element
	const dropdown = document.createElement('nav');
	dropdown.className = 'rf-section-nav';
	dropdown.setAttribute('role', 'menu');
	dropdown.setAttribute('aria-label', 'Page sections');

	const list = document.createElement('ul');
	list.className = 'rf-section-nav__list';

	const headingToItem = new Map<Element, HTMLLIElement>();
	const items: HTMLLIElement[] = [];

	for (const heading of headings) {
		const sectionName = heading.getAttribute('data-known-section')!;
		const headingId = heading.id;
		if (!headingId) continue;

		const li = document.createElement('li');
		li.className = 'rf-section-nav__item';
		li.setAttribute('role', 'menuitem');

		const link = document.createElement('a');
		link.href = `#${headingId}`;
		link.textContent = sectionName;
		link.className = 'rf-section-nav__link';

		link.addEventListener('click', (e) => {
			e.preventDefault();
			const target = document.getElementById(headingId);
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			close();
		});

		li.appendChild(link);
		list.appendChild(li);
		headingToItem.set(heading, li);
		items.push(li);
	}

	dropdown.appendChild(list);

	// Insert dropdown after the toggle button (inside the toolbar)
	toggle.parentElement!.appendChild(dropdown);

	// Toggle open/close
	let isOpen = false;

	function open() {
		isOpen = true;
		dropdown.setAttribute('data-open', '');
		toggle.setAttribute('aria-expanded', 'true');
	}

	function close() {
		isOpen = false;
		dropdown.removeAttribute('data-open');
		toggle.setAttribute('aria-expanded', 'false');
	}

	const onToggleClick = () => {
		if (isOpen) {
			close();
		} else {
			open();
		}
	};
	toggle.addEventListener('click', onToggleClick);
	cleanups.push(() => toggle.removeEventListener('click', onToggleClick));

	// Close on outside click
	const onDocClick = (e: MouseEvent) => {
		if (isOpen && !dropdown.contains(e.target as Node) && !toggle.contains(e.target as Node)) {
			close();
		}
	};
	document.addEventListener('click', onDocClick);
	cleanups.push(() => document.removeEventListener('click', onDocClick));

	// Close on Escape
	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && isOpen) {
			close();
			toggle.focus();
		}
	};
	document.addEventListener('keydown', onKeydown);
	cleanups.push(() => document.removeEventListener('keydown', onKeydown));

	// Scrollspy — highlight the active section in the dropdown
	let activeItem: HTMLLIElement | null = null;

	const observer = new IntersectionObserver(
		(entries) => {
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
			// Same rootMargin as the TOC scrollspy — heading enters top 20%
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

	// Cleanup
	return () => {
		close();
		dropdown.remove();
		cleanups.forEach((fn) => fn());
	};
}
