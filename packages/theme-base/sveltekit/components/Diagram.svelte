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
			container.style.fontFamily = 'var(--rf-font-mono)';
			container.style.whiteSpace = 'pre';
			rendered = true;
		}
	});
</script>

<figure class="rf-diagram" typeof="Diagram">
	{#if title}
		<figcaption class="rf-diagram__title">{title}</figcaption>
	{/if}
	<div class="rf-diagram__container" bind:this={container}>
		{#if !rendered}
			<pre class="rf-diagram__source"><code>{source}</code></pre>
		{/if}
	</div>
</figure>
