/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { datatableBehavior } from '../src/behaviors/datatable.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

function createDataTable(opts?: {
	searchable?: boolean;
	sortable?: string[];
	pageSize?: number;
	defaultSort?: string;
	rows?: string[][];
}): HTMLElement {
	const rows = opts?.rows ?? [
		['Alice', '30', 'Engineering'],
		['Bob', '25', 'Design'],
		['Charlie', '35', 'Engineering'],
		['Diana', '28', 'Marketing'],
		['Eve', '32', 'Design'],
	];

	const el = document.createElement('div');
	el.setAttribute('data-rune', 'datatable');
	el.className = 'rf-datatable';

	if (opts?.searchable) el.setAttribute('data-searchable', 'true');
	if (opts?.sortable) el.setAttribute('data-sortable', opts.sortable.join(','));
	if (opts?.pageSize) el.setAttribute('data-pagesize', String(opts.pageSize));
	if (opts?.defaultSort) el.setAttribute('data-defaultsort', opts.defaultSort);

	const rowsHtml = rows.map((r) =>
		`<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`,
	).join('');

	el.innerHTML = `
		<table>
			<thead><tr><th>Name</th><th>Age</th><th>Dept</th></tr></thead>
			<tbody>${rowsHtml}</tbody>
		</table>
	`;

	document.body.appendChild(el);
	return el;
}

function getVisibleRows(el: HTMLElement): HTMLTableRowElement[] {
	return Array.from(el.querySelectorAll<HTMLTableRowElement>('tbody tr'))
		.filter((r) => r.style.display !== 'none');
}

describe('datatableBehavior', () => {
	describe('search', () => {
		it('injects search toolbar when searchable', () => {
			const el = createDataTable({ searchable: true });
			datatableBehavior(el);

			expect(el.querySelector('.rf-datatable__toolbar')).not.toBeNull();
			expect(el.querySelector('.rf-datatable__input')).not.toBeNull();
		});

		it('does not inject toolbar when not searchable', () => {
			const el = createDataTable();
			datatableBehavior(el);

			expect(el.querySelector('.rf-datatable__toolbar')).toBeNull();
		});

		it('filters rows based on search input', () => {
			const el = createDataTable({ searchable: true });
			datatableBehavior(el);

			const input = el.querySelector<HTMLInputElement>('.rf-datatable__input')!;
			input.value = 'alice';
			input.dispatchEvent(new Event('input'));

			const visible = getVisibleRows(el);
			expect(visible.length).toBe(1);
			expect(visible[0].textContent).toContain('Alice');
		});

		it('shows all rows when search is cleared', () => {
			const el = createDataTable({ searchable: true });
			datatableBehavior(el);

			const input = el.querySelector<HTMLInputElement>('.rf-datatable__input')!;
			input.value = 'alice';
			input.dispatchEvent(new Event('input'));

			input.value = '';
			input.dispatchEvent(new Event('input'));

			expect(getVisibleRows(el).length).toBe(5);
		});

		it('filters case-insensitively', () => {
			const el = createDataTable({ searchable: true });
			datatableBehavior(el);

			const input = el.querySelector<HTMLInputElement>('.rf-datatable__input')!;
			input.value = 'ENGINEERING';
			input.dispatchEvent(new Event('input'));

			expect(getVisibleRows(el).length).toBe(2);
		});
	});

	describe('sorting', () => {
		it('makes sortable columns clickable', () => {
			const el = createDataTable({ sortable: ['Name'] });
			datatableBehavior(el);

			const nameHeader = el.querySelector('th');
			expect(nameHeader!.style.cursor).toBe('pointer');
		});

		it('does not make non-sortable columns clickable', () => {
			const el = createDataTable({ sortable: ['Name'] });
			datatableBehavior(el);

			const headers = el.querySelectorAll('th');
			expect(headers[1].style.cursor).toBe(''); // Age column
		});

		it('sorts rows on header click', () => {
			const el = createDataTable({ sortable: ['Name'] });
			datatableBehavior(el);

			const nameHeader = el.querySelector('th')!;
			nameHeader.click();

			const visible = getVisibleRows(el);
			expect(visible[0].textContent).toContain('Alice');
			expect(visible[4].textContent).toContain('Eve');
		});

		it('toggles sort direction on second click', () => {
			const el = createDataTable({ sortable: ['Name'] });
			datatableBehavior(el);

			const nameHeader = el.querySelector('th')!;
			nameHeader.click(); // asc
			nameHeader.click(); // desc

			const visible = getVisibleRows(el);
			expect(visible[0].textContent).toContain('Eve');
			expect(visible[4].textContent).toContain('Alice');
		});

		it('adds sort indicator', () => {
			const el = createDataTable({ sortable: ['Name'] });
			datatableBehavior(el);

			const nameHeader = el.querySelector('th')!;
			nameHeader.click();

			const indicator = nameHeader.querySelector('.rf-datatable__sort-indicator');
			expect(indicator).not.toBeNull();
			expect(indicator!.textContent).toContain('▲');
		});

		it('applies default sort on init', () => {
			const el = createDataTable({ sortable: ['Name'], defaultSort: 'Name' });
			datatableBehavior(el);

			const visible = getVisibleRows(el);
			expect(visible[0].textContent).toContain('Alice');
		});

		it('sorts numerically when appropriate', () => {
			const el = createDataTable({ sortable: ['Age'] });
			datatableBehavior(el);

			const headers = el.querySelectorAll('th');
			headers[1].click(); // Sort by Age ascending

			const visible = getVisibleRows(el);
			expect(visible[0].textContent).toContain('25');
			expect(visible[4].textContent).toContain('35');
		});
	});

	describe('pagination', () => {
		it('injects pagination controls when pageSize is set', () => {
			const el = createDataTable({ pageSize: 2 });
			datatableBehavior(el);

			expect(el.querySelector('.rf-datatable__pagination')).not.toBeNull();
		});

		it('shows only pageSize rows', () => {
			const el = createDataTable({ pageSize: 2 });
			datatableBehavior(el);

			expect(getVisibleRows(el).length).toBe(2);
		});

		it('navigates to next page', () => {
			const el = createDataTable({ pageSize: 2 });
			datatableBehavior(el);

			const nextBtn = el.querySelectorAll<HTMLButtonElement>('.rf-datatable__page-btn')[1];
			nextBtn.click();

			expect(getVisibleRows(el).length).toBe(2);
			expect(el.querySelector('.rf-datatable__page-info')!.textContent).toBe('2 / 3');
		});

		it('navigates to previous page', () => {
			const el = createDataTable({ pageSize: 2 });
			datatableBehavior(el);

			const buttons = el.querySelectorAll<HTMLButtonElement>('.rf-datatable__page-btn');
			buttons[1].click(); // Next
			buttons[0].click(); // Prev

			expect(el.querySelector('.rf-datatable__page-info')!.textContent).toBe('1 / 3');
		});

		it('disables Prev on first page', () => {
			const el = createDataTable({ pageSize: 2 });
			datatableBehavior(el);

			const prevBtn = el.querySelectorAll<HTMLButtonElement>('.rf-datatable__page-btn')[0];
			expect(prevBtn.disabled).toBe(true);
		});

		it('disables Next on last page', () => {
			const el = createDataTable({ pageSize: 2 });
			datatableBehavior(el);

			const nextBtn = el.querySelectorAll<HTMLButtonElement>('.rf-datatable__page-btn')[1];
			nextBtn.click(); // page 2
			nextBtn.click(); // page 3 (last)

			expect(nextBtn.disabled).toBe(true);
		});

		it('hides pagination when only one page', () => {
			const el = createDataTable({ pageSize: 10 });
			datatableBehavior(el);

			const pagination = el.querySelector<HTMLElement>('.rf-datatable__pagination')!;
			expect(pagination.hidden).toBe(true);
		});
	});

	describe('combined features', () => {
		it('search resets to first page', () => {
			const el = createDataTable({ searchable: true, pageSize: 2 });
			datatableBehavior(el);

			const nextBtn = el.querySelectorAll<HTMLButtonElement>('.rf-datatable__page-btn')[1];
			nextBtn.click(); // Go to page 2

			const input = el.querySelector<HTMLInputElement>('.rf-datatable__input')!;
			input.value = 'a';
			input.dispatchEvent(new Event('input'));

			expect(el.querySelector('.rf-datatable__page-info')!.textContent).toContain('1 /');
		});
	});

	describe('cleanup', () => {
		it('removes injected elements and restores rows', () => {
			const el = createDataTable({ searchable: true, sortable: ['Name'], pageSize: 2 });
			const cleanup = datatableBehavior(el);

			cleanup();

			expect(el.querySelector('.rf-datatable__toolbar')).toBeNull();
			expect(el.querySelector('.rf-datatable__pagination')).toBeNull();
			expect(el.querySelector('.rf-datatable__sort-indicator')).toBeNull();

			// All rows visible
			const rows = el.querySelectorAll('tbody tr');
			for (const row of rows) {
				expect((row as HTMLElement).style.display).toBe('');
			}
		});
	});

	it('handles element with no table', () => {
		const el = document.createElement('div');
		el.setAttribute('data-rune', 'datatable');
		document.body.appendChild(el);

		const cleanup = datatableBehavior(el);
		cleanup();
	});
});
