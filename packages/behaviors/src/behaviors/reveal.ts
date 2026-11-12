import type { CleanupFn } from '../types.js';
import { elStr } from '../i18n.js';

/**
 * Reveal behavior for `[data-rune="reveal"]`.
 *
 * Shows steps one at a time with Continue/Start Over controls.
 * Each step's state is `data-state="open"` or `"closed"`. The server output
 * already marks every step `closed`, so the root also gets `data-enhanced`
 * while the behaviour runs: stylesheets hide a closed step only inside an
 * enhanced reveal, and a page without JavaScript shows every step. No class
 * is written (SPEC-196 D6).
 */
export function revealBehavior(el: HTMLElement): CleanupFn {
	// Find steps — look in data-name="steps" container or direct children
	const stepsContainer = el.querySelector('[data-name="steps"]') || el;
	const steps = Array.from(
		stepsContainer.querySelectorAll<HTMLElement>('[data-rune="reveal-step"]'),
	);

	if (steps.length === 0) return () => {};
	el.setAttribute('data-enhanced', '');

	let visibleCount = 1;

	// Create Continue button
	const nextBtn = document.createElement('button');
	nextBtn.className = 'rf-reveal__next';
	nextBtn.textContent = elStr(el, 'data-i18n-continue', 'behavior.reveal.continue');

	// Create Start Over button
	const resetBtn = document.createElement('button');
	resetBtn.className = 'rf-reveal__reset';
	resetBtn.textContent = elStr(el, 'data-i18n-start-over', 'behavior.reveal.startOver');

	function render() {
		for (let i = 0; i < steps.length; i++) {
			const visible = i < visibleCount;
			steps[i].setAttribute('data-state', visible ? 'open' : 'closed');
		}

		// Show Continue button if more steps to reveal
		if (visibleCount < steps.length) {
			if (!nextBtn.parentNode) el.appendChild(nextBtn);
			resetBtn.remove();
		} else if (steps.length > 1) {
			// All steps visible and more than one — show Start Over
			nextBtn.remove();
			if (!resetBtn.parentNode) el.appendChild(resetBtn);
		} else {
			nextBtn.remove();
			resetBtn.remove();
		}
	}

	const onNext = () => {
		if (visibleCount < steps.length) {
			visibleCount++;
			render();
		}
	};

	const onReset = () => {
		visibleCount = 1;
		render();
	};

	nextBtn.addEventListener('click', onNext);
	resetBtn.addEventListener('click', onReset);

	// Initial render
	render();

	return () => {
		nextBtn.removeEventListener('click', onNext);
		resetBtn.removeEventListener('click', onReset);
		nextBtn.remove();
		resetBtn.remove();

		// Restore the server state: every step closed, nothing hidden.
		el.removeAttribute('data-enhanced');
		for (const step of steps) step.setAttribute('data-state', 'closed');
	};
}
