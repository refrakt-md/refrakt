<script lang="ts">
	import type { SerializedTag } from '$lib/renderer/Renderer.svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="cta">
	{@render children()}
</section>

<style>
	.cta {
		text-align: center;
		padding: 4rem 2rem;
	}
	.cta :global(h1),
	.cta :global(h2),
	.cta :global(h3) {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}
	.cta :global(p) {
		font-size: 1.25rem;
		opacity: 0.8;
		max-width: 600px;
		margin: 0 auto 2rem;
	}
	.cta :global(nav) {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}
	.cta :global(a) {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}
</style>
