<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<nav class="toc" aria-label="Table of contents">
	<div class="toc-title">On this page</div>
	{@render children()}
</nav>

<style>
	.toc {
		padding: 1.25rem 1.5rem;
		border-left: 3px solid var(--color-primary);
		background: var(--color-surface);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		margin: 1.5rem 0;
	}
	.toc-title {
		font-weight: 650;
		margin-bottom: 0.75rem;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-muted);
	}
	.toc :global(ul),
	.toc :global(ol) {
		list-style: none;
		padding-left: 0;
		margin: 0;
	}
	.toc :global(li) {
		margin: 0.125rem 0;
	}
	.toc :global(li[data-level="3"]) {
		padding-left: 1rem;
	}
	.toc :global(li[data-level="4"]) {
		padding-left: 2rem;
	}
	.toc :global(a) {
		color: var(--color-text);
		text-decoration: none;
		font-size: 0.85rem;
		display: inline-block;
		padding: 0.2rem 0;
		transition: color 150ms ease;
	}
	.toc :global(a:hover) {
		color: var(--color-primary);
		text-decoration: none;
	}
</style>
