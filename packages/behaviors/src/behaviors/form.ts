import type { CleanupFn } from '../types.js';

/**
 * Form behavior for `[data-rune="form"]`.
 *
 * Enhances a rendered `<form>` element with:
 * - Async submission via fetch (prevents full page reload)
 * - Honeypot field for basic spam protection
 * - Status messages (submitting, success, error) with ARIA roles
 *
 * Reads configuration from data attributes:
 * - `data-action`: form submission URL
 * - `data-method`: HTTP method (default: POST)
 * - `data-success`: success message text
 * - `data-error`: error message text
 * - `data-honeypot`: "false" to disable honeypot (default: enabled)
 */
export function formBehavior(el: HTMLElement): CleanupFn {
	// The element may be a <form> itself or contain one
	const form = el.tagName === 'FORM' ? (el as HTMLFormElement) : el.querySelector('form');
	if (!form) return () => {};

	const action = el.getAttribute('data-action') || form.getAttribute('action') || '';
	const method = el.getAttribute('data-method') || form.getAttribute('method') || 'POST';
	const successMsg = el.getAttribute('data-success') || 'Form submitted successfully.';
	const errorMsg = el.getAttribute('data-error') || 'Something went wrong. Please try again.';
	const honeypotEnabled = el.getAttribute('data-honeypot') !== 'false';

	// Inject honeypot field
	let honeypotDiv: HTMLDivElement | null = null;
	if (honeypotEnabled) {
		honeypotDiv = document.createElement('div');
		honeypotDiv.className = 'rf-form__hp';
		honeypotDiv.setAttribute('aria-hidden', 'true');
		honeypotDiv.style.display = 'none';

		const honeypotInput = document.createElement('input');
		honeypotInput.type = 'text';
		honeypotInput.name = '_gotcha';
		honeypotInput.setAttribute('autocomplete', 'off');
		honeypotInput.tabIndex = -1;

		honeypotDiv.appendChild(honeypotInput);
		form.prepend(honeypotDiv);
	}

	// Create status element
	const statusEl = document.createElement('div');
	statusEl.className = 'rf-form__status';
	statusEl.hidden = true;
	form.appendChild(statusEl);

	function showStatus(type: 'submitting' | 'success' | 'error', message: string) {
		statusEl.hidden = false;
		statusEl.className = `rf-form__status rf-form__status--${type}`;
		statusEl.setAttribute('role', type === 'submitting' ? 'status' : 'alert');
		statusEl.textContent = message;
	}

	function hideStatus() {
		statusEl.hidden = true;
		statusEl.className = 'rf-form__status';
		statusEl.textContent = '';
	}

	const onSubmit = async (e: Event) => {
		e.preventDefault();
		if (!action) return;

		showStatus('submitting', 'Submitting...');

		try {
			const formData = new FormData(form);
			const response = await fetch(action, {
				method,
				body: formData,
				headers: { 'Accept': 'application/json' },
			});

			if (response.ok) {
				showStatus('success', successMsg);
				form.reset();
			} else {
				showStatus('error', errorMsg);
			}
		} catch {
			showStatus('error', errorMsg);
		}
	};

	form.addEventListener('submit', onSubmit);

	return () => {
		form.removeEventListener('submit', onSubmit);
		honeypotDiv?.remove();
		statusEl.remove();
	};
}
