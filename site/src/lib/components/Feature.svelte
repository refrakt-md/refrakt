<script lang="ts">
	import type { SerializedTag } from '$lib/renderer/Renderer.svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="feature">
	{@render children()}
</section>

<style>
	.feature {
		padding: 3rem 0;
	}
	.feature :global(dl) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
	}
	.feature :global(dt) {
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}
	.feature :global(dd) {
		margin: 0;
		opacity: 0.8;
	}
</style>
