/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyBehavior } from '../src/behaviors/copy.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

function createCodeBlock(code: string): HTMLElement {
	const container = document.createElement('div');
	container.innerHTML = `<pre><code>${code}</code></pre>`;
	document.body.appendChild(container);
	return container;
}

describe('copyBehavior', () => {
	it('injects a copy button into pre elements', () => {
		const container = createCodeBlock('const x = 1;');

		copyBehavior(container);

		const btn = container.querySelector('.rf-copy-btn');
		expect(btn).not.toBeNull();
		expect(btn?.textContent).toBe('Copy');
		expect(btn?.getAttribute('aria-label')).toBe('Copy code');
	});

	it('wraps pre in a .rf-code-wrapper div', () => {
		const container = createCodeBlock('hello');

		copyBehavior(container);

		const wrapper = container.querySelector('.rf-code-wrapper');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.querySelector('pre')).not.toBeNull();
		expect(wrapper?.querySelector('.rf-copy-btn')).not.toBeNull();
	});

	it('copies text content to clipboard on click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('const y = 2;');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('.rf-copy-btn')!;
		btn.click();

		expect(writeText).toHaveBeenCalledWith('const y = 2;');
	});

	it('shows "Copied!" feedback after click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('.rf-copy-btn')!;
		btn.click();

		// Wait for the promise to resolve
		await vi.waitFor(() => {
			expect(btn.textContent).toBe('Copied!');
			expect(btn.getAttribute('aria-label')).toBe('Copied');
		});
	});

	it('does not add duplicate buttons on re-init', () => {
		const container = createCodeBlock('code');

		copyBehavior(container);
		copyBehavior(container);

		const buttons = container.querySelectorAll('.rf-copy-btn');
		expect(buttons).toHaveLength(1);
	});

	it('handles multiple pre elements', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<pre><code>block 1</code></pre>
			<pre><code>block 2</code></pre>
		`;
		document.body.appendChild(container);

		copyBehavior(container);

		const buttons = container.querySelectorAll('.rf-copy-btn');
		expect(buttons).toHaveLength(2);
	});

	it('cleanup removes buttons and unwraps pre', () => {
		const container = createCodeBlock('code');

		const cleanup = copyBehavior(container);
		expect(container.querySelector('.rf-copy-btn')).not.toBeNull();

		cleanup();

		expect(container.querySelector('.rf-copy-btn')).toBeNull();
		expect(container.querySelector('.rf-code-wrapper')).toBeNull();
		expect(container.querySelector('pre')).not.toBeNull();
	});
});
