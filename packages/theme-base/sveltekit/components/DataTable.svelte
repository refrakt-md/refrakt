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

		const thEls = table.querySelectorAll('th');
		headers = Array.from(thEls).map(th => th.textContent?.trim() || '');

		thEls.forEach((th) => {
			const name = th.textContent?.trim() || '';
			if (sortable.includes(name)) {
				th.style.cursor = 'pointer';
				th.style.userSelect = 'none';
				th.addEventListener('click', () => toggleSort(name));
			}
		});

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

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter(r => r.cells.some(c => c.toLowerCase().includes(q)));
		}

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

		const visible = pageSize > 0
			? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
			: filtered;

		const tbody = contentEl?.querySelector('tbody') || contentEl?.querySelector('table');
		if (!tbody) return;

		allRows.forEach(r => r.el.style.display = 'none');
		visible.forEach(r => {
			r.el.style.display = '';
			tbody.appendChild(r.el);
		});

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

<div class="rf-datatable" typeof="DataTable">
	{#if searchable}
		<div class="rf-datatable__toolbar">
			<input
				type="search"
				placeholder="Filter rows..."
				bind:value={searchQuery}
				class="rf-datatable__input"
			/>
		</div>
	{/if}
	<div class="rf-datatable__content" bind:this={contentEl}>
		{@render children()}
	</div>
	{#if pageSize > 0 && totalPages > 1}
		<div class="rf-datatable__pagination">
			<button
				class="rf-datatable__page-btn"
				disabled={currentPage === 0}
				onclick={() => currentPage--}
			>
				&larr; Prev
			</button>
			<span class="rf-datatable__page-info">
				{currentPage + 1} / {totalPages}
			</span>
			<button
				class="rf-datatable__page-btn"
				disabled={currentPage >= totalPages - 1}
				onclick={() => currentPage++}
			>
				Next &rarr;
			</button>
		</div>
	{/if}
</div>
