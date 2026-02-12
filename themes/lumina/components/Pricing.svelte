<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = tag.attributes.typeof;
	const isTier = typeName === 'Tier' || typeName === 'FeaturedTier';
	const isFeatured = typeName === 'FeaturedTier';

	// For tiers: extract name and price from property children
	const tierName = isTier
		? tag.children.find((c: any) => c?.attributes?.property === 'name')?.children?.[0] ?? ''
		: '';
	const tierPrice = isTier
		? tag.children.find((c: any) => c?.attributes?.property === 'price')?.children?.[0] ?? ''
		: '';
</script>

{#if typeName === 'Pricing'}
	<section class="pricing">
		{@render children()}
	</section>
{:else if isTier}
	<div class="tier" class:featured={isFeatured}>
		<h3 class="tier-name">{tierName}</h3>
		<div class="tier-price">{tierPrice}</div>
		<div class="tier-body">
			{@render children()}
		</div>
	</div>
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
	.tier-name {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-muted);
	}
	.tier-price {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-text);
		margin-bottom: 1.5rem;
		line-height: 1.1;
	}
	.tier-body {
		flex: 1;
	}
	.tier-body :global(ul) {
		list-style: none;
		padding-left: 0;
		margin: 0 0 1.5rem;
	}
	.tier-body :global(li) {
		padding: 0.375rem 0;
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	.tier-body :global(li::before) {
		content: '✓';
		margin-right: 0.5rem;
		color: var(--color-success);
		font-weight: 600;
	}
	.tier-body :global(a) {
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
	.tier-body :global(p:has(a)) {
		margin-bottom: 0;
	}
</style>
