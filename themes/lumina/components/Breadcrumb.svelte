<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const separator = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'separator')
		?.attributes?.content ?? '/');
</script>

<nav class="breadcrumb" aria-label="Breadcrumb" style="--separator: '{separator}'">
	{@render children()}
</nav>

<style>
	.breadcrumb {
		font-size: 0.85rem;
		margin: 0 0 1.5rem;
	}
	.breadcrumb :global(ol) {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.25rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.breadcrumb :global(li) {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0;
		margin: 0;
	}
	.breadcrumb :global(li + li::before) {
		content: var(--separator);
		color: var(--color-muted);
		opacity: 0.5;
		margin-right: 0.125rem;
	}
	.breadcrumb :global(a) {
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}
	.breadcrumb :global(a:hover) {
		color: var(--color-primary);
		text-decoration: none;
	}
	.breadcrumb :global(li:last-child span) {
		color: var(--color-text);
		font-weight: 500;
	}
</style>
