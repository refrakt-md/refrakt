<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const prepTime = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'prepTime')?.attributes?.content || '';
	const cookTime = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'cookTime')?.attributes?.content || '';
	const servings = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'servings')?.attributes?.content || '';
	const difficulty = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'difficulty')?.attributes?.content || 'medium';

	const difficultyColors: Record<string, { color: string; bg: string }> = {
		easy: { color: 'var(--rf-color-success)', bg: 'var(--rf-color-success-bg)' },
		medium: { color: 'var(--rf-color-warning)', bg: 'var(--rf-color-warning-bg)' },
		hard: { color: 'var(--rf-color-danger)', bg: 'var(--rf-color-danger-bg)' },
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

<article class="rf-recipe" typeof="Recipe">
	<div class="rf-recipe__meta">
		{#if prepTime}
			<span class="rf-recipe__meta-item">Prep: {formatDuration(prepTime)}</span>
		{/if}
		{#if cookTime}
			<span class="rf-recipe__meta-item">Cook: {formatDuration(cookTime)}</span>
		{/if}
		{#if servings}
			<span class="rf-recipe__meta-item">Serves: {servings}</span>
		{/if}
		{#if difficulty}
			<span class="rf-recipe__badge" style="color: {dc.color}; background: {dc.bg};">
				{difficulty}
			</span>
		{/if}
	</div>
	<div class="rf-recipe__content">
		{@render children()}
	</div>
</article>
