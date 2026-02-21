import type { CleanupFn } from '../types.js';

/**
 * Copy-to-clipboard behavior for code blocks.
 *
 * Finds all `<pre>` elements within the container and injects a copy button.
 * Works on standalone code blocks and code blocks inside rune containers.
 */
export function copyBehavior(container: HTMLElement | Document): CleanupFn {
	const pres = container.querySelectorAll<HTMLElement>('pre');
	const cleanups: Array<() => void> = [];

	for (const pre of pres) {
		// Skip if already wrapped with a copy button (by this behavior or by a framework component)
		if (pre.parentElement?.classList.contains('rf-code-wrapper')) continue;
		if (pre.parentElement?.classList.contains('rf-codeblock')) continue;

		const btn = document.createElement('button');
		btn.className = 'rf-copy-btn';
		btn.type = 'button';
		btn.setAttribute('aria-label', 'Copy code');
		btn.textContent = 'Copy';

		let timeout: ReturnType<typeof setTimeout> | undefined;

		const handler = () => {
			const text = pre.textContent ?? '';
			navigator.clipboard.writeText(text).then(() => {
				btn.textContent = 'Copied!';
				btn.setAttribute('aria-label', 'Copied');
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => {
					btn.textContent = 'Copy';
					btn.setAttribute('aria-label', 'Copy code');
				}, 2000);
			});
		};

		btn.addEventListener('click', handler);

		// Wrap pre in a relative container for positioning if not already wrapped
		const wrapper = document.createElement('div');
		wrapper.className = 'rf-code-wrapper';
		pre.parentNode?.insertBefore(wrapper, pre);
		wrapper.appendChild(pre);
		wrapper.appendChild(btn);

		cleanups.push(() => {
			btn.removeEventListener('click', handler);
			if (timeout) clearTimeout(timeout);
			// Unwrap: move pre back out, remove wrapper and button
			wrapper.parentNode?.insertBefore(pre, wrapper);
			wrapper.remove();
		});
	}

	return () => cleanups.forEach((fn) => fn());
}
