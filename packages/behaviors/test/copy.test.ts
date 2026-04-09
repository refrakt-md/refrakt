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
	container.innerHTML = `<div class="rf-codeblock"><pre><code>${code}</code></pre></div>`;
	document.body.appendChild(container);
	return container;
}

describe('copyBehavior', () => {
	it('injects a copy button with SVG icon into pre elements', () => {
		const container = createCodeBlock('const x = 1;');

		copyBehavior(container);

		const btn = container.querySelector('.rf-codeblock__copy');
		expect(btn).not.toBeNull();
		expect(btn?.querySelector('svg')).not.toBeNull();
		expect(btn?.getAttribute('aria-label')).toBe('Copy code');
	});

	it('wraps bare pre in a .rf-codeblock div', () => {
		const container = createCodeBlock('hello');

		copyBehavior(container);

		const wrapper = container.querySelector('.rf-codeblock');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.querySelector('pre')).not.toBeNull();
		expect(wrapper?.querySelector('.rf-codeblock__copy')).not.toBeNull();
	});

	it('adds button to existing .rf-codeblock wrapper', () => {
		const container = createWrappedCodeBlock('hello');

		copyBehavior(container);

		// Should not create a nested wrapper
		const wrappers = container.querySelectorAll('.rf-codeblock');
		expect(wrappers).toHaveLength(1);
		expect(wrappers[0].querySelector('.rf-codeblock__copy')).not.toBeNull();
	});

	it('copies text content to clipboard on click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('const y = 2;');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('.rf-codeblock__copy')!;
		btn.click();

		expect(writeText).toHaveBeenCalledWith('const y = 2;');
	});

	it('swaps to checkmark icon after click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('.rf-codeblock__copy')!;
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

		const buttons = container.querySelectorAll('.rf-codeblock__copy');
		expect(buttons).toHaveLength(1);
	});

	it('does not add duplicate buttons to existing wrapper on re-init', () => {
		const container = createWrappedCodeBlock('code');

		copyBehavior(container);
		copyBehavior(container);

		const buttons = container.querySelectorAll('.rf-codeblock__copy');
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

		const buttons = container.querySelectorAll('.rf-codeblock__copy');
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

		const btn = container.querySelector<HTMLButtonElement>('.rf-codeblock__copy')!;
		btn.click();

		expect(writeText).toHaveBeenCalledWith('const x = 1;\nconst y = 2;');
	});

	it('adds rf-codeblock__copy--copied class after click', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('.rf-codeblock__copy')!;
		btn.click();

		await vi.waitFor(() => {
			expect(btn.classList.contains('rf-codeblock__copy--copied')).toBe(true);
		});
	});

	it('removes rf-codeblock__copy--copied class after timeout', async () => {
		vi.useFakeTimers();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		const container = createCodeBlock('code');
		copyBehavior(container);

		const btn = container.querySelector<HTMLButtonElement>('.rf-codeblock__copy')!;
		btn.click();

		await vi.advanceTimersByTimeAsync(0); // resolve clipboard promise
		expect(btn.classList.contains('rf-codeblock__copy--copied')).toBe(true);

		vi.advanceTimersByTime(2000);
		expect(btn.classList.contains('rf-codeblock__copy--copied')).toBe(false);

		vi.useRealTimers();
	});

	it('cleanup removes button and unwraps bare pre', () => {
		const container = createCodeBlock('code');

		const cleanup = copyBehavior(container);
		expect(container.querySelector('.rf-codeblock__copy')).not.toBeNull();

		cleanup();

		expect(container.querySelector('.rf-codeblock__copy')).toBeNull();
		// Bare pre was wrapped by behavior, so cleanup unwraps it
		expect(container.querySelector('.rf-codeblock')).toBeNull();
		expect(container.querySelector('pre')).not.toBeNull();
	});

	it('cleanup removes button but preserves existing wrapper', () => {
		const container = createWrappedCodeBlock('code');

		const cleanup = copyBehavior(container);
		expect(container.querySelector('.rf-codeblock__copy')).not.toBeNull();

		cleanup();

		expect(container.querySelector('.rf-codeblock__copy')).toBeNull();
		// Existing wrapper should be preserved
		expect(container.querySelector('.rf-codeblock')).not.toBeNull();
		expect(container.querySelector('pre')).not.toBeNull();
	});
});
