<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
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

<figure class="embed" data-provider={provider || undefined}>
	{#if embedUrl}
		<div class="embed-wrapper" style="padding-bottom: {paddingPercent}%">
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
	<div class="embed-fallback">
		{@render children()}
	</div>
</figure>

<style>
	.embed {
		margin: 1.5rem 0;
		padding: 0;
	}
	.embed-wrapper {
		position: relative;
		width: 100%;
		height: 0;
		overflow: hidden;
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.embed-wrapper iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: none;
	}
	.embed-fallback {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin-top: 0.5rem;
	}
	.embed-fallback :global(p:last-child) {
		margin-bottom: 0;
	}
	.embed-fallback:empty {
		display: none;
	}
</style>
