import { SafeHTMLElement } from './ssr-safe.js';

/**
 * <rf-chart> — progressively enhances an authored data `<table>` into an SVG
 * chart.
 *
 * The `<table>` is the single source of truth (SPEC-083): no-JS users keep it as
 * the accessible fallback; this element parses it in place (`thead` → headers,
 * `tbody` → rows; cells read `data-value ?? textContent`) and renders the svg,
 * leaving the table in the DOM (visually-hidden) for screen readers.
 *
 * SVG only for now — the provider abstraction is deferred (SPEC-083 / WORK-334).
 */

interface ChartData { headers: string[]; rows: string[][]; }

const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = [
	'var(--rf-color-info)', 'var(--rf-color-success)',
	'var(--rf-color-warning)', 'var(--rf-color-danger)',
	'#7c3aed', '#0891b2',
];

function cellValue(cell: HTMLTableCellElement): string {
	return (cell.dataset.value ?? cell.textContent ?? '').trim();
}

function parseTable(table: HTMLTableElement): ChartData {
	const headers: string[] = [];
	for (const th of table.querySelectorAll<HTMLTableCellElement>('thead th, thead td')) {
		headers.push(cellValue(th));
	}
	const rows: string[][] = [];
	for (const tr of table.querySelectorAll<HTMLTableRowElement>('tbody tr')) {
		rows.push(Array.from(tr.cells).map(cellValue));
	}
	return { headers, rows };
}

function svgEl(name: string, attrs: Record<string, string>, text?: string): SVGElement {
	const el = document.createElementNS(SVGNS, name);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	if (text != null) el.textContent = text;
	return el;
}

/** Standalone svg renderer — a future `ChartProvider.render` lifts this verbatim. */
function renderSvg(data: ChartData, container: HTMLElement, opts: { type: string }): void {
	const svgW = 600, svgH = 300;
	const pad = { top: 30, right: 20, bottom: 40, left: 50 };
	const cw = svgW - pad.left - pad.right;
	const ch = svgH - pad.top - pad.bottom;

	const labels = data.rows.map(r => r[0] || '');
	const series = data.headers.slice(1);
	const values = data.rows.map(r => r.slice(1).map(v => parseFloat(v) || 0));
	const maxVal = Math.max(...values.flat(), 1);

	const bgw = cw / Math.max(labels.length, 1);
	const bw = bgw / Math.max(series.length + 1, 2);

	const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, class: 'rf-chart__svg' });

	// Axes
	svg.appendChild(svgEl('line', {
		x1: String(pad.left), y1: String(pad.top),
		x2: String(pad.left), y2: String(svgH - pad.bottom),
		stroke: 'var(--rf-color-border)', 'stroke-width': '1',
	}));
	svg.appendChild(svgEl('line', {
		x1: String(pad.left), y1: String(svgH - pad.bottom),
		x2: String(svgW - pad.right), y2: String(svgH - pad.bottom),
		stroke: 'var(--rf-color-border)', 'stroke-width': '1',
	}));

	if (opts.type === 'line') {
		for (let si = 0; si < series.length; si++) {
			const pts = labels.map((_, i) =>
				`${pad.left + i * bgw + bgw / 2},${pad.top + ch - (values[i][si] / maxVal) * ch}`,
			).join(' ');
			svg.appendChild(svgEl('polyline', {
				points: pts, fill: 'none',
				style: `stroke: ${COLORS[si % COLORS.length]}`, 'stroke-width': '2',
			}));
			for (let i = 0; i < labels.length; i++) {
				svg.appendChild(svgEl('circle', {
					cx: String(pad.left + i * bgw + bgw / 2),
					cy: String(pad.top + ch - (values[i][si] / maxVal) * ch),
					r: '4', style: `fill: ${COLORS[si % COLORS.length]}`,
				}));
			}
		}
		for (let i = 0; i < labels.length; i++) {
			svg.appendChild(svgEl('text', {
				x: String(pad.left + i * bgw + bgw / 2), y: String(svgH - pad.bottom + 20),
				'text-anchor': 'middle', 'font-size': '12', fill: 'var(--rf-color-muted)',
			}, labels[i]));
		}
	} else {
		// bar (default; pie/area fall back to bars, as the previous renderer did)
		for (let i = 0; i < labels.length; i++) {
			for (let si = 0; si < series.length; si++) {
				const h = (values[i][si] / maxVal) * ch;
				svg.appendChild(svgEl('rect', {
					x: String(pad.left + i * bgw + si * bw + bw * 0.25),
					y: String(pad.top + ch - h),
					width: String(bw * 0.75), height: String(h),
					style: `fill: ${COLORS[si % COLORS.length]}`, rx: '2',
				}));
			}
			svg.appendChild(svgEl('text', {
				x: String(pad.left + i * bgw + bgw / 2), y: String(svgH - pad.bottom + 20),
				'text-anchor': 'middle', 'font-size': '12', fill: 'var(--rf-color-muted)',
			}, labels[i]));
		}
	}

	container.replaceChildren(svg);
}

export class RfChart extends SafeHTMLElement {
	connectedCallback() {
		// Idempotent: connectedCallback fires on every (re)connection (hydration,
		// reparenting). Only enhance once — otherwise the svg/title/legend stack up.
		if (this.querySelector('.rf-chart__rendered')) return;

		const table = this.querySelector('table');
		if (!table) return;
		const data = parseTable(table);
		if (data.rows.length === 0) return;

		const title = table.querySelector('caption')?.textContent?.trim() ?? '';
		const type = this.dataset.type || 'bar';

		const rendered = document.createElement('div');
		rendered.className = 'rf-chart__rendered';

		if (title) {
			const cap = document.createElement('figcaption');
			cap.className = 'rf-chart__title';
			cap.textContent = title;
			rendered.appendChild(cap);
		}

		const container = document.createElement('div');
		container.className = 'rf-chart__container';
		rendered.appendChild(container);
		renderSvg(data, container, { type });

		// Legend (one swatch per series, when there's more than one)
		const series = data.headers.slice(1);
		if (series.length > 1) {
			const legend = document.createElement('div');
			legend.className = 'rf-chart__legend';
			series.forEach((name, i) => {
				const item = document.createElement('span');
				item.className = 'rf-chart__legend-item';
				const swatch = document.createElement('span');
				swatch.className = 'rf-chart__legend-color';
				swatch.style.background = COLORS[i % COLORS.length];
				item.append(swatch, document.createTextNode(name));
				legend.appendChild(item);
			});
			rendered.appendChild(legend);
		}

		this.appendChild(rendered);
		// Keep the data table for screen readers; CSS visually-hides it once rendered.
		this.setAttribute('data-rendered', '');
	}
}
