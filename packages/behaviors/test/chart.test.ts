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

/** Mount a chart with optional inline `--rf-chart-*` overrides set *before*
 *  connection, so `readGeometry`'s getComputedStyle picks them up. */
function mount(opts: { type?: string; head?: string; rows: string; caption?: string; props?: Record<string, string> }): HTMLElement {
	const el = document.createElement('rf-chart');
	el.setAttribute('data-type', opts.type ?? 'bar');
	for (const [k, v] of Object.entries(opts.props ?? {})) el.style.setProperty(k, v);
	el.innerHTML = table(opts.rows, opts.head, opts.caption);
	document.body.appendChild(el);
	return el;
}

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

describe('rf-chart theming contract (WORK-353)', () => {
	it('tags bars with a class + data-series and sets no inline fill/style (CSS paints them)', () => {
		const el = mount({ rows: '<tr><td>Jan</td><td>100</td></tr>' });
		const rect = el.querySelector('rect')!;
		expect(rect.getAttribute('class')).toBe('rf-chart__bar');
		expect(rect.getAttribute('data-series')).toBe('0');
		expect(rect.getAttribute('fill')).toBeNull();
		expect(rect.getAttribute('style')).toBeNull();
	});

	it('rotates data-series across series on bars and legend swatches', () => {
		const el = mount({ head: '<tr><th>Q</th><th>A</th><th>B</th></tr>', rows: '<tr><td>Q1</td><td>5</td><td>9</td></tr>' });
		expect([...el.querySelectorAll('rect')].map((r) => r.getAttribute('data-series'))).toEqual(['0', '1']);
		const swatches = [...el.querySelectorAll('.rf-chart__legend-color')];
		expect(swatches.map((s) => (s as HTMLElement).dataset.series)).toEqual(['0', '1']);
		expect(swatches[0].getAttribute('style')).toBeNull(); // no inline background
	});

	it('reads bar thickness from --rf-chart-bar-thickness (default cap 48, overridable)', () => {
		const def = mount({ rows: '<tr><td>Jan</td><td>100</td></tr>' });
		expect(Number(def.querySelector('rect')!.getAttribute('width'))).toBeCloseTo(48, 0);
		const thin = mount({ rows: '<tr><td>Jan</td><td>100</td></tr>', props: { '--rf-chart-bar-thickness': '20px' } });
		expect(Number(thin.querySelector('rect')!.getAttribute('width'))).toBeCloseTo(20, 0);
	});

	it('reads point radius from --rf-chart-point-radius', () => {
		const el = mount({ type: 'line', rows: '<tr><td>Q1</td><td>10</td></tr>', props: { '--rf-chart-point-radius': '7px' } });
		expect(el.querySelector('circle')!.getAttribute('r')).toBe('7');
	});

	it('sentiment mode: a value cell\'s data-meta-sentiment tags its bar for semantic colour', () => {
		const el = mount({ rows: '<tr><td>done</td><td data-meta-sentiment="positive">5</td></tr><tr><td>blocked</td><td data-meta-sentiment="negative">2</td></tr>' });
		const rects = [...el.querySelectorAll('rect')];
		expect(rects[0].getAttribute('data-meta-sentiment')).toBe('positive');
		expect(rects[1].getAttribute('data-meta-sentiment')).toBe('negative');
	});

	it('sentiment on the label cell applies to the whole row', () => {
		const el = mount({ rows: '<tr><td data-meta-sentiment="caution">review</td><td>3</td></tr>' });
		expect(el.querySelector('rect')!.getAttribute('data-meta-sentiment')).toBe('caution');
	});

	it('axis + label elements are tagged for CSS paint (no inline stroke/fill)', () => {
		const el = mount({ rows: '<tr><td>Jan</td><td>100</td></tr>' });
		const axes = [...el.querySelectorAll('.rf-chart__axis')];
		expect(axes.length).toBe(2);
		expect(axes[0].getAttribute('stroke')).toBeNull();
		expect(el.querySelector('.rf-chart__label')!.getAttribute('fill')).toBeNull();
	});
});
