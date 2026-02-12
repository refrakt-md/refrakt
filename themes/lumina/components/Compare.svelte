<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const layout = tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'layout')
		?.attributes?.content ?? 'side-by-side';
</script>

<div class="compare compare-{layout}">
	{@render children()}
</div>

<style>
	.compare {
		margin: 1.5rem 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.compare-side-by-side :global([data-panels]) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	}
	.compare-stacked :global([data-panels]) {
		display: flex;
		flex-direction: column;
	}
	.compare :global([data-panel]) {
		min-width: 0;
		overflow: auto;
	}
	.compare-side-by-side :global([data-panel] + [data-panel]) {
		border-left: 1px solid var(--color-border);
	}
	.compare-stacked :global([data-panel] + [data-panel]) {
		border-top: 1px solid var(--color-border);
	}
	.compare :global([data-label]) {
		display: block;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.compare :global(pre) {
		margin: 0;
		border: none;
		border-radius: 0;
	}
</style>
