import type { CleanupFn } from '../types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const COPY_ICON = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
const CHECK_ICON = '<polyline points="20 6 9 17 4 12"/>';

function createIcon(svgContent: string): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('width', '16');
	svg.setAttribute('height', '16');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.innerHTML = svgContent;
	return svg;
}

/**
 * Extract copyable text from a `<pre>` element.
 *
 * If the element has a `data-copy-selector` attribute, only the text of
 * matching child elements is collected (joined with newlines). This lets
 * runes like diff exclude gutter numbers and prefixes from the copied text.
 * Otherwise falls back to the full `textContent`.
 */
function getCopyText(pre: HTMLElement): string {
	const selector = pre.getAttribute('data-copy-selector');
	if (selector) {
		const els = pre.querySelectorAll(selector);
		return Array.from(els).map((el) => el.textContent ?? '').join('\n');
	}
	return pre.textContent ?? '';
}

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
		btn.appendChild(createIcon(COPY_ICON));

		let timeout: ReturnType<typeof setTimeout> | undefined;

		const handler = () => {
			const text = getCopyText(pre);
			navigator.clipboard.writeText(text).then(() => {
				btn.innerHTML = '';
				btn.appendChild(createIcon(CHECK_ICON));
				btn.setAttribute('aria-label', 'Copied');
				btn.classList.add('rf-copy-btn--copied');
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => {
					btn.innerHTML = '';
					btn.appendChild(createIcon(COPY_ICON));
					btn.setAttribute('aria-label', 'Copy code');
					btn.classList.remove('rf-copy-btn--copied');
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
