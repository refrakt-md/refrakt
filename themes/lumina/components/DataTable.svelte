<script lang="ts">
	import { onMount } from 'svelte';
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

	let contentEl: HTMLDivElement;
	let headers: string[] = [];
	let allRows: { el: HTMLTableRowElement; cells: string[] }[] = [];
	let totalFiltered = $state(0);

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

	onMount(() => {
		const table = contentEl?.querySelector('table');
		if (!table) return;

		// Extract headers
		const thEls = table.querySelectorAll('th');
		headers = Array.from(thEls).map(th => th.textContent?.trim() || '');

		// Make sortable headers clickable
		thEls.forEach((th) => {
			const name = th.textContent?.trim() || '';
			if (sortable.includes(name)) {
				th.style.cursor = 'pointer';
				th.style.userSelect = 'none';
				th.addEventListener('click', () => toggleSort(name));
			}
		});

		// Extract body rows
		const bodyRows = table.querySelectorAll('tbody tr');
		const rows = bodyRows.length > 0 ? bodyRows : table.querySelectorAll('tr:not(:first-child)');
		allRows = Array.from(rows).map(tr => ({
			el: tr as HTMLTableRowElement,
			cells: Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || ''),
		}));

		totalFiltered = allRows.length;
	});

	$effect(() => {
		if (!allRows.length) return;

		let filtered = [...allRows];

		// Filter
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter(r => r.cells.some(c => c.toLowerCase().includes(q)));
		}

		// Sort
		if (sortColumn) {
			const idx = headers.indexOf(sortColumn);
			if (idx >= 0) {
				filtered.sort((a, b) => {
					const cmp = a.cells[idx].localeCompare(b.cells[idx], undefined, { numeric: true });
					return sortDirection === 'asc' ? cmp : -cmp;
				});
			}
		}

		totalFiltered = filtered.length;

		// Paginate
		const visible = pageSize > 0
			? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
			: filtered;

		// Update DOM
		const tbody = contentEl?.querySelector('tbody') || contentEl?.querySelector('table');
		if (!tbody) return;

		allRows.forEach(r => r.el.style.display = 'none');
		visible.forEach(r => {
			r.el.style.display = '';
			tbody.appendChild(r.el);
		});

		// Update sort indicators on headers
		const thEls = contentEl?.querySelectorAll('th');
		thEls?.forEach(th => {
			const name = th.textContent?.replace(/[▲▼]/g, '').trim() || '';
			const indicator = th.querySelector('.sort-indicator');
			if (sortable.includes(name)) {
				if (sortColumn === name) {
					if (indicator) {
						indicator.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
					} else {
						const span = document.createElement('span');
						span.className = 'sort-indicator';
						span.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
						th.appendChild(span);
					}
				} else {
					if (indicator) indicator.remove();
				}
			}
		});
	});

	const totalPages = $derived(pageSize > 0 ? Math.ceil(totalFiltered / pageSize) : 1);
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
	<div class="datatable-content" bind:this={contentEl}>
		{@render children()}
	</div>
	{#if pageSize > 0 && totalPages > 1}
		<div class="datatable-pagination">
			<button
				class="datatable-page-btn"
				disabled={currentPage === 0}
				onclick={() => currentPage--}
			>
				Previous
			</button>
			<span class="datatable-page-info">
				Page {currentPage + 1} of {totalPages}
			</span>
			<button
				class="datatable-page-btn"
				disabled={currentPage >= totalPages - 1}
				onclick={() => currentPage++}
			>
				Next
			</button>
		</div>
	{/if}
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

	.datatable-content :global(th[style*="cursor"]:hover) {
		color: var(--color-text);
	}

	.datatable-content :global(.sort-indicator) {
		font-size: 0.65rem;
		opacity: 0.7;
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

	.datatable-pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-hover);
	}

	.datatable-page-btn {
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.8rem;
		font-family: var(--font-sans);
		cursor: pointer;
		transition: background 150ms ease;
	}

	.datatable-page-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.datatable-page-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.datatable-page-info {
		font-size: 0.8rem;
		color: var(--color-muted);
	}
</style>
