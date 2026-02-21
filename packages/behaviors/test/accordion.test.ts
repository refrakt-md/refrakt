/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { accordionBehavior } from '../src/behaviors/accordion.js';
import { resetIdCounter } from '../src/utils.js';

beforeEach(() => {
	document.body.innerHTML = '';
	resetIdCounter();
});

function createAccordion(opts?: { multiple?: boolean; itemCount?: number }): HTMLElement {
	const count = opts?.itemCount ?? 3;
	const items = Array.from({ length: count }, (_, i) => `
		<details>
			<summary>Item ${i + 1}</summary>
			<div data-name="body">Content ${i + 1}</div>
		</details>
	`).join('');

	const el = document.createElement('section');
	el.setAttribute('data-rune', 'accordion');
	if (opts?.multiple) el.setAttribute('data-multiple', '');
	el.innerHTML = items;
	document.body.appendChild(el);
	return el;
}

describe('accordionBehavior', () => {
	describe('ARIA attributes', () => {
		it('sets aria-expanded on summaries', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			for (const summary of summaries) {
				expect(summary.getAttribute('aria-expanded')).toBe('false');
			}
		});

		it('sets aria-controls and aria-labelledby', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const details = el.querySelectorAll('details');
			for (const item of details) {
				const summary = item.querySelector('summary')!;
				const panel = item.querySelector('[role="region"]');

				expect(summary.getAttribute('aria-controls')).toBeTruthy();
				expect(panel).not.toBeNull();
				expect(panel?.getAttribute('aria-labelledby')).toBe(summary.id);
			}
		});

		it('generates unique IDs for each item', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const ids = new Set<string>();
			const summaries = el.querySelectorAll('summary');
			for (const summary of summaries) {
				expect(ids.has(summary.id)).toBe(false);
				ids.add(summary.id);
			}
		});
	});

	describe('exclusive mode (default)', () => {
		it('closes other items when one opens', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const items = el.querySelectorAll('details');

			// Open first item
			items[0].open = true;
			items[0].dispatchEvent(new Event('toggle'));
			expect(items[0].open).toBe(true);
			expect(items[0].querySelector('summary')?.getAttribute('aria-expanded')).toBe('true');

			// Open second item — first should close
			items[1].open = true;
			items[1].dispatchEvent(new Event('toggle'));
			expect(items[1].open).toBe(true);
			expect(items[0].open).toBe(false);
			expect(items[0].querySelector('summary')?.getAttribute('aria-expanded')).toBe('false');
		});
	});

	describe('multiple mode', () => {
		it('allows multiple items open simultaneously', () => {
			const el = createAccordion({ multiple: true });
			accordionBehavior(el);

			const items = el.querySelectorAll('details');

			items[0].open = true;
			items[0].dispatchEvent(new Event('toggle'));

			items[1].open = true;
			items[1].dispatchEvent(new Event('toggle'));

			expect(items[0].open).toBe(true);
			expect(items[1].open).toBe(true);
		});
	});

	describe('keyboard navigation', () => {
		it('ArrowDown moves focus to next summary', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			summaries[0].focus();
			summaries[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

			expect(document.activeElement).toBe(summaries[1]);
		});

		it('ArrowUp moves focus to previous summary', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			summaries[1].focus();
			summaries[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

			expect(document.activeElement).toBe(summaries[0]);
		});

		it('ArrowDown wraps from last to first', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			summaries[2].focus();
			summaries[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

			expect(document.activeElement).toBe(summaries[0]);
		});

		it('ArrowUp wraps from first to last', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			summaries[0].focus();
			summaries[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

			expect(document.activeElement).toBe(summaries[2]);
		});

		it('Home moves focus to first summary', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			summaries[2].focus();
			summaries[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

			expect(document.activeElement).toBe(summaries[0]);
		});

		it('End moves focus to last summary', () => {
			const el = createAccordion();
			accordionBehavior(el);

			const summaries = el.querySelectorAll('summary');
			summaries[0].focus();
			summaries[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

			expect(document.activeElement).toBe(summaries[2]);
		});
	});

	describe('cleanup', () => {
		it('removes event listeners on cleanup', () => {
			const el = createAccordion();
			const cleanup = accordionBehavior(el);

			const items = el.querySelectorAll('details');

			// Open first item
			items[0].open = true;
			items[0].dispatchEvent(new Event('toggle'));
			expect(items[0].open).toBe(true);

			cleanup();

			// After cleanup, opening second should not close first
			items[1].open = true;
			items[1].dispatchEvent(new Event('toggle'));
			expect(items[0].open).toBe(true);
			expect(items[1].open).toBe(true);
		});
	});

	it('handles accordion with no details elements', () => {
		const el = document.createElement('section');
		el.setAttribute('data-rune', 'accordion');
		document.body.appendChild(el);

		const cleanup = accordionBehavior(el);
		// Should not throw
		cleanup();
	});
});
