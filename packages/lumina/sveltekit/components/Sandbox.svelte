<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';
	import type { DesignTokens } from '@refrakt-md/types';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const getMeta = (prop: string) => tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
		?.attributes?.content;

	const rawContent = $derived(getMeta('content') || '');
	const framework = $derived(getMeta('framework') || '');
	const dependencies = $derived(getMeta('dependencies') || '');
	const label = $derived(getMeta('label') || '');
	const heightAttr = $derived(getMeta('height') || 'auto');

	// Read theme from parent Preview (undefined when standalone)
	const previewTheme = getContext<{ readonly mode: string } | undefined>('rf-preview-theme');

	// Read design tokens from parent DesignContext (undefined when no context)
	const designTokensCtx = getContext<{ readonly tokens: DesignTokens } | undefined>('rf-design-tokens');

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

	function buildDesignTokenTags(tokens: DesignTokens): string {
		const parts: string[] = [];

		// Google Fonts link
		if (tokens.fonts && tokens.fonts.length > 0) {
			const families = tokens.fonts.map(f => {
				const name = f.family.replace(/ /g, '+');
				const weights = f.weights.sort((a, b) => a - b).join(';');
				return `family=${name}:wght@${weights}`;
			});
			const url = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
			parts.push(`<link rel="preconnect" href="https://fonts.googleapis.com">`);
			parts.push(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`);
			parts.push(`<link href="${url}" rel="stylesheet">`);
		}

		// CSS custom properties
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
			// Base typography rules
			if (tokens.fonts) {
				const bodyFont = tokens.fonts.find(f => f.role === 'body');
				const headingFont = tokens.fonts.find(f => f.role === 'heading');
				const monoFont = tokens.fonts.find(f => f.role === 'mono');
				if (bodyFont) rules.push(`body { font-family: var(--font-body); }`);
				if (headingFont) rules.push(`h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }`);
				if (monoFont) rules.push(`code, pre, kbd { font-family: var(--font-mono); }`);
			}
			parts.push(`<style>\n${rules.join('\n')}\n</style>`);
		}

		return parts.join('\n');
	}

	function buildTailwindTokenConfig(tokens: DesignTokens): string {
		const extend: Record<string, any> = {};
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

	function buildDependencyTags(): string {
		const tags: string[] = [];

		// Design tokens (injected before framework so they serve as defaults)
		const tokens = designTokensCtx?.tokens;
		if (tokens) {
			tags.push(buildDesignTokenTags(tokens));
		}

		if (framework && FRAMEWORK_PRESETS[framework]) {
			// If we have tokens and tailwind, use token-aware config instead of default
			if (framework === 'tailwind' && tokens) {
				tags.push(`<script src="https://cdn.tailwindcss.com"><\/script>`);
				const tokenConfig = buildTailwindTokenConfig(tokens);
				if (tokenConfig) {
					tags.push(tokenConfig);
				} else {
					tags.push(`<script>tailwind.config = { darkMode: "class" }<\/script>`);
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
					tags.push(`<script src="${url}"><\/script>`);
				}
			}
		}
		return tags.join('\n');
	}

	// Strip data-source attributes from rendered content (authoring markers only)
	const renderedContent = $derived(rawContent.replace(/\s*data-source(?:="[^"]*")?/g, ''));

	// Bake initial theme into srcdoc so iframe starts correct on (re)creation
	const initialTheme = $derived(previewTheme?.mode);
	const htmlAttrs = $derived(initialTheme === 'dark' ? ' class="dark" data-theme="dark"'
		: initialTheme === 'light' ? ' data-theme="light"'
		: '');

	const srcdoc = $derived(`<!DOCTYPE html>
<html${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${buildDependencyTags()}
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

  // Sync .dark class with OS preference as default
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function applyOsTheme() {
    if (!document.documentElement.hasAttribute('data-theme')) {
      document.documentElement.classList.toggle('dark', mq.matches);
    }
  }
  applyOsTheme();
  mq.addEventListener('change', applyOsTheme);

  // Listen for explicit theme from parent Preview
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
</html>`);

	let iframeEl: HTMLIFrameElement;
	let iframeHeight = $state(heightAttr !== 'auto' ? parseInt(heightAttr) : 150);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;

		if (heightAttr === 'auto') {
			const handler = (e: MessageEvent) => {
				if (e.data?.type === 'rf-sandbox-resize' && e.source === iframeEl?.contentWindow) {
					iframeHeight = e.data.height;
				}
			};
			window.addEventListener('message', handler);
			return () => window.removeEventListener('message', handler);
		}
	});

	// Send theme to iframe once it loads (iframeEl is bound after mounted re-render)
	$effect(() => {
		if (!iframeEl || !previewTheme) return;

		const sendTheme = () => {
			iframeEl.contentWindow?.postMessage(
				{ type: 'rf-sandbox-theme', theme: previewTheme.mode }, '*'
			);
		};

		iframeEl.addEventListener('load', sendTheme);
		return () => iframeEl.removeEventListener('load', sendTheme);
	});

	// Post theme changes to iframe when Preview toggle changes
	$effect(() => {
		// Read theme first to always subscribe to changes
		const theme = previewTheme?.mode;
		if (!theme || !mounted || !iframeEl?.contentWindow) return;
		iframeEl.contentWindow.postMessage(
			{ type: 'rf-sandbox-theme', theme }, '*'
		);
	});
</script>

<div class="rf-sandbox" data-framework={framework || undefined}>
	{#if mounted}
		<iframe
			bind:this={iframeEl}
			{srcdoc}
			sandbox="allow-scripts allow-same-origin"
			title={label || 'Sandbox'}
			frameborder="0"
			loading="lazy"
			style="width: 100%; height: {iframeHeight}px; border: none;"
		></iframe>
	{:else}
		{@render children()}
	{/if}
</div>
