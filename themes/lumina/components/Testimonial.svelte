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

<article class="testimonial">
	{#if hasRating}
		<div class="testimonial-rating" aria-label="{stars} out of 5 stars">
			{#each Array(5) as _, i}
				<span class="star" class:filled={i < stars}>&#9733;</span>
			{/each}
		</div>
	{/if}
	<div class="testimonial-content">
		{@render children()}
	</div>
</article>

<style>
	.testimonial {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.75rem 2rem;
		margin: 1.5rem 0;
		background: var(--color-surface);
	}
	.testimonial-rating {
		display: flex;
		gap: 0.125rem;
		margin-bottom: 0.75rem;
	}
	.star {
		font-size: 1.1rem;
		color: var(--color-border);
		line-height: 1;
	}
	.star.filled {
		color: #f59e0b;
	}
	.testimonial-content :global(blockquote) {
		border: none;
		padding: 0;
		margin: 0 0 1rem;
		font-size: 1.05rem;
		font-style: italic;
		line-height: 1.7;
		color: var(--color-text);
		background: none;
	}
	.testimonial-content :global(blockquote p) {
		margin: 0;
	}
	.testimonial-content :global(span[property="authorName"]) {
		font-weight: 700;
		font-style: normal;
		font-size: 0.925rem;
		color: var(--color-text);
	}
	.testimonial-content :global(span[property="authorRole"]) {
		font-size: 0.85rem;
		color: var(--color-muted);
	}
	.testimonial-content :global(img) {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
		margin-top: 0.75rem;
	}
</style>
