import type { CleanupFn } from '../types.js';

/**
 * Section navigation behavior for plan pages.
 *
 * Discovers headings to build a compact dropdown menu and wires up:
 * - [data-section-nav-toggle] — opens/closes the section nav dropdown
 * - Smooth-scroll to the selected section on click
 * - Scrollspy integration — highlights the currently visible section
 * - Dismiss on selection, Escape, or outside click
 *
 * Heading discovery strategy:
 * 1. Prefer [data-known-section] headings (work, bug, decision runes)
 * 2. Fall back to all H2 headings with IDs (specs, milestones)
 * 3. Additionally include the Relationships section if present
 *
 * The dropdown is injected next to the toggle button in the toolbar.
 */
export function sectionNavBehavior(container: HTMLElement | Document): CleanupFn {
	const root = container instanceof Document ? container.documentElement : container;
	const toggleEl = root.querySelector<HTMLButtonElement>('[data-section-nav-toggle]');
	if (!toggleEl) return () => {};
	const toggle = toggleEl;

	// Collect section entries: { label, id, element }
	const entries: Array<{ label: string; id: string; element: HTMLElement }> = [];

	// 1. Try known-section headings first (work, bug, decision)
	const knownHeadings = root.querySelectorAll<HTMLElement>('[data-known-section]');
	if (knownHeadings.length > 0) {
		for (const heading of knownHeadings) {
			const id = heading.id;
			if (!id) continue;
			entries.push({
				label: heading.getAttribute('data-known-section')!,
				id,
				element: heading,
			});
		}
	} else {
		// 2. Fall back to all H2 headings with IDs (for specs, milestones, etc.)
		const allH2s = root.querySelectorAll<HTMLElement>('h2[id]');
		for (const heading of allH2s) {
			// Skip the relationships heading — we add it separately below
			if (heading.closest('.rf-plan-relationships')) continue;
			entries.push({
				label: heading.textContent?.trim() || '',
				id: heading.id,
				element: heading,
			});
		}
	}

	// 3. Always include the Relationships section if present
	const relSection = root.querySelector<HTMLElement>('.rf-plan-relationships');
	if (relSection) {
		const relHeading = relSection.querySelector<HTMLElement>('h2');
		if (relHeading) {
			// Ensure the heading has an ID for scroll targeting
			if (!relHeading.id) {
				relHeading.id = 'relationships';
			}
			entries.push({
				label: 'Relationships',
				id: relHeading.id,
				element: relHeading,
			});
		}
	}

	if (entries.length === 0) {
		// Nothing to navigate — hide the toggle
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

	const elementToItem = new Map<Element, HTMLLIElement>();

	for (const entry of entries) {
		const li = document.createElement('li');
		li.className = 'rf-section-nav__item';
		li.setAttribute('role', 'menuitem');

		const link = document.createElement('a');
		link.href = `#${entry.id}`;
		link.textContent = entry.label;
		link.className = 'rf-section-nav__link';

		link.addEventListener('click', (e) => {
			e.preventDefault();
			const target = document.getElementById(entry.id);
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			close();
		});

		li.appendChild(link);
		list.appendChild(li);
		elementToItem.set(entry.element, li);
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
					const item = elementToItem.get(entry.target);
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

	for (const entry of entries) {
		observer.observe(entry.element);
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
