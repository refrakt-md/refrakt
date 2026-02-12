<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const sortable = (tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'sortable')?.attributes?.content || '').split(',').map((s: string) => s.trim()).filter(Boolean);
	const searchable = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'searchable')?.attributes?.content === 'true';
	const pageSize = parseInt(tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'pageSize')?.attributes?.content || '0', 10);
	const defaultSort = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'defaultSort')?.attributes?.content || '';

	let searchQuery = $state('');
	let sortColumn = $state(defaultSort);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(0);

	function toggleSort(column: string) {
		if (!sortable.includes(column)) return;
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
		currentPage = 0;
	}
</script>

<div class="datatable" typeof="DataTable">
	{#if searchable}
		<div class="datatable-search">
			<input
				type="search"
				placeholder="Search..."
				bind:value={searchQuery}
				class="datatable-input"
			/>
		</div>
	{/if}
	<div class="datatable-content">
		{@render children()}
	</div>
</div>

<style>
	.datatable {
		margin: 1.5rem 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.datatable-search {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.datatable-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-family: var(--font-sans);
		background: var(--color-surface);
		color: var(--color-text);
	}

	.datatable-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.datatable-content :global(table) {
		width: 100%;
		border-collapse: collapse;
	}

	.datatable-content :global(th) {
		text-align: left;
		padding: 0.75rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		background: var(--color-surface-hover);
		border-bottom: 1px solid var(--color-border);
	}

	.datatable-content :global(td) {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.875rem;
	}

	.datatable-content :global(tr:last-child td) {
		border-bottom: none;
	}

	.datatable-content :global(tr:hover td) {
		background: var(--color-surface-hover);
	}
</style>
