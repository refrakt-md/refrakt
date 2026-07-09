import type { CleanupFn } from '../types.js';

interface RowData {
	el: HTMLTableRowElement;
	/** Visible cell text — drives search/filter and the string-collation sort. */
	cells: string[];
	/** Per-cell `data-value` (or null when absent) — the typed sort key
	 *  (SPEC-103). Set by the `data` rune's numeric typing and by hand-authored
	 *  tables that want a formatted column to sort by a clean number. */
	dataValues: (string | null)[];
}

/**
 * DataTable behavior for `[data-rune="data-table"]`.
 *
 * Enhances a rendered `<table>` element with:
 * - Search/filter: input that filters rows by cell text
 * - Column sorting: clickable headers with sort indicators
 * - Pagination: page navigation with prev/next buttons
 *
 * Reads configuration from data attributes set by the identity transform:
 * - `data-searchable`: "true" to enable search
 * - `data-sortable`: comma-separated column names
 * - `data-page-size`: number of rows per page (0 = no pagination)
 * - `data-default-sort`: column name to sort by initially
 */
export function datatableBehavior(el: HTMLElement): CleanupFn {
	const table = el.querySelector('table');
	if (!table) return () => {};

	// The transform wraps the table in a scroll container; fall back to the
	// table itself for backwards compat with older renders.
	const anchor: Element = table.closest('.rf-datatable__scroll') ?? table;

	// Read configuration from data attributes
	const searchable = el.getAttribute('data-searchable') === 'true';
	const sortableStr = el.getAttribute('data-sortable') || '';
	const sortable = sortableStr.split(',').map((s) => s.trim()).filter(Boolean);
	const pageSize = parseInt(el.getAttribute('data-page-size') || '0', 10);
	const defaultSort = el.getAttribute('data-default-sort') || '';

	// Parse table structure
	const thEls = Array.from(table.querySelectorAll('th'));
	const headers = thEls.map((th) => th.textContent?.trim() || '');

	const bodyRows = table.querySelectorAll('tbody tr');
	const rows: RowData[] = Array.from(
		bodyRows.length > 0 ? bodyRows : table.querySelectorAll('tr:not(:first-child)'),
	).map((tr) => {
		const tds = Array.from(tr.querySelectorAll('td'));
		return {
			el: tr as HTMLTableRowElement,
			cells: tds.map((td) => td.textContent?.trim() || ''),
			dataValues: tds.map((td) => td.getAttribute('data-value')),
		};
	});

	// Save original row order for cleanup
	const originalOrder = rows.map((r) => r.el);

	// State
	let searchQuery = '';
	let sortColumn = defaultSort;
	let sortDirection: 'asc' | 'desc' = 'asc';
	let currentPage = 0;

	const cleanups: Array<() => void> = [];

	// Inject search toolbar
	let toolbar: HTMLDivElement | null = null;
	let searchInput: HTMLInputElement | null = null;
	if (searchable) {
		toolbar = document.createElement('div');
		toolbar.className = 'rf-datatable__toolbar';

		searchInput = document.createElement('input');
		searchInput.type = 'search';
		searchInput.placeholder = 'Filter rows...';
		searchInput.className = 'rf-datatable__input';
		toolbar.appendChild(searchInput);

		anchor.before(toolbar);

		const onInput = () => {
			searchQuery = searchInput!.value;
			currentPage = 0;
			render();
		};
		searchInput.addEventListener('input', onInput);
		cleanups.push(() => searchInput!.removeEventListener('input', onInput));
	}

	// Make sortable headers clickable
	for (const th of thEls) {
		const name = th.textContent?.trim() || '';
		if (!sortable.includes(name)) continue;

		th.style.cursor = 'pointer';
		th.style.userSelect = 'none';

		const onClick = () => {
			if (sortColumn === name) {
				sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				sortColumn = name;
				sortDirection = 'asc';
			}
			currentPage = 0;
			render();
		};

		th.addEventListener('click', onClick);
		cleanups.push(() => {
			th.removeEventListener('click', onClick);
			th.style.cursor = '';
			th.style.userSelect = '';
		});
	}

	// Inject pagination controls
	let pagination: HTMLDivElement | null = null;
	let prevBtn: HTMLButtonElement | null = null;
	let nextBtn: HTMLButtonElement | null = null;
	let pageInfo: HTMLSpanElement | null = null;

	if (pageSize > 0) {
		pagination = document.createElement('div');
		pagination.className = 'rf-datatable__pagination';

		prevBtn = document.createElement('button');
		prevBtn.className = 'rf-datatable__page-btn';
		prevBtn.innerHTML = '&larr; Prev';

		pageInfo = document.createElement('span');
		pageInfo.className = 'rf-datatable__page-info';

		nextBtn = document.createElement('button');
		nextBtn.className = 'rf-datatable__page-btn';
		nextBtn.innerHTML = 'Next &rarr;';

		pagination.appendChild(prevBtn);
		pagination.appendChild(pageInfo);
		pagination.appendChild(nextBtn);

		anchor.after(pagination);

		const onPrev = () => {
			if (currentPage > 0) {
				currentPage--;
				render();
			}
		};
		const onNext = () => {
			currentPage++;
			render();
		};

		prevBtn.addEventListener('click', onPrev);
		nextBtn.addEventListener('click', onNext);
		cleanups.push(() => {
			prevBtn!.removeEventListener('click', onPrev);
			nextBtn!.removeEventListener('click', onNext);
		});
	}

	function render() {
		let filtered = [...rows];

		// Filter
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter((r) =>
				r.cells.some((c) => c.toLowerCase().includes(q)),
			);
		}

		// Sort. Prefer a cell's `data-value` when present and numeric (mirrors
		// `chart`'s `dataset.value ?? textContent`), so human-formatted numbers
		// (currency, thousands separators, units) sort by their real value. With
		// no usable `data-value` the comparator falls back to the exact
		// natural-string collation used before — so plain tables are unchanged.
		if (sortColumn) {
			const idx = headers.indexOf(sortColumn);
			if (idx >= 0) {
				filtered.sort((a, b) => {
					const av = a.dataValues[idx];
					const bv = b.dataValues[idx];
					const an = av !== null ? Number(av) : NaN;
					const bn = bv !== null ? Number(bv) : NaN;
					const cmp = (av !== null && bv !== null && !Number.isNaN(an) && !Number.isNaN(bn))
						? an - bn
						: a.cells[idx].localeCompare(b.cells[idx], undefined, { numeric: true });
					return sortDirection === 'asc' ? cmp : -cmp;
				});
			}
		}

		const totalFiltered = filtered.length;
		const totalPages = pageSize > 0 ? Math.ceil(totalFiltered / pageSize) : 1;

		// Clamp current page
		if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

		// Determine visible rows
		const visible = pageSize > 0
			? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
			: filtered;

		const tbody = table!.querySelector('tbody') || table!;

		// Hide all, then show and reorder visible
		for (const r of rows) r.el.style.display = 'none';
		for (const r of visible) {
			r.el.style.display = '';
			tbody.appendChild(r.el);
		}

		// Update sort indicators on headers
		for (const th of thEls) {
			const name = th.textContent?.replace(/[▲▼]/g, '').trim() || '';
			const indicator = th.querySelector('.rf-datatable__sort-indicator');
			if (sortable.includes(name)) {
				if (sortColumn === name) {
					if (indicator) {
						indicator.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
					} else {
						const span = document.createElement('span');
						span.className = 'rf-datatable__sort-indicator';
						span.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
						th.appendChild(span);
					}
				} else {
					indicator?.remove();
				}
			}
		}

		// Update pagination
		if (pagination && prevBtn && nextBtn && pageInfo) {
			prevBtn.disabled = currentPage === 0;
			nextBtn.disabled = currentPage >= totalPages - 1;
			pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;

			if (totalPages <= 1) {
				pagination.hidden = true;
			} else {
				pagination.hidden = false;
			}
		}
	}

	// Initial render
	render();

	return () => {
		cleanups.forEach((fn) => fn());

		// Remove injected elements
		toolbar?.remove();
		pagination?.remove();

		// Remove sort indicators
		for (const th of thEls) {
			th.querySelector('.rf-datatable__sort-indicator')?.remove();
		}

		// Restore original row order and visibility
		const tbody = table!.querySelector('tbody') || table!;
		for (const row of originalOrder) {
			row.style.display = '';
			tbody.appendChild(row);
		}
	};
}
