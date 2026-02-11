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
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 2rem;
		background: var(--color-bg);
		transition: box-shadow 200ms ease, transform 200ms ease;
	}
	.pricing :global([typeof="Tier"]:hover) {
		box-shadow: var(--shadow-md);
	}
	.pricing :global([typeof="FeaturedTier"]) {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-lg);
		position: relative;
	}
	.pricing :global([typeof="FeaturedTier"]:hover) {
		box-shadow: var(--shadow-lg);
	}
	.pricing :global([typeof="Tier"] h3),
	.pricing :global([typeof="FeaturedTier"] h3) {
		margin-top: 0;
		font-size: 1.1rem;
		color: var(--color-muted);
		font-weight: 600;
	}
	.pricing :global([typeof="Tier"] strong),
	.pricing :global([typeof="FeaturedTier"] strong) {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-text);
	}
	.pricing :global([typeof="Tier"] ul),
	.pricing :global([typeof="FeaturedTier"] ul) {
		list-style: none;
		padding-left: 0;
	}
	.pricing :global([typeof="Tier"] li),
	.pricing :global([typeof="FeaturedTier"] li) {
		padding: 0.375rem 0;
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	.pricing :global([typeof="Tier"] li::before),
	.pricing :global([typeof="FeaturedTier"] li::before) {
		content: '✓';
		margin-right: 0.5rem;
		color: var(--color-success);
		font-weight: 600;
	}
</style>
