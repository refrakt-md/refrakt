import type { CleanupFn } from '../types.js';
import { uniqueId } from '../utils.js';

/**
 * Accordion behavior for `[data-rune="accordion"]`.
 *
 * Enhances native `<details>/<summary>` elements with:
 * - Exclusive mode: only one item open at a time (when `data-multiple` is absent)
 * - ARIA attributes: `aria-expanded` on triggers, `aria-controls`/`aria-labelledby` wiring
 * - Keyboard navigation: ArrowUp/Down between triggers, Home/End to first/last
 */
export function accordionBehavior(el: HTMLElement): CleanupFn {
	const details = Array.from(el.querySelectorAll<HTMLDetailsElement>('details'));
	if (details.length === 0) return () => {};

	const allowMultiple = el.hasAttribute('data-multiple');
	const cleanups: Array<() => void> = [];

	// Wire up ARIA and event listeners for each item
	for (const item of details) {
		const summary = item.querySelector('summary');
		if (!summary) continue;

		// Generate IDs for ARIA wiring
		const panelId = uniqueId('rf-accordion-panel');
		const triggerId = uniqueId('rf-accordion-trigger');

		summary.id = triggerId;
		summary.setAttribute('aria-expanded', String(item.open));

		// Find the content panel (first non-summary child element)
		const panel = Array.from(item.children).find(
			(child): child is HTMLElement => child instanceof HTMLElement && child.tagName !== 'SUMMARY',
		);
		if (panel) {
			panel.id = panelId;
			panel.setAttribute('role', 'region');
			panel.setAttribute('aria-labelledby', triggerId);
			summary.setAttribute('aria-controls', panelId);
		}

		// Toggle handler for exclusive mode
		const onToggle = () => {
			summary.setAttribute('aria-expanded', String(item.open));

			if (!allowMultiple && item.open) {
				for (const other of details) {
					if (other !== item && other.open) {
						other.open = false;
						const otherSummary = other.querySelector('summary');
						otherSummary?.setAttribute('aria-expanded', 'false');
					}
				}
			}
		};

		item.addEventListener('toggle', onToggle);
		cleanups.push(() => item.removeEventListener('toggle', onToggle));
	}

	// Keyboard navigation across all summaries
	const summaries = details
		.map((d) => d.querySelector('summary'))
		.filter((s): s is HTMLElement => s !== null);

	const onKeydown = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement;
		const index = summaries.indexOf(target);
		if (index === -1) return;

		let next: number | null = null;

		switch (e.key) {
			case 'ArrowDown':
				next = (index + 1) % summaries.length;
				break;
			case 'ArrowUp':
				next = (index - 1 + summaries.length) % summaries.length;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = summaries.length - 1;
				break;
			default:
				return;
		}

		if (next !== null) {
			e.preventDefault();
			summaries[next].focus();
		}
	};

	el.addEventListener('keydown', onKeydown);
	cleanups.push(() => el.removeEventListener('keydown', onKeydown));

	return () => cleanups.forEach((fn) => fn());
}
