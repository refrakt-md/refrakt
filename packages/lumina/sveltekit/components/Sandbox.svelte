<script lang="ts">
	import { onMount } from 'svelte';
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

	const FRAMEWORK_PRESETS: Record<string, string[]> = {
		tailwind: ['<script src="https://cdn.tailwindcss.com"><\/script>'],
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

	const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${buildDependencyTags()}
<style>
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; color-scheme: light dark; }
</style>
</head>
<body>
${renderedContent}
<script>
  const ro = new ResizeObserver(() => {
    parent.postMessage({ type: 'rf-sandbox-resize', height: document.body.scrollHeight }, '*');
  });
  ro.observe(document.body);
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
