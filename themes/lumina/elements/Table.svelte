<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<div class="table-wrapper">
	<table {...tag.attributes}>
		{@render children()}
	</table>
</div>

<style>
	.table-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: 1.5rem 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.table-wrapper :global(table) {
		margin: 0;
		border-collapse: collapse;
		width: 100%;
		min-width: 100%;
	}
	.table-wrapper :global(th) {
		background: var(--color-surface);
	}
	.table-wrapper :global(th:first-child) {
		border-top-left-radius: var(--radius-md);
	}
	.table-wrapper :global(th:last-child) {
		border-top-right-radius: var(--radius-md);
	}
	.table-wrapper :global(tr:last-child td) {
		border-bottom: none;
	}
</style>
