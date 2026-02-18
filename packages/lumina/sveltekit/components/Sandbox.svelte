<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const getMeta = (prop: string) => tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
		?.attributes?.content;

	const rawContent: string = getMeta('content') || '';
	const framework: string = getMeta('framework') || '';
	const dependencies: string = getMeta('dependencies') || '';
	const label: string = getMeta('label') || '';
	const heightAttr: string = getMeta('height') || 'auto';

	// Read theme from parent Preview (undefined when standalone)
	const previewTheme = getContext<{ readonly mode: string } | undefined>('rf-preview-theme');

	const FRAMEWORK_PRESETS: Record<string, string[]> = {
		tailwind: [
			'<script src="https://cdn.tailwindcss.com"><\/script>',
			'<script>tailwind.config = { darkMode: "class" }<\/script>',
		],
		bootstrap: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">'],
		bulma: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1/css/bulma.min.css">'],
		pico: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">'],
	};

	function buildDependencyTags(): string {
		const tags: string[] = [];
		if (framework && FRAMEWORK_PRESETS[framework]) {
			tags.push(...FRAMEWORK_PRESETS[framework]);
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
	const renderedContent = rawContent.replace(/\s*data-source(?:="[^"]*")?/g, '');

	// Bake initial theme into srcdoc so iframe starts correct on (re)creation
	const initialTheme = previewTheme?.mode;
	const htmlAttrs = initialTheme === 'dark' ? ' class="dark" data-theme="dark"'
		: initialTheme === 'light' ? ' data-theme="light"'
		: '';

	const srcdoc = `<!DOCTYPE html>
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
</html>`;

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
