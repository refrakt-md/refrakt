<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const language = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'language')?.attributes?.content || 'mermaid';
	const title = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'title')?.attributes?.content || '';
	const source = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.['data-name'] === 'source')?.attributes?.content || '';

	let container: HTMLDivElement;
	let rendered = $state(false);

	onMount(async () => {
		if (language === 'mermaid' && source) {
			try {
				// Use CDN import to avoid bundling mermaid (~2MB)
				const cdn = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
				const mermaid = (await import(/* @vite-ignore */ cdn)).default;
				mermaid.initialize({ startOnLoad: false, theme: 'default' });
				const { svg } = await mermaid.render('mermaid-' + Math.random().toString(36).slice(2), source);
				container.innerHTML = svg;
				rendered = true;
			} catch (e) {
				container.textContent = source;
			}
		} else if (language === 'ascii' && source) {
			container.textContent = source;
			container.style.fontFamily = 'var(--font-mono)';
			container.style.whiteSpace = 'pre';
			rendered = true;
		}
	});
</script>

<figure class="diagram" typeof="Diagram">
	{#if title}
		<figcaption class="diagram-title">{title}</figcaption>
	{/if}
	<div class="diagram-container" bind:this={container}>
		{#if !rendered}
			<pre class="diagram-source"><code>{source}</code></pre>
		{/if}
	</div>
</figure>

<style>
	.diagram {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin: 1.5rem 0;
		text-align: center;
	}

	.diagram-title {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.diagram-container {
		display: flex;
		justify-content: center;
		overflow-x: auto;
	}

	.diagram-container :global(svg) {
		max-width: 100%;
		height: auto;
	}

	.diagram-source {
		text-align: left;
		font-size: 0.875rem;
		margin: 0;
	}
</style>
