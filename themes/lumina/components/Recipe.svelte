<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const prepTime = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'prepTime')?.attributes?.content || '';
	const cookTime = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'cookTime')?.attributes?.content || '';
	const servings = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'servings')?.attributes?.content || '';
	const difficulty = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'difficulty')?.attributes?.content || 'medium';

	const difficultyColors: Record<string, { color: string; bg: string }> = {
		easy: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
		medium: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
		hard: { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
	};

	const dc = difficultyColors[difficulty] || difficultyColors.medium;

	function formatDuration(iso: string): string {
		if (!iso) return '';
		const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) return iso;
		const parts: string[] = [];
		if (match[1]) parts.push(`${match[1]}h`);
		if (match[2]) parts.push(`${match[2]}m`);
		if (match[3]) parts.push(`${match[3]}s`);
		return parts.join(' ') || iso;
	}
</script>

<article class="recipe" typeof="Recipe">
	<div class="recipe-meta">
		{#if prepTime}
			<span class="recipe-meta-item">Prep: {formatDuration(prepTime)}</span>
		{/if}
		{#if cookTime}
			<span class="recipe-meta-item">Cook: {formatDuration(cookTime)}</span>
		{/if}
		{#if servings}
			<span class="recipe-meta-item">Serves: {servings}</span>
		{/if}
		{#if difficulty}
			<span class="recipe-badge" style="color: {dc.color}; background: {dc.bg};">
				{difficulty}
			</span>
		{/if}
	</div>
	<div class="recipe-content">
		{@render children()}
	</div>
</article>

<style>
	.recipe {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 2rem;
		margin: 1.5rem 0;
	}

	.recipe-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		padding-bottom: 1rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.recipe-meta-item {
		font-size: 0.875rem;
		color: var(--color-muted);
		font-weight: 500;
	}

	.recipe-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
		text-transform: capitalize;
	}

	.recipe-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.recipe-content :global(ul) {
		list-style: disc;
		padding-left: 1.5rem;
	}

	.recipe-content :global(ol) {
		padding-left: 1.5rem;
	}

	.recipe-content :global(ol li) {
		padding: 0.25rem 0;
	}

	.recipe-content :global(blockquote) {
		border-left: 3px solid var(--color-info-border);
		background: var(--color-info-bg);
		padding: 0.75rem 1rem;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		font-style: italic;
		color: var(--color-info);
	}
</style>
