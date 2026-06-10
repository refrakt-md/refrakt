import { readHiddenContent } from './helpers.js';
import { SafeHTMLElement } from './ssr-safe.js';

/**
 * <rf-diagram> — renders Mermaid diagrams or ASCII art.
 *
 * The postTransform hook produces:
 * - data-language attribute (mermaid | ascii)
 * - A visible <pre><code> fallback (SSR-friendly)
 * - A hidden <template data-content="source"> with the raw source
 *
 * Progressive enhancement: <pre><code> fallback is shown until Mermaid renders SVG.
 */
function isDarkScheme(): boolean {
	const pref = document.documentElement.dataset.theme;
	if (pref === 'dark') return true;
	if (pref === 'light') return false;
	return matchMedia('(prefers-color-scheme: dark)').matches;
}

export class RfDiagram extends SafeHTMLElement {
	private themeObserver?: MutationObserver;
	private mediaQuery?: MediaQueryList;
	private mediaListener?: () => void;
	private source = '';
	private container: HTMLElement | null = null;
	private language = 'mermaid';

	connectedCallback() {
		// Defer one frame so children are guaranteed present after SPA
		// navigation. Svelte's `{#key page.url}` may insert this element
		// before its declarative children, which would empty the source
		// read and silently no-op the render.
		requestAnimationFrame(() => this.tryRender());
	}

	disconnectedCallback() {
		this.themeObserver?.disconnect();
		if (this.mediaQuery && this.mediaListener) {
			this.mediaQuery.removeEventListener('change', this.mediaListener);
		}
	}

	private tryRender(attempt = 0) {
		this.language = this.dataset.language || 'mermaid';
		this.source = readHiddenContent(this, 'source');
		this.container = this.querySelector<HTMLElement>('.rf-diagram__container');
		if (!this.container) return;
		if (!this.source) {
			// Children not in yet — retry on the next frame. A couple of
			// retries is enough for the SPA-navigation race; beyond that,
			// give up so a genuinely empty diagram doesn't loop forever.
			if (attempt < 3) requestAnimationFrame(() => this.tryRender(attempt + 1));
			return;
		}

		if (this.language === 'mermaid') {
			this.renderMermaid();
			this.watchThemeChanges();
		} else if (this.language === 'ascii') {
			this.container.textContent = this.source;
			this.container.style.fontFamily = 'var(--rf-font-mono)';
			this.container.style.whiteSpace = 'pre';
		}
	}

	/**
	 * Mermaid bakes its palette into the SVG at render time, so toggling
	 * dark mode after first render leaves a light-mode diagram on a dark
	 * page (and vice-versa). Re-render whenever any source of truth for
	 * the scheme changes:
	 *   • `data-theme` on <html> — the global toggle / pre-paint result;
	 *   • `data-color-scheme` on any ancestor — the per-subtree override
	 *     used by `preview` (its theme toggle), `tint`, and cover scope;
	 *   • system `prefers-color-scheme` — when neither attribute is set,
	 *     we follow the OS.
	 * Subtree-watching the documentElement is cheap because the filter
	 * limits the callback to the two attributes we care about.
	 */
	private watchThemeChanges() {
		this.themeObserver?.disconnect();
		this.themeObserver = new MutationObserver(() => this.renderMermaid());
		this.themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme', 'data-color-scheme'],
			subtree: true,
		});
		if (!this.mediaQuery) {
			this.mediaQuery = matchMedia('(prefers-color-scheme: dark)');
			this.mediaListener = () => {
				if (!document.documentElement.dataset.theme) this.renderMermaid();
			};
			this.mediaQuery.addEventListener('change', this.mediaListener);
		}
	}

	private async renderMermaid() {
		if (!this.container || !this.source) return;
		try {
			const cdn = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
			const mermaid = (await import(/* @vite-ignore */ cdn)).default;
			const style = getComputedStyle(this.container);
			const dark = isDarkScheme();
			// Mermaid bakes inline fills into the SVG, so `theme` picks the
			// baseline palette and our themeVariables paint on top. `base` in
			// light mode gives us the soft-on-soft look; switching to `dark`
			// in dark mode makes Mermaid derive its own auxiliaries (note
			// backgrounds, sub-graph borders, etc.) for the dark substrate
			// instead of letting the base auto-derivation pull them light.
			mermaid.initialize({
				startOnLoad: false,
				theme: dark ? 'dark' : 'base',
				themeVariables: {
					darkMode: dark,
					primaryColor: style.getPropertyValue('--rf-color-surface').trim() || '#fbfaf7',
					primaryTextColor: style.getPropertyValue('--rf-color-text').trim() || '#1c1a17',
					primaryBorderColor: style.getPropertyValue('--rf-color-border').trim() || '#e2e0dd',
					secondaryColor: style.getPropertyValue('--rf-color-surface-hover').trim() || '#ecebe8',
					secondaryTextColor: style.getPropertyValue('--rf-color-text').trim() || '#1c1a17',
					secondaryBorderColor: style.getPropertyValue('--rf-color-border').trim() || '#e2e0dd',
					tertiaryColor: style.getPropertyValue('--rf-color-info-bg').trim() || '#e8edf4',
					tertiaryTextColor: style.getPropertyValue('--rf-color-text').trim() || '#1c1a17',
					tertiaryBorderColor: style.getPropertyValue('--rf-color-info-border').trim() || '#c5d2e0',
					lineColor: style.getPropertyValue('--rf-color-muted').trim() || '#6b6661',
					textColor: style.getPropertyValue('--rf-color-text').trim() || '#1c1a17',
					mainBkg: style.getPropertyValue('--rf-color-surface').trim() || '#fbfaf7',
					nodeBorder: style.getPropertyValue('--rf-color-border').trim() || '#e2e0dd',
					clusterBkg: style.getPropertyValue('--rf-color-surface').trim() || '#fbfaf7',
					clusterBorder: style.getPropertyValue('--rf-color-border').trim() || '#e2e0dd',
					edgeLabelBackground: style.getPropertyValue('--rf-color-surface').trim() || '#fbfaf7',
					fontSize: '14px',
					fontFamily: style.getPropertyValue('--rf-font-sans').trim() || 'system-ui, sans-serif',
				},
			});
			const id = 'mermaid-' + Math.random().toString(36).slice(2);
			const { svg } = await mermaid.render(id, this.source);
			this.container.innerHTML = svg;
			this.dataset.rendered = '';
		} catch {
			// Mermaid failed — fallback <pre> remains visible
		}
	}
}
