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

function createWrappedCodeBlock(code: string): HTMLElement {
	const container = document.createElement('div');
	container.innerHTML = `<div class="rf-codeblock" data-wrapper="code"><pre><code>${code}</code></pre></div>`;
	document.body.appendChild(container);
	return container;
}

describe('copyBehavior', () => {
	it('injects a copy button with SVG icon into pre elements', () => {
		const container = createCodeBlock('const x = 1;');

		copyBehavior(container);

		const btn = container.querySelector('[data-copy-button]');
		expect(btn).not.toBeNull();
		expect(btn?.querySelector('svg')).not.toBeNull();
		expect(btn?.getAttribute('aria-label')).toBe('Copy code');
	});

	it('wraps bare pre in a code wrapper', () => {
		const container = createCodeBlock('hello');

		copyBehavior(container);

		const wrapper = container.querySelector('[data-wrapper="code"]');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.querySelector('pre')).not.toBeNull();
		expect(wrapper?.querySelector('[data-copy-button]')).not.toBeNull();
	});

	it('adds button to existing code wrapper', () => {
		const container = createWrappedCodeBlock('hello');

		copyBehavior(container);

		// Should not create a nested wrapper
		const wrappers = container.querySelectorAll('[data-wrapper="code"]');
		expect(wrappers).toHaveLength(1);
		expect(wrappers[0].querySelector('[data-copy-button]')).not.toBeNull();
	});

	it('copies text content to clipboard on click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('const y = 2;');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('[data-copy-button]')!;
		btn.click();

		expect(writeText).toHaveBeenCalledWith('const y = 2;');
	});

	it('swaps to checkmark icon after click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('[data-copy-button]')!;
		const initialSvg = btn.querySelector('svg')!.innerHTML;
		btn.click();

		await vi.waitFor(() => {
			expect(btn.getAttribute('aria-label')).toBe('Copied');
			const currentSvg = btn.querySelector('svg')!.innerHTML;
			expect(currentSvg).not.toBe(initialSvg);
		});
	});

	it('does not add duplicate buttons on re-init', () => {
		const container = createCodeBlock('code');

		copyBehavior(container);
		copyBehavior(container);

		const buttons = container.querySelectorAll('[data-copy-button]');
		expect(buttons).toHaveLength(1);
	});

	it('does not add duplicate buttons to existing wrapper on re-init', () => {
		const container = createWrappedCodeBlock('code');

		copyBehavior(container);
		copyBehavior(container);

		const buttons = container.querySelectorAll('[data-copy-button]');
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

		const buttons = container.querySelectorAll('[data-copy-button]');
		expect(buttons).toHaveLength(2);
	});

	it('uses data-copy-selector to extract text from matching children', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = document.createElement('div');
		container.innerHTML = `
			<pre data-copy-selector="[data-name='line-content']">
				<span data-name="line">
					<span data-name="gutter-num">1</span>
					<span data-name="line-content">const x = 1;</span>
				</span>
				<span data-name="line">
					<span data-name="gutter-num">2</span>
					<span data-name="line-content">const y = 2;</span>
				</span>
			</pre>
		`;
		document.body.appendChild(container);

		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('[data-copy-button]')!;
		btn.click();

		expect(writeText).toHaveBeenCalledWith('const x = 1;\nconst y = 2;');
	});

	it('sets data-state="copied" after click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('[data-copy-button]')!;
		btn.click();

		await vi.waitFor(() => {
			expect(btn.getAttribute('data-state')).toBe('copied');
		});
	});

	it('clears data-state after timeout', async () => {
		vi.useFakeTimers();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('[data-copy-button]')!;
		btn.click();

		await vi.advanceTimersByTimeAsync(0); // resolve clipboard promise
		expect(btn.getAttribute('data-state')).toBe('copied');

		vi.advanceTimersByTime(2000);
		expect(btn.hasAttribute('data-state')).toBe(false);

		vi.useRealTimers();
	});

	it('cleanup removes button and unwraps bare pre', () => {
		const container = createCodeBlock('code');

		const cleanup = copyBehavior(container);
		expect(container.querySelector('[data-copy-button]')).not.toBeNull();

		cleanup();

		expect(container.querySelector('[data-copy-button]')).toBeNull();
		// Bare pre was wrapped by behavior, so cleanup unwraps it
		expect(container.querySelector('[data-wrapper="code"]')).toBeNull();
		expect(container.querySelector('pre')).not.toBeNull();
	});

	it('cleanup removes button but preserves existing wrapper', () => {
		const container = createWrappedCodeBlock('code');

		const cleanup = copyBehavior(container);
		expect(container.querySelector('[data-copy-button]')).not.toBeNull();

		cleanup();

		expect(container.querySelector('[data-copy-button]')).toBeNull();
		// Existing wrapper should be preserved
		expect(container.querySelector('[data-wrapper="code"]')).not.toBeNull();
		expect(container.querySelector('pre')).not.toBeNull();
	});
});
