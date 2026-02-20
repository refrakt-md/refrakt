<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const rating = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'rating')
		?.attributes?.content);

	const hasRating = $derived(rating !== undefined && rating !== null);
	const stars = $derived(hasRating ? Math.min(5, Math.max(0, Number(rating))) : 0);
</script>

<article class="rf-testimonial">
	{#if hasRating}
		<div class="rf-testimonial__rating" aria-label="{stars} out of 5 stars">
			{#each Array(5) as _, i}
				<span class="rf-testimonial__star {i < stars ? 'rf-testimonial__star--filled' : ''}">&#9733;</span>
			{/each}
		</div>
	{/if}
	<div class="rf-testimonial__content">
		{@render children()}
	</div>
</article>
