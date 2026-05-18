import type { CleanupFn } from '../types.js';
import { uniqueId } from '../utils.js';

/**
 * Menubar nav behavior — runs on `[data-rune="nav"][data-layout="menubar"]`.
 *
 * Desktop: group triggers open submenus on click. Only one open at a time.
 * Mobile (theme-controlled via CSS): the rune-emitted `data-name="trigger"`
 * button toggles `data-open` on the whole nav element. Groups continue to
 * use `data-open` per-group inside the mobile panel.
 *
 * Keyboard model follows the WAI-ARIA menubar pattern:
 *  - ArrowLeft/Right move between triggers
 *  - ArrowDown enters the open submenu (or opens one)
 *  - ArrowUp/Down move within an open submenu
 *  - Escape closes and returns focus to the trigger
 */
export function navMenubarBehavior(el: HTMLElement): CleanupFn {
	if (el.getAttribute('data-layout') !== 'menubar') return () => {};

	const cleanups: Array<() => void> = [];
	const groups = Array.from(el.querySelectorAll<HTMLElement>('[data-rune="nav-group"]'));
	const triggerByGroup = new Map<HTMLElement, HTMLElement>();
	const panelByGroup = new Map<HTMLElement, HTMLElement>();

	for (const group of groups) {
		const trigger = group.querySelector<HTMLElement>(
			'[data-field="title"], h1, h2, h3, h4, h5, h6',
		);
		const panel = group.querySelector<HTMLElement>(':scope > ul, :scope > ol');
		if (!trigger || !panel) continue;

		const triggerId = trigger.id || uniqueId('rf-nav-trigger');
		const panelId = panel.id || uniqueId('rf-nav-panel');
		trigger.id = triggerId;
		panel.id = panelId;

		trigger.setAttribute('role', 'button');
		trigger.setAttribute('tabindex', '0');
		trigger.setAttribute('aria-haspopup', 'true');
		trigger.setAttribute('aria-expanded', 'false');
		trigger.setAttribute('aria-controls', panelId);
		panel.setAttribute('role', 'menu');
		panel.setAttribute('aria-labelledby', triggerId);
		group.setAttribute('data-open', 'false');

		triggerByGroup.set(group, trigger);
		panelByGroup.set(group, panel);
	}

	const closeAll = (except?: HTMLElement) => {
		for (const [group, trigger] of triggerByGroup) {
			if (group === except) continue;
			group.setAttribute('data-open', 'false');
			trigger.setAttribute('aria-expanded', 'false');
		}
	};

	const openGroup = (group: HTMLElement) => {
		const trigger = triggerByGroup.get(group);
		if (!trigger) return;
		closeAll(group);
		group.setAttribute('data-open', 'true');
		trigger.setAttribute('aria-expanded', 'true');
	};

	const toggleGroup = (group: HTMLElement) => {
		const open = group.getAttribute('data-open') === 'true';
		if (open) {
			closeAll();
		} else {
			openGroup(group);
		}
	};

	for (const [group, trigger] of triggerByGroup) {
		const panel = panelByGroup.get(group)!;
		const onClick = (e: MouseEvent) => {
			e.preventDefault();
			toggleGroup(group);
		};
		const onKey = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'Enter':
				case ' ':
					e.preventDefault();
					toggleGroup(group);
					break;
				case 'ArrowDown': {
					e.preventDefault();
					openGroup(group);
					const first = panel.querySelector<HTMLElement>('a, button, [tabindex]');
					first?.focus();
					break;
				}
				case 'ArrowRight':
				case 'ArrowLeft': {
					e.preventDefault();
					const order = Array.from(triggerByGroup.keys());
					const idx = order.indexOf(group);
					if (idx === -1) break;
					const next = e.key === 'ArrowRight'
						? order[(idx + 1) % order.length]
						: order[(idx - 1 + order.length) % order.length];
					const nextTrigger = triggerByGroup.get(next);
					nextTrigger?.focus();
					if (group.getAttribute('data-open') === 'true') openGroup(next);
					break;
				}
				case 'Escape':
					closeAll();
					trigger.focus();
					break;
			}
		};
		trigger.addEventListener('click', onClick);
		trigger.addEventListener('keydown', onKey);
		cleanups.push(() => {
			trigger.removeEventListener('click', onClick);
			trigger.removeEventListener('keydown', onKey);
		});

		// Submenu keyboard: ArrowUp/Down between items, Escape closes
		const onPanelKey = (e: KeyboardEvent) => {
			const items = Array.from(panel.querySelectorAll<HTMLElement>('a, button'));
			const active = document.activeElement as HTMLElement | null;
			const idx = active ? items.indexOf(active) : -1;
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					items[Math.min(idx + 1, items.length - 1)]?.focus();
					break;
				case 'ArrowUp':
					e.preventDefault();
					if (idx <= 0) trigger.focus();
					else items[idx - 1]?.focus();
					break;
				case 'Escape':
					e.preventDefault();
					closeAll();
					trigger.focus();
					break;
			}
		};
		panel.addEventListener('keydown', onPanelKey);
		cleanups.push(() => panel.removeEventListener('keydown', onPanelKey));
	}

	// Click outside / focus outside closes everything
	const onDocClick = (e: MouseEvent) => {
		if (!el.contains(e.target as Node)) closeAll();
	};
	const onFocusOut = (e: FocusEvent) => {
		const next = e.relatedTarget as Node | null;
		if (!next || !el.contains(next)) closeAll();
	};
	document.addEventListener('click', onDocClick);
	el.addEventListener('focusout', onFocusOut);
	cleanups.push(() => document.removeEventListener('click', onDocClick));
	cleanups.push(() => el.removeEventListener('focusout', onFocusOut));

	// Mobile hamburger trigger toggles `data-open` on the nav itself
	const hamburger = el.querySelector<HTMLElement>(':scope > [data-name="trigger"]');
	if (hamburger) {
		const onHamburgerClick = (e: MouseEvent) => {
			e.preventDefault();
			const open = el.getAttribute('data-open') === 'true';
			el.setAttribute('data-open', open ? 'false' : 'true');
			hamburger.setAttribute('aria-expanded', open ? 'false' : 'true');
		};
		hamburger.addEventListener('click', onHamburgerClick);
		cleanups.push(() => hamburger.removeEventListener('click', onHamburgerClick));
	}

	return () => cleanups.forEach((fn) => fn());
}
