<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const estimatedTime = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'estimatedTime')?.attributes?.content || '';
	const difficulty = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'difficulty')?.attributes?.content || '';

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

<article class="howto" typeof="HowTo">
	{#if estimatedTime || difficulty}
		<div class="howto-meta">
			{#if estimatedTime}
				<span class="howto-meta-item">Estimated time: {formatDuration(estimatedTime)}</span>
			{/if}
			{#if difficulty}
				<span class="howto-meta-item">Difficulty: {difficulty}</span>
			{/if}
		</div>
	{/if}
	<div class="howto-content">
		{@render children()}
	</div>
</article>

<style>
	.howto {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 2rem;
		margin: 1.5rem 0;
	}

	.howto-meta {
		display: flex;
		gap: 1.5rem;
		padding-bottom: 1rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.howto-meta-item {
		font-size: 0.875rem;
		color: var(--color-muted);
		font-weight: 500;
	}

	.howto-content :global(ul) {
		background: var(--color-surface-hover);
		border-radius: var(--radius-md);
		padding: 1rem 1rem 1rem 2.5rem;
		margin-bottom: 1rem;
		list-style: disc;
	}

	.howto-content :global(ol) {
		padding-left: 1.5rem;
		counter-reset: step;
	}

	.howto-content :global(ol > li) {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
	}

	.howto-content :global(ol > li:last-child) {
		border-bottom: none;
	}
</style>
