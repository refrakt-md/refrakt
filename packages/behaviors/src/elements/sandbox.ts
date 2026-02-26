import { RfContext } from './context.js';
import type { DesignTokens } from './context.js';
import { readHiddenContent } from './helpers.js';

const FRAMEWORK_PRESETS: Record<string, string[]> = {
	tailwind: [
		'<script src="https://cdn.tailwindcss.com"><\/script>',
		'<script>tailwind.config = { darkMode: "class" }<\/script>',
	],
	bootstrap: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">'],
	bulma: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1/css/bulma.min.css">'],
	pico: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">'],
};

const ROLE_FALLBACKS: Record<string, string> = {
	heading: 'sans-serif',
	body: 'sans-serif',
	mono: 'monospace',
	display: 'sans-serif',
	caption: 'sans-serif',
};

/**
 * <rf-sandbox> — renders user HTML/CSS/JS in an isolated iframe.
 *
 * Reads content from <template data-content="source">, framework/dependencies
 * from data attributes, and design tokens + theme from RfContext.
 *
 * Features:
 * - Framework preset injection (Tailwind, Bootstrap, Bulma, Pico)
 * - Design token CSS custom properties
 * - Auto-sizing via ResizeObserver + postMessage
 * - Theme synchronization via postMessage
 */
import { SafeHTMLElement } from './ssr-safe.js';

export class RfSandbox extends SafeHTMLElement {
	private iframe: HTMLIFrameElement | null = null;
	private messageHandler: ((e: MessageEvent) => void) | null = null;
	private themeCleanup: (() => void) | null = null;

	connectedCallback() {
		const content = readHiddenContent(this, 'source');
		const framework = this.dataset.framework || '';
		const dependencies = this.dataset.dependencies || '';
		const label = this.dataset.label || 'Sandbox';
		const heightAttr = this.dataset.height || 'auto';

		const srcdoc = this.buildSrcdoc(content, framework, dependencies);

		// Create iframe
		this.iframe = document.createElement('iframe');
		this.iframe.srcdoc = srcdoc;
		this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
		this.iframe.title = label;
		this.iframe.setAttribute('frameborder', '0');
		this.iframe.loading = 'lazy';
		this.iframe.style.cssText = `width: 100%; border: none; height: ${heightAttr !== 'auto' ? parseInt(heightAttr) + 'px' : '150px'};`;

		// Auto-sizing
		if (heightAttr === 'auto') {
			this.messageHandler = (e: MessageEvent) => {
				if (e.data?.type === 'rf-sandbox-resize' && e.source === this.iframe?.contentWindow) {
					this.iframe!.style.height = e.data.height + 'px';
				}
			};
			window.addEventListener('message', this.messageHandler);
		}

		// Theme sync — send initial theme on load, subscribe to changes
		const sendTheme = (theme: string) => {
			this.iframe?.contentWindow?.postMessage({ type: 'rf-sandbox-theme', theme }, '*');
		};

		this.iframe.addEventListener('load', () => sendTheme(RfContext.theme));

		this.themeCleanup = RfContext.onThemeChange((theme) => {
			sendTheme(theme);
		});

		// Clear fallback content and insert iframe
		this.replaceChildren(this.iframe);
	}

	disconnectedCallback() {
		if (this.messageHandler) {
			window.removeEventListener('message', this.messageHandler);
			this.messageHandler = null;
		}
		if (this.themeCleanup) {
			this.themeCleanup();
			this.themeCleanup = null;
		}
		this.iframe = null;
	}

	private buildSrcdoc(content: string, framework: string, dependencies: string): string {
		const depTags = this.buildDependencyTags(framework, dependencies);
		const theme = RfContext.theme;
		const htmlAttrs = theme === 'dark' ? ' class="dark" data-theme="dark"'
			: theme === 'light' ? ' data-theme="light"'
			: '';

		// Strip data-source attributes from rendered content (authoring markers only)
		const renderedContent = content.replace(/\s*data-source(?:="[^"]*")?/g, '');

		return `<!DOCTYPE html>
<html${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${depTags}
<style>
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; color-scheme: light dark; overflow: hidden; }
</style>
</head>
<body>
${renderedContent}
<script>
  const ro = new ResizeObserver(() => {
    parent.postMessage({ type: 'rf-sandbox-resize', height: document.body.scrollHeight }, '*');
  });
  ro.observe(document.body);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function applyOsTheme() {
    if (!document.documentElement.hasAttribute('data-theme')) {
      document.documentElement.classList.toggle('dark', mq.matches);
    }
  }
  applyOsTheme();
  mq.addEventListener('change', applyOsTheme);

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'rf-sandbox-theme') {
      const theme = e.data.theme;
      const html = document.documentElement;
      if (theme === 'dark') {
        html.classList.add('dark');
        html.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        html.classList.remove('dark');
        html.setAttribute('data-theme', 'light');
      } else {
        html.removeAttribute('data-theme');
        html.classList.toggle('dark', mq.matches);
      }
    }
  });
<\/script>
</body>
</html>`;
	}

	private buildDependencyTags(framework: string, dependencies: string): string {
		const tags: string[] = [];
		const tokens = RfContext.designTokens;

		// Design tokens (injected before framework so they serve as defaults)
		if (tokens) {
			tags.push(this.buildDesignTokenTags(tokens));
		}

		if (framework && FRAMEWORK_PRESETS[framework]) {
			if (framework === 'tailwind' && tokens) {
				tags.push('<script src="https://cdn.tailwindcss.com"><\\/script>');
				const tokenConfig = this.buildTailwindTokenConfig(tokens);
				if (tokenConfig) {
					tags.push(tokenConfig);
				} else {
					tags.push('<script>tailwind.config = { darkMode: "class" }<\\/script>');
				}
			} else {
				tags.push(...FRAMEWORK_PRESETS[framework]);
			}
		}

		if (dependencies) {
			for (const url of dependencies.split(',').map(u => u.trim()).filter(Boolean)) {
				if (url.endsWith('.css')) {
					tags.push(`<link rel="stylesheet" href="${url}">`);
				} else {
					tags.push(`<script src="${url}"><\\/script>`);
				}
			}
		}

		return tags.join('\n');
	}

	private buildDesignTokenTags(tokens: DesignTokens): string {
		const parts: string[] = [];

		if (tokens.fonts && tokens.fonts.length > 0) {
			const families = tokens.fonts.map(f => {
				const name = f.family.replace(/ /g, '+');
				const weights = f.weights.sort((a, b) => a - b).join(';');
				return `family=${name}:wght@${weights}`;
			});
			const url = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
			parts.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
			parts.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
			parts.push(`<link href="${url}" rel="stylesheet">`);
		}

		const vars: string[] = [];
		if (tokens.fonts) {
			for (const f of tokens.fonts) {
				const fallback = ROLE_FALLBACKS[f.role] || 'sans-serif';
				vars.push(`  --font-${f.role}: '${f.family}', ${fallback};`);
			}
		}
		if (tokens.colors) {
			for (const c of tokens.colors) {
				const varName = c.name.toLowerCase().replace(/\s+/g, '-');
				vars.push(`  --color-${varName}: ${c.value};`);
			}
		}
		if (tokens.spacing?.unit) {
			vars.push(`  --spacing-unit: ${tokens.spacing.unit};`);
		}
		if (tokens.radii) {
			for (const r of tokens.radii) {
				const varName = r.name.toLowerCase().replace(/\s+/g, '-');
				vars.push(`  --radius-${varName}: ${r.value};`);
			}
		}
		if (tokens.shadows) {
			for (const s of tokens.shadows) {
				const varName = s.name.toLowerCase().replace(/\s+/g, '-');
				vars.push(`  --shadow-${varName}: ${s.value};`);
			}
		}

		if (vars.length > 0) {
			const rules: string[] = [`:root {\n${vars.join('\n')}\n}`];
			if (tokens.fonts) {
				const bodyFont = tokens.fonts.find(f => f.role === 'body');
				const headingFont = tokens.fonts.find(f => f.role === 'heading');
				const monoFont = tokens.fonts.find(f => f.role === 'mono');
				if (bodyFont) rules.push('body { font-family: var(--font-body); }');
				if (headingFont) rules.push('h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }');
				if (monoFont) rules.push('code, pre, kbd { font-family: var(--font-mono); }');
			}
			parts.push(`<style>\n${rules.join('\n')}\n</style>`);
		}

		return parts.join('\n');
	}

	private buildTailwindTokenConfig(tokens: DesignTokens): string {
		const extend: Record<string, Record<string, unknown>> = {};
		if (tokens.fonts) {
			extend.fontFamily = {};
			for (const f of tokens.fonts) {
				const fallback = ROLE_FALLBACKS[f.role] || 'sans-serif';
				extend.fontFamily[f.role] = [`'${f.family}'`, fallback];
			}
		}
		if (tokens.colors) {
			extend.colors = {};
			for (const c of tokens.colors) {
				const key = c.name.toLowerCase().replace(/\s+/g, '-');
				extend.colors[key] = c.value;
			}
		}
		if (tokens.radii) {
			extend.borderRadius = {};
			for (const r of tokens.radii) {
				const key = r.name.toLowerCase().replace(/\s+/g, '-');
				extend.borderRadius[key] = r.value;
			}
		}
		if (Object.keys(extend).length === 0) return '';
		return `<script>tailwind.config = { darkMode: "class", theme: { extend: ${JSON.stringify(extend)} } }<\/script>`;
	}
}
