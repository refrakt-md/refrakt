<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = tag.attributes.typeof;
	const isTier = typeName === 'Tier' || typeName === 'FeaturedTier';
	const isFeatured = typeName === 'FeaturedTier';
</script>

{#if typeName === 'Pricing'}
	<section class="rf-pricing">
		{@render children()}
	</section>
{:else if isTier}
	<li class="rf-tier {isFeatured ? 'rf-tier--featured' : ''}">
		{@render children()}
	</li>
{/if}
