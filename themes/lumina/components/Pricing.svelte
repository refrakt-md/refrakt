<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = tag.attributes.typeof;
	const isTier = typeName === 'Tier' || typeName === 'FeaturedTier';
	const isFeatured = typeName === 'FeaturedTier';
</script>

{#if typeName === 'Pricing'}
	<section class="pricing">
		{@render children()}
	</section>
{:else if isTier}
	<li class="tier" class:featured={isFeatured}>
		{@render children()}
	</li>
{/if}

<style>
	.pricing {
		padding: 2rem 0;
	}
	.pricing :global(> header) {
		text-align: center;
		margin-bottom: 2rem;
	}
	.pricing :global(> header h1) {
		margin-top: 0;
	}
	.pricing :global(> ul[data-layout="grid"]) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.tier {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 2rem;
		background: var(--color-bg);
		display: flex;
		flex-direction: column;
		transition: box-shadow 200ms ease;
	}
	.tier:hover {
		box-shadow: var(--shadow-md);
	}
	.tier.featured {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-lg);
	}
	.tier :global(h1[property="name"]) {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-muted);
	}
	.tier :global(p[property="price"]) {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-text);
		margin-bottom: 1.5rem;
		line-height: 1.1;
	}
	.tier :global(div[data-name="body"]) {
		flex: 1;
	}
	.tier :global(div[data-name="body"] ul) {
		list-style: none;
		padding-left: 0;
		margin: 0 0 1.5rem;
	}
	.tier :global(div[data-name="body"] li) {
		padding: 0.375rem 0;
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	.tier :global(div[data-name="body"] li::before) {
		content: '✓';
		margin-right: 0.5rem;
		color: var(--color-success);
		font-weight: 600;
	}
	.tier :global(div[data-name="body"] a) {
		display: block;
		text-align: center;
		padding: 0.625rem 1.5rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		transition: background-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
		margin-top: auto;
	}
	.tier:not(.featured) :global(a) {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.tier:not(.featured) :global(a:hover) {
		background: var(--color-surface-hover);
		text-decoration: none;
	}
	.tier.featured :global(a) {
		background: var(--color-primary);
		color: white;
	}
	.tier.featured :global(a:hover) {
		background: var(--color-primary-hover);
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
		text-decoration: none;
	}
	.tier :global(div[data-name="body"] p:has(a)) {
		margin-bottom: 0;
	}
</style>
