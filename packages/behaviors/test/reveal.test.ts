/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { revealBehavior } from '../src/behaviors/reveal.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

function createReveal(opts?: { stepCount?: number }): HTMLElement {
	const count = opts?.stepCount ?? 3;

	const steps = Array.from({ length: count }, (_, i) => `
		<div class="rf-reveal-step" typeof="RevealStep" data-rune="revealstep">
			<div class="rf-reveal-step__content">Step ${i + 1} content</div>
		</div>
	`).join('');

	const el = document.createElement('section');
	el.setAttribute('data-rune', 'reveal');
	el.className = 'rf-reveal';
	el.innerHTML = `<div data-name="steps" class="rf-reveal__steps">${steps}</div>`;
	document.body.appendChild(el);
	return el;
}

describe('revealBehavior', () => {
	describe('initial state', () => {
		it('shows only the first step', () => {
			const el = createReveal();
			revealBehavior(el);

			const steps = el.querySelectorAll('[data-rune="revealstep"]');
			expect(steps[0].classList.contains('rf-reveal-step--visible')).toBe(true);
			expect(steps[1].classList.contains('rf-reveal-step--hidden')).toBe(true);
			expect(steps[2].classList.contains('rf-reveal-step--hidden')).toBe(true);
		});

		it('shows Continue button initially', () => {
			const el = createReveal();
			revealBehavior(el);

			expect(el.querySelector('.rf-reveal__next')).not.toBeNull();
			expect(el.querySelector('.rf-reveal__reset')).toBeNull();
		});
	});

	describe('Continue button', () => {
		it('reveals the next step on click', () => {
			const el = createReveal();
			revealBehavior(el);

			const nextBtn = el.querySelector<HTMLElement>('.rf-reveal__next')!;
			nextBtn.click();

			const steps = el.querySelectorAll('[data-rune="revealstep"]');
			expect(steps[0].classList.contains('rf-reveal-step--visible')).toBe(true);
			expect(steps[1].classList.contains('rf-reveal-step--visible')).toBe(true);
			expect(steps[2].classList.contains('rf-reveal-step--hidden')).toBe(true);
		});

		it('clicking Continue until all visible shows Start Over', () => {
			const el = createReveal();
			revealBehavior(el);

			const nextBtn = el.querySelector<HTMLElement>('.rf-reveal__next')!;
			nextBtn.click(); // 2 visible
			nextBtn.click(); // 3 visible — all

			expect(el.querySelector('.rf-reveal__next')).toBeNull();
			expect(el.querySelector('.rf-reveal__reset')).not.toBeNull();
		});
	});

	describe('Start Over button', () => {
		it('resets to showing only the first step', () => {
			const el = createReveal();
			revealBehavior(el);

			// Reveal all
			const nextBtn = el.querySelector<HTMLElement>('.rf-reveal__next')!;
			nextBtn.click();
			nextBtn.click();

			// Click Start Over
			const resetBtn = el.querySelector<HTMLElement>('.rf-reveal__reset')!;
			resetBtn.click();

			const steps = el.querySelectorAll('[data-rune="revealstep"]');
			expect(steps[0].classList.contains('rf-reveal-step--visible')).toBe(true);
			expect(steps[1].classList.contains('rf-reveal-step--hidden')).toBe(true);
			expect(steps[2].classList.contains('rf-reveal-step--hidden')).toBe(true);

			// Continue button is back
			expect(el.querySelector('.rf-reveal__next')).not.toBeNull();
			expect(el.querySelector('.rf-reveal__reset')).toBeNull();
		});
	});

	describe('single step', () => {
		it('does not show any buttons for a single step', () => {
			const el = createReveal({ stepCount: 1 });
			revealBehavior(el);

			expect(el.querySelector('.rf-reveal__next')).toBeNull();
			expect(el.querySelector('.rf-reveal__reset')).toBeNull();
		});

		it('marks the single step as visible', () => {
			const el = createReveal({ stepCount: 1 });
			revealBehavior(el);

			const steps = el.querySelectorAll('[data-rune="revealstep"]');
			expect(steps[0].classList.contains('rf-reveal-step--visible')).toBe(true);
		});
	});

	describe('cleanup', () => {
		it('removes buttons and visibility classes', () => {
			const el = createReveal();
			const cleanup = revealBehavior(el);

			cleanup();

			expect(el.querySelector('.rf-reveal__next')).toBeNull();
			expect(el.querySelector('.rf-reveal__reset')).toBeNull();

			const steps = el.querySelectorAll('[data-rune="revealstep"]');
			for (const step of steps) {
				expect(step.classList.contains('rf-reveal-step--visible')).toBe(false);
				expect(step.classList.contains('rf-reveal-step--hidden')).toBe(false);
			}
		});
	});

	it('handles element with no steps', () => {
		const el = document.createElement('section');
		el.setAttribute('data-rune', 'reveal');
		document.body.appendChild(el);

		const cleanup = revealBehavior(el);
		cleanup();
	});
});
