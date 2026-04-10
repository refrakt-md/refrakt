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
			const style = getComputedStyle(container);
		mermaid.initialize({
			startOnLoad: false,
			theme: 'base',
			themeVariables: {
				primaryColor: style.getPropertyValue('--rf-color-primary-100').trim() || '#dcebf0',
				primaryTextColor: style.getPropertyValue('--rf-color-text').trim() || '#1d3557',
				primaryBorderColor: style.getPropertyValue('--rf-color-primary-400').trim() || '#70b4c0',
				secondaryColor: style.getPropertyValue('--rf-color-surface-hover').trim() || '#fdf0d5',
				secondaryTextColor: style.getPropertyValue('--rf-color-text').trim() || '#1d3557',
				secondaryBorderColor: style.getPropertyValue('--rf-color-border').trim() || '#d8e4de',
				tertiaryColor: style.getPropertyValue('--rf-color-info-bg').trim() || '#edf4f8',
				tertiaryTextColor: style.getPropertyValue('--rf-color-text').trim() || '#1d3557',
				tertiaryBorderColor: style.getPropertyValue('--rf-color-info-border').trim() || '#a8dadc',
				lineColor: style.getPropertyValue('--rf-color-muted').trim() || '#5a7a90',
				textColor: style.getPropertyValue('--rf-color-text').trim() || '#1d3557',
				mainBkg: style.getPropertyValue('--rf-color-primary-100').trim() || '#dcebf0',
				nodeBorder: style.getPropertyValue('--rf-color-primary-400').trim() || '#70b4c0',
				clusterBkg: style.getPropertyValue('--rf-color-surface').trim() || '#fffbf2',
				clusterBorder: style.getPropertyValue('--rf-color-border').trim() || '#d8e4de',
				edgeLabelBackground: style.getPropertyValue('--rf-color-surface').trim() || '#fffbf2',
				fontSize: '14px',
				fontFamily: style.getPropertyValue('--rf-font-sans').trim() || 'system-ui, sans-serif',
			},
		});
			const id = 'mermaid-' + Math.random().toString(36).slice(2);
			const { svg } = await mermaid.render(id, source);
			container.innerHTML = svg;
		} catch {
			// Mermaid failed — fallback <pre> remains visible
		}
	}
}
