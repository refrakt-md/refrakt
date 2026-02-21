/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { initRuneBehaviors } from '../src/index.js';
import { resetIdCounter } from '../src/utils.js';

beforeEach(() => {
	document.body.innerHTML = '';
	resetIdCounter();
});

function createContent(): HTMLElement {
	const container = document.createElement('div');
	container.innerHTML = `
		<section data-rune="accordion">
			<details>
				<summary>Q1</summary>
				<div>Answer 1</div>
			</details>
			<details>
				<summary>Q2</summary>
				<div>Answer 2</div>
			</details>
		</section>
		<pre><code>const x = 1;</code></pre>
	`;
	document.body.appendChild(container);
	return container;
}

describe('initRuneBehaviors', () => {
	it('initializes accordion behavior on [data-rune="accordion"]', () => {
		const container = createContent();
		initRuneBehaviors(container);

		const summaries = container.querySelectorAll('summary');
		// Accordion behavior adds aria-expanded
		for (const summary of summaries) {
			expect(summary.getAttribute('aria-expanded')).toBe('false');
		}
	});

	it('initializes copy buttons on pre elements', () => {
		const container = createContent();
		initRuneBehaviors(container);

		expect(container.querySelector('.rf-copy-btn')).not.toBeNull();
	});

	it('skips framework-managed elements (Alpine.js)', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<section data-rune="accordion" x-data="{ open: null }">
				<details>
					<summary>Q1</summary>
					<div>A1</div>
				</details>
			</section>
		`;
		document.body.appendChild(container);

		initRuneBehaviors(container);

		// Should not have aria-expanded (behavior was skipped)
		const summary = container.querySelector('summary');
		expect(summary?.getAttribute('aria-expanded')).toBeNull();
	});

	it('skips framework-managed elements (Stimulus)', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<section data-rune="accordion" data-controller="accordion">
				<details>
					<summary>Q1</summary>
					<div>A1</div>
				</details>
			</section>
		`;
		document.body.appendChild(container);

		initRuneBehaviors(container);

		const summary = container.querySelector('summary');
		expect(summary?.getAttribute('aria-expanded')).toBeNull();
	});

	it('respects "only" filter', () => {
		const container = createContent();
		initRuneBehaviors(container, { only: ['accordion'] });

		// Accordion should be initialized
		const summaries = container.querySelectorAll('summary');
		expect(summaries[0].getAttribute('aria-expanded')).toBe('false');
	});

	it('respects "exclude" filter', () => {
		const container = createContent();
		initRuneBehaviors(container, { exclude: ['accordion'] });

		// Accordion should NOT be initialized
		const summaries = container.querySelectorAll('summary');
		expect(summaries[0].getAttribute('aria-expanded')).toBeNull();

		// Copy should still work (it's not rune-specific)
		expect(container.querySelector('.rf-copy-btn')).not.toBeNull();
	});

	it('returns cleanup function that removes all behaviors', () => {
		const container = createContent();
		const cleanup = initRuneBehaviors(container);

		// Verify behaviors are active
		expect(container.querySelector('.rf-copy-btn')).not.toBeNull();
		expect(container.querySelector('summary')?.getAttribute('aria-expanded')).toBe('false');

		cleanup();

		// Copy button should be removed
		expect(container.querySelector('.rf-copy-btn')).toBeNull();
		expect(container.querySelector('.rf-code-wrapper')).toBeNull();
	});

	it('handles empty container', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const cleanup = initRuneBehaviors(container);
		// Should not throw
		cleanup();
	});

	it('handles document as container', () => {
		document.body.innerHTML = `
			<pre><code>test</code></pre>
		`;

		const cleanup = initRuneBehaviors(document);
		expect(document.querySelector('.rf-copy-btn')).not.toBeNull();
		cleanup();
	});
});
