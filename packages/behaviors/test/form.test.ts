/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formBehavior } from '../src/behaviors/form.js';

beforeEach(() => {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

function createForm(opts?: {
	action?: string;
	method?: string;
	success?: string;
	error?: string;
	honeypot?: boolean;
}): HTMLFormElement {
	const form = document.createElement('form');
	form.setAttribute('data-rune', 'form');
	form.className = 'rf-form';

	if (opts?.action) form.setAttribute('data-action', opts.action);
	if (opts?.method) form.setAttribute('data-method', opts.method);
	if (opts?.success) form.setAttribute('data-success', opts.success);
	if (opts?.error) form.setAttribute('data-error', opts.error);
	if (opts?.honeypot === false) form.setAttribute('data-honeypot', 'false');

	form.innerHTML = `
		<div class="rf-form-field">
			<label for="field-name">Name</label>
			<input type="text" id="field-name" name="field-name" />
		</div>
		<button type="submit" class="rf-form__submit">Submit</button>
	`;

	document.body.appendChild(form);
	return form;
}

describe('formBehavior', () => {
	describe('honeypot', () => {
		it('injects honeypot field by default', () => {
			const form = createForm({ action: '/api/submit' });
			formBehavior(form);

			const hp = form.querySelector('.rf-form__hp');
			expect(hp).not.toBeNull();
			expect(hp!.getAttribute('aria-hidden')).toBe('true');

			const input = hp!.querySelector('input');
			expect(input!.name).toBe('_gotcha');
			expect(input!.tabIndex).toBe(-1);
		});

		it('does not inject honeypot when disabled', () => {
			const form = createForm({ action: '/api/submit', honeypot: false });
			formBehavior(form);

			expect(form.querySelector('.rf-form__hp')).toBeNull();
		});
	});

	describe('status element', () => {
		it('injects a hidden status element', () => {
			const form = createForm({ action: '/api/submit' });
			formBehavior(form);

			const status = form.querySelector('.rf-form__status');
			expect(status).not.toBeNull();
			expect((status as HTMLElement).hidden).toBe(true);
		});
	});

	describe('submission', () => {
		it('shows submitting status on submit', async () => {
			const form = createForm({ action: '/api/submit' });
			formBehavior(form);

			// Mock fetch to delay
			const fetchPromise = new Promise<Response>(() => {});
			vi.spyOn(globalThis, 'fetch').mockReturnValue(fetchPromise);

			form.dispatchEvent(new Event('submit', { cancelable: true }));

			// Wait for microtask
			await Promise.resolve();

			const status = form.querySelector('.rf-form__status')!;
			expect(status.classList.contains('rf-form__status--submitting')).toBe(true);
			expect(status.getAttribute('role')).toBe('status');
			expect(status.textContent).toBe('Submitting...');
		});

		it('shows success message on successful submit', async () => {
			const form = createForm({ action: '/api/submit', success: 'Thank you!' });
			formBehavior(form);

			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('ok', { status: 200 }),
			);

			form.dispatchEvent(new Event('submit', { cancelable: true }));
			await vi.waitFor(() => {
				const status = form.querySelector('.rf-form__status')!;
				expect(status.classList.contains('rf-form__status--success')).toBe(true);
			});

			const status = form.querySelector('.rf-form__status')!;
			expect(status.getAttribute('role')).toBe('alert');
			expect(status.textContent).toBe('Thank you!');
		});

		it('shows error message on failed submit', async () => {
			const form = createForm({ action: '/api/submit', error: 'Something broke!' });
			formBehavior(form);

			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('error', { status: 500 }),
			);

			form.dispatchEvent(new Event('submit', { cancelable: true }));
			await vi.waitFor(() => {
				const status = form.querySelector('.rf-form__status')!;
				expect(status.classList.contains('rf-form__status--error')).toBe(true);
			});

			const status = form.querySelector('.rf-form__status')!;
			expect(status.getAttribute('role')).toBe('alert');
			expect(status.textContent).toBe('Something broke!');
		});

		it('shows error message on network failure', async () => {
			const form = createForm({ action: '/api/submit' });
			formBehavior(form);

			vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

			form.dispatchEvent(new Event('submit', { cancelable: true }));
			await vi.waitFor(() => {
				const status = form.querySelector('.rf-form__status')!;
				expect(status.classList.contains('rf-form__status--error')).toBe(true);
			});
		});

		it('calls fetch with correct parameters', async () => {
			const form = createForm({ action: '/api/submit', method: 'PUT' });
			formBehavior(form);

			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('ok', { status: 200 }),
			);

			form.dispatchEvent(new Event('submit', { cancelable: true }));
			await vi.waitFor(() => {
				expect(fetchSpy).toHaveBeenCalled();
			});

			expect(fetchSpy).toHaveBeenCalledWith('/api/submit', expect.objectContaining({
				method: 'PUT',
				headers: { 'Accept': 'application/json' },
			}));
		});

		it('does not submit if no action is set', () => {
			const form = createForm();
			formBehavior(form);

			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			form.dispatchEvent(new Event('submit', { cancelable: true }));

			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('resets form on success', async () => {
			const form = createForm({ action: '/api/submit' });
			formBehavior(form);

			const input = form.querySelector<HTMLInputElement>('input[name="field-name"]')!;
			input.value = 'Test';

			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('ok', { status: 200 }),
			);

			const resetSpy = vi.spyOn(form, 'reset');

			form.dispatchEvent(new Event('submit', { cancelable: true }));
			await vi.waitFor(() => {
				expect(resetSpy).toHaveBeenCalled();
			});
		});
	});

	describe('cleanup', () => {
		it('removes honeypot and status on cleanup', () => {
			const form = createForm({ action: '/api/submit' });
			const cleanup = formBehavior(form);

			expect(form.querySelector('.rf-form__hp')).not.toBeNull();
			expect(form.querySelector('.rf-form__status')).not.toBeNull();

			cleanup();

			expect(form.querySelector('.rf-form__hp')).toBeNull();
			expect(form.querySelector('.rf-form__status')).toBeNull();
		});

		it('removes submit listener on cleanup', () => {
			const form = createForm({ action: '/api/submit' });
			const cleanup = formBehavior(form);

			cleanup();

			const fetchSpy = vi.spyOn(globalThis, 'fetch');
			form.dispatchEvent(new Event('submit', { cancelable: true }));

			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});

	it('handles non-form element', () => {
		const el = document.createElement('div');
		el.setAttribute('data-rune', 'form');
		document.body.appendChild(el);

		const cleanup = formBehavior(el);
		cleanup();
	});
});
