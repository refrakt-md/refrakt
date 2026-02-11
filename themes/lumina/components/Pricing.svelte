<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="pricing">
	{@render children()}
</section>

<style>
	.pricing {
		padding: 3rem 0;
	}
	.pricing :global([typeof="Tier"]) {
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}
	.pricing :global([typeof="FeaturedTier"]) {
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}
</style>
