<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const size = tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'size')
		?.attributes?.content ?? '';

	const align = tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'align')
		?.attributes?.content ?? '';
</script>

<figure class="figure {size ? `figure-${size}` : ''} {align ? `figure-${align}` : ''}">
	{@render children()}
</figure>

<style>
	.figure {
		margin: 1.5rem 0;
	}
	.figure :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
	}
	.figure :global(figcaption) {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
		text-align: center;
	}
	.figure-small { max-width: 320px; }
	.figure-medium { max-width: 640px; }
	.figure-large { max-width: 960px; }
	.figure-full { max-width: 100%; }
	.figure-left { margin-right: auto; }
	.figure-center { margin-left: auto; margin-right: auto; }
	.figure-right { margin-left: auto; }
</style>
