import { readHiddenContent } from './helpers.js';
import { SafeHTMLElement } from './ssr-safe.js';

/**
 * <rf-diagram> — renders Mermaid diagrams or ASCII art.
 *
 * The postTransform hook produces:
 * - data-language attribute (mermaid | ascii)
 * - A visible <pre><code> fallback (SSR-friendly)
 * - A hidden div with the raw source for the web component to read
 *
 * Progressive enhancement: <pre><code> fallback is shown until Mermaid renders SVG.
 */
export class RfDiagram extends SafeHTMLElement {
	connectedCallback() {
		const language = this.dataset.language || 'mermaid';
		const source = readHiddenContent(this, 'source');
		const container = this.querySelector<HTMLElement>('.rf-diagram__container');
		if (!container || !source) return;

		if (language === 'mermaid') {
			this.renderMermaid(source, container);
		} else if (language === 'ascii') {
			container.textContent = source;
			container.style.fontFamily = 'var(--rf-font-mono)';
			container.style.whiteSpace = 'pre';
		}
	}

	private async renderMermaid(source: string, container: HTMLElement) {
		try {
			const cdn = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
			const mermaid = (await import(/* @vite-ignore */ cdn)).default;
			mermaid.initialize({ startOnLoad: false, theme: 'default' });
			const id = 'mermaid-' + Math.random().toString(36).slice(2);
			const { svg } = await mermaid.render(id, source);
			container.innerHTML = svg;
		} catch {
			// Mermaid failed — fallback <pre> remains visible
		}
	}
}
