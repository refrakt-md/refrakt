<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const getMeta = (prop: string) => tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
		?.attributes?.content;

	const embedUrl = getMeta('embedUrl') || getMeta('url') || '';
	const title = getMeta('title') || 'Embedded content';
	const aspect = getMeta('aspect') || '16:9';
	const provider = getMeta('provider') || '';

	const [w, h] = aspect.split(':').map(Number);
	const paddingPercent = h && w ? (h / w) * 100 : 56.25;
</script>

<figure class="rf-embed" data-provider={provider || undefined}>
	{#if embedUrl}
		<div class="rf-embed__wrapper" style="padding-bottom: {paddingPercent}%">
			<iframe
				src={embedUrl}
				{title}
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
				loading="lazy"
			></iframe>
		</div>
	{/if}
	<div class="rf-embed__fallback">
		{@render children()}
	</div>
</figure>
