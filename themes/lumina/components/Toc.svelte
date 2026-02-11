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
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		margin: 1.5rem 0;
	}
	.toc-title {
		font-weight: 600;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
	}
	.toc :global(ul),
	.toc :global(ol) {
		list-style: none;
		padding-left: 0;
		margin: 0;
	}
	.toc :global(li) {
		margin: 0.25rem 0;
	}
	.toc :global(li[data-level="3"]) {
		padding-left: 1rem;
	}
	.toc :global(li[data-level="4"]) {
		padding-left: 2rem;
	}
	.toc :global(a) {
		color: #4b5563;
		text-decoration: none;
		font-size: 0.875rem;
	}
	.toc :global(a:hover) {
		color: #3b82f6;
	}
</style>
