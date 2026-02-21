import type { CleanupFn } from '../types.js';

/**
 * Reveal behavior for `[data-rune="reveal"]`.
 *
 * Shows steps one at a time with Continue/Start Over controls.
 * Steps are shown/hidden via `rf-reveal-step--visible` / `rf-reveal-step--hidden` classes.
 */
export function revealBehavior(el: HTMLElement): CleanupFn {
	// Find steps — look in data-name="steps" container or direct children
	const stepsContainer = el.querySelector('[data-name="steps"]') || el;
	const steps = Array.from(
		stepsContainer.querySelectorAll<HTMLElement>('[data-rune="revealstep"], [typeof="RevealStep"]'),
	);

	if (steps.length === 0) return () => {};

	let visibleCount = 1;

	// Create Continue button
	const nextBtn = document.createElement('button');
	nextBtn.className = 'rf-reveal__next';
	nextBtn.textContent = 'Continue';

	// Create Start Over button
	const resetBtn = document.createElement('button');
	resetBtn.className = 'rf-reveal__reset';
	resetBtn.textContent = 'Start over';

	function render() {
		for (let i = 0; i < steps.length; i++) {
			const visible = i < visibleCount;
			steps[i].classList.toggle('rf-reveal-step--visible', visible);
			steps[i].classList.toggle('rf-reveal-step--hidden', !visible);
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

		// Remove visibility classes
		for (const step of steps) {
			step.classList.remove('rf-reveal-step--visible', 'rf-reveal-step--hidden');
		}
	};
}
