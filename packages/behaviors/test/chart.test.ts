/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { RfChart } from '../src/elements/chart.js';

beforeEach(() => {
	document.body.innerHTML = '';
	if (!customElements.get('rf-chart')) customElements.define('rf-chart', RfChart);
});

const table = (rows: string, head = '<tr><th>Month</th><th>Revenue</th></tr>', caption = '') =>
	`<table data-name="data">${caption ? `<caption>${caption}</caption>` : ''}<thead>${head}</thead><tbody>${rows}</tbody></table>`;

describe('rf-chart element', () => {
	it('renders an svg from the table and visually-hides the table (kept for SR)', () => {
		document.body.innerHTML =
			`<rf-chart data-type="bar">${table('<tr><td>Jan</td><td>100</td></tr><tr><td>Feb</td><td>200</td></tr>', undefined, 'Revenue')}</rf-chart>`;
		const el = document.querySelector('rf-chart')!;

		expect(el.querySelector('.rf-chart__rendered svg')).toBeTruthy();
		expect(el.hasAttribute('data-rendered')).toBe(true);
		// The data table stays in the DOM (CSS visually-hides it once rendered).
		expect(el.querySelector('table')).toBeTruthy();
		// bar: 2 rows × 1 series = 2 rects
		expect(el.querySelectorAll('rect').length).toBe(2);
		// title comes from the caption
		expect(el.querySelector('.rf-chart__title')?.textContent).toBe('Revenue');
	});

	it('reads data-value over textContent for formatted cells', () => {
		document.body.innerHTML =
			`<rf-chart data-type="bar">${table('<tr><td>Jan</td><td data-value="1200">1,200</td></tr>')}</rf-chart>`;
		const el = document.querySelector('rf-chart')!;
		const rect = el.querySelector('rect')!;
		// 1200 is the only/max value → full-height bar (ch = 230).
		expect(Number(rect.getAttribute('height'))).toBeCloseTo(230, 0);
	});

	it('draws a legend and polylines for a multi-series line chart', () => {
		document.body.innerHTML =
			`<rf-chart data-type="line">${table(
				'<tr><td>Q1</td><td>10</td><td>5</td></tr><tr><td>Q2</td><td>20</td><td>8</td></tr>',
				'<tr><th>Quarter</th><th>Sales</th><th>Profit</th></tr>',
			)}</rf-chart>`;
		const el = document.querySelector('rf-chart')!;
		expect(el.querySelectorAll('polyline').length).toBe(2);
		expect(el.querySelectorAll('.rf-chart__legend-item').length).toBe(2);
	});

	it('is idempotent — re-connecting does not stack a second svg/title/legend', () => {
		document.body.innerHTML =
			`<rf-chart data-type="line">${table(
				'<tr><td>Q1</td><td>10</td><td>5</td></tr>',
				'<tr><th>Quarter</th><th>Sales</th><th>Profit</th></tr>',
				'Growth',
			)}</rf-chart>`;
		const el = document.querySelector('rf-chart') as HTMLElement & { connectedCallback(): void };

		// Simulate a second connection (e.g. hydration / reparenting).
		el.connectedCallback();

		expect(el.querySelectorAll('.rf-chart__rendered').length).toBe(1);
		expect(el.querySelectorAll('svg').length).toBe(1);
		expect(el.querySelectorAll('.rf-chart__title').length).toBe(1);
		expect(el.querySelectorAll('.rf-chart__legend').length).toBe(1);
	});

	it('does nothing when there is no data', () => {
		document.body.innerHTML = `<rf-chart data-type="bar">${table('')}</rf-chart>`;
		const el = document.querySelector('rf-chart')!;
		expect(el.querySelector('svg')).toBeNull();
		expect(el.hasAttribute('data-rendered')).toBe(false);
	});
});
