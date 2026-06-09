import { SafeHTMLElement } from './ssr-safe.js';

/**
 * <rf-chart> — progressively enhances an authored data `<table>` into an SVG
 * chart.
 *
 * The `<table>` is the single source of truth (SPEC-083): no-JS users keep it as
 * the accessible fallback; this element parses it in place (`thead` → headers,
 * `tbody` → rows; cells read `data-value ?? textContent`, and
 * `data-meta-sentiment` for sentiment colouring) and renders the svg, leaving the
 * table in the DOM (visually-hidden) for screen readers.
 *
 * **Theming contract (SPEC-083 / WORK-353):** the renderer holds no palette or
 * dimensions of its own. *Paint* (series colours, stroke, font, sentiment) is
 * applied by `chart.css` from the `--rf-chart-*` custom properties via tagged
 * elements (`.rf-chart__bar[data-series]`, `[data-meta-sentiment]`). *Layout
 * geometry* (bar ratio/thickness/gap, point radius) is read from those same
 * properties via `getComputedStyle`, so a future non-CSS provider (canvas) reads
 * the identical contract. The defaults below mirror chart.css so the renderer
 * still works if the stylesheet is absent.
 *
 * SVG only for now — the provider abstraction is deferred (SPEC-083 / WORK-334).
 */

interface ChartData {
	headers: string[];
	rows: string[][];
	/** Per value-cell sentiment (aligned with each row's value cells), falling
	 *  back to the row's label-cell sentiment. Drives sentiment colouring. */
	sentiments: (string | null)[][];
}

const SVGNS = 'http://www.w3.org/2000/svg';
const SERIES_COUNT = 6;

/** Geometry defaults — mirror the `--rf-chart-*` values shipped in chart.css. */
const GEOM_DEFAULTS = { barRatio: 0.75, barThickness: 48, barGap: 0.15, pointRadius: 4 };

function cellValue(cell: HTMLTableCellElement): string {
	return (cell.dataset.value ?? cell.textContent ?? '').trim();
}

function parseTable(table: HTMLTableElement): ChartData {
	const headers: string[] = [];
	for (const th of table.querySelectorAll<HTMLTableCellElement>('thead th, thead td')) {
		headers.push(cellValue(th));
	}
	const rows: string[][] = [];
	const sentiments: (string | null)[][] = [];
	for (const tr of table.querySelectorAll<HTMLTableRowElement>('tbody tr')) {
		const cells = Array.from(tr.cells);
		rows.push(cells.map(cellValue));
		// A sentiment on a value cell wins; otherwise the label cell's sentiment
		// (a whole-row intent, e.g. a status row) applies to every series.
		const labelSent = cells[0]?.dataset.metaSentiment ?? null;
		sentiments.push(cells.slice(1).map((c) => c.dataset.metaSentiment ?? labelSent));
	}
	return { headers, rows, sentiments };
}

/** Read the geometry contract once per render — `getComputedStyle` resolves the
 *  `--rf-chart-*` props (from chart.css, a theme override, or inline), falling
 *  back to the shipped defaults when absent (e.g. no stylesheet in tests). */
function readGeometry(host: HTMLElement): typeof GEOM_DEFAULTS {
	const cs = getComputedStyle(host);
	const num = (prop: string, def: number) => {
		const v = parseFloat(cs.getPropertyValue(prop));
		return Number.isFinite(v) ? v : def;
	};
	return {
		barRatio: num('--rf-chart-bar-ratio', GEOM_DEFAULTS.barRatio),
		barThickness: num('--rf-chart-bar-thickness', GEOM_DEFAULTS.barThickness),
		barGap: num('--rf-chart-bar-gap', GEOM_DEFAULTS.barGap),
		pointRadius: num('--rf-chart-point-radius', GEOM_DEFAULTS.pointRadius),
	};
}

function svgEl(name: string, attrs: Record<string, string | number>, text?: string): SVGElement {
	const el = document.createElementNS(SVGNS, name);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
	if (text != null) el.textContent = text;
	return el;
}

/** Standalone svg renderer — a future `ChartProvider.render` lifts this verbatim.
 *  Emits only tagged elements (class + data-series + optional data-meta-sentiment);
 *  all colour/stroke/font is painted by chart.css from the contract props. */
function renderSvg(data: ChartData, container: HTMLElement, host: HTMLElement, opts: { type: string }): void {
	const svgW = 600, svgH = 300;
	const pad = { top: 30, right: 20, bottom: 40, left: 50 };
	const cw = svgW - pad.left - pad.right;
	const ch = svgH - pad.top - pad.bottom;
	const g = readGeometry(host);

	const labels = data.rows.map((r) => r[0] || '');
	const series = data.headers.slice(1);
	const values = data.rows.map((r) => r.slice(1).map((v) => parseFloat(v) || 0));
	const maxVal = Math.max(...values.flat(), 1);
	const bgw = cw / Math.max(labels.length, 1);

	const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, class: 'rf-chart__svg' });

	// Axes — painted via `.rf-chart__axis` (grid colour/width from the contract).
	svg.appendChild(svgEl('line', { x1: pad.left, y1: pad.top, x2: pad.left, y2: svgH - pad.bottom, class: 'rf-chart__axis' }));
	svg.appendChild(svgEl('line', { x1: pad.left, y1: svgH - pad.bottom, x2: svgW - pad.right, y2: svgH - pad.bottom, class: 'rf-chart__axis' }));

	const tagSentiment = (el: SVGElement, i: number, si: number) => {
		const s = data.sentiments[i]?.[si];
		if (s) el.setAttribute('data-meta-sentiment', s);
	};

	if (opts.type === 'line') {
		for (let si = 0; si < series.length; si++) {
			const pts = labels.map((_, i) =>
				`${pad.left + i * bgw + bgw / 2},${pad.top + ch - (values[i][si] / maxVal) * ch}`,
			).join(' ');
			svg.appendChild(svgEl('polyline', { points: pts, class: 'rf-chart__line', 'data-series': si % SERIES_COUNT }));
			for (let i = 0; i < labels.length; i++) {
				const c = svgEl('circle', {
					cx: pad.left + i * bgw + bgw / 2,
					cy: pad.top + ch - (values[i][si] / maxVal) * ch,
					r: g.pointRadius, class: 'rf-chart__point', 'data-series': si % SERIES_COUNT,
				});
				tagSentiment(c, i, si);
				svg.appendChild(c);
			}
		}
	} else {
		// bar (default; pie/area fall back to bars, as the previous renderer did)
		const inner = bgw * (1 - g.barGap);
		const gap = (bgw * g.barGap) / 2;
		const subSlot = inner / Math.max(series.length, 1);
		const barW = Math.min(subSlot * g.barRatio, g.barThickness);
		for (let i = 0; i < labels.length; i++) {
			for (let si = 0; si < series.length; si++) {
				const h = (values[i][si] / maxVal) * ch;
				const rect = svgEl('rect', {
					x: pad.left + i * bgw + gap + si * subSlot + (subSlot - barW) / 2,
					y: pad.top + ch - h,
					width: barW, height: h, class: 'rf-chart__bar', 'data-series': si % SERIES_COUNT,
				});
				tagSentiment(rect, i, si);
				svg.appendChild(rect);
			}
		}
	}

	// Category labels (painted via `.rf-chart__label`).
	for (let i = 0; i < labels.length; i++) {
		svg.appendChild(svgEl('text', {
			x: pad.left + i * bgw + bgw / 2, y: svgH - pad.bottom + 20,
			'text-anchor': 'middle', class: 'rf-chart__label',
		}, labels[i]));
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
		renderSvg(data, container, this, { type });

		// Legend (one swatch per series, when there's more than one). The swatch
		// colour comes from chart.css via `data-series` — no inline paint.
		const series = data.headers.slice(1);
		if (series.length > 1) {
			const legend = document.createElement('div');
			legend.className = 'rf-chart__legend';
			series.forEach((name, i) => {
				const item = document.createElement('span');
				item.className = 'rf-chart__legend-item';
				const swatch = document.createElement('span');
				swatch.className = 'rf-chart__legend-color';
				swatch.dataset.series = String(i % SERIES_COUNT);
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
