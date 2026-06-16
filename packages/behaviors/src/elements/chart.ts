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
const GEOM_DEFAULTS = { barRatio: 0.75, barThickness: 12, barGap: 0.15, barClusterGap: 4, pointRadius: 4 };

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
		barClusterGap: num('--rf-chart-bar-cluster-gap', GEOM_DEFAULTS.barClusterGap),
		pointRadius: num('--rf-chart-point-radius', GEOM_DEFAULTS.pointRadius),
	};
}

function svgEl(name: string, attrs: Record<string, string | number>, text?: string): SVGElement {
	const el = document.createElementNS(SVGNS, name);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
	if (text != null) el.textContent = text;
	return el;
}

/** Compute "nice" Y-axis ticks from the data's max value. Picks a step that is a
 *  1 / 2 / 2.5 / 5 multiple of a power of 10, so the top tick is always a clean
 *  round number. When `explicitStep` is provided, uses it verbatim. */
function niceTicks(maxVal: number, countHint: number, explicitStep?: number): number[] {
	if (maxVal <= 0) return [0, 1];
	let step: number;
	if (explicitStep && explicitStep > 0) {
		step = explicitStep;
	} else {
		const rawStep = maxVal / Math.max(countHint, 1);
		const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
		const normalized = rawStep / magnitude;
		if (normalized <= 1) step = 1 * magnitude;
		else if (normalized <= 2) step = 2 * magnitude;
		else if (normalized <= 2.5) step = 2.5 * magnitude;
		else if (normalized <= 5) step = 5 * magnitude;
		else step = 10 * magnitude;
	}
	const ticks: number[] = [];
	for (let v = 0; v <= maxVal + step * 1e-9; v += step) ticks.push(v);
	if (ticks[ticks.length - 1] < maxVal) ticks.push(ticks[ticks.length - 1] + step);
	return ticks;
}

/** Format a tick value for display — drop trailing zeros on fractional steps. */
function formatTick(v: number): string {
	if (Number.isInteger(v)) return String(v);
	return String(parseFloat(v.toFixed(4)));
}

/** Standalone svg renderer — a future `ChartProvider.render` lifts this verbatim.
 *  Emits only tagged elements (class + data-series + optional data-meta-sentiment);
 *  all colour/stroke/font is painted by chart.css from the contract props. */
function renderSvg(data: ChartData, container: HTMLElement, host: HTMLElement, opts: { type: string; tickCount: number; tickStep?: number }): void {
	const svgW = 600, svgH = 300;
	const pad = { top: 30, right: 20, bottom: 40, left: 50 };
	const cw = svgW - pad.left - pad.right;
	const ch = svgH - pad.top - pad.bottom;
	const g = readGeometry(host);

	const labels = data.rows.map((r) => r[0] || '');
	const series = data.headers.slice(1);
	const values = data.rows.map((r) => r.slice(1).map((v) => parseFloat(v) || 0));
	const rawMax = Math.max(...values.flat(), 1);
	const ticks = niceTicks(rawMax, opts.tickCount, opts.tickStep);
	// The chart top snaps to the highest tick so the topmost label is round.
	const maxVal = ticks[ticks.length - 1];
	const bgw = cw / Math.max(labels.length, 1);

	const svg = svgEl('svg', { viewBox: `0 0 ${svgW} ${svgH}`, class: 'rf-chart__svg' });

	// Horizontal grid lines + Y-axis tick labels — render BEFORE the data so the
	// bars/lines sit on top of the grid. Skip the zero line (the X axis covers it).
	for (const t of ticks) {
		const y = pad.top + ch - (t / maxVal) * ch;
		if (t > 0) {
			svg.appendChild(svgEl('line', {
				x1: pad.left, y1: y, x2: svgW - pad.right, y2: y, class: 'rf-chart__grid',
			}));
		}
		svg.appendChild(svgEl('text', {
			x: pad.left - 8, y: y + 4,
			'text-anchor': 'end', class: 'rf-chart__tick-label',
		}, formatTick(t)));
	}

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
		// bar (default; pie/area fall back to bars, as the previous renderer did).
		// Cluster the series' bars side-by-side (separated by `barClusterGap`) and
		// centre the whole cluster in each category slot. Bars cap at `barThickness`
		// but shrink proportionally when the slot can't fit the ideal cluster.
		const seriesCount = Math.max(series.length, 1);
		const availableCluster = bgw * (1 - g.barGap);
		const idealClusterW = seriesCount * g.barThickness + (seriesCount - 1) * g.barClusterGap;
		const barW = idealClusterW <= availableCluster
			? g.barThickness
			: Math.max(0, (availableCluster - (seriesCount - 1) * g.barClusterGap) / seriesCount);
		const clusterW = seriesCount * barW + (seriesCount - 1) * g.barClusterGap;
		const clusterStart = (bgw - clusterW) / 2;
		for (let i = 0; i < labels.length; i++) {
			for (let si = 0; si < series.length; si++) {
				const h = (values[i][si] / maxVal) * ch;
				const rect = svgEl('rect', {
					x: pad.left + i * bgw + clusterStart + si * (barW + g.barClusterGap),
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
		// `data-tick-count` / `data-tick-step` ride the rune bag; dataset
		// converts kebab → camel so they read as `tickCount` / `tickStep`.
		const tickCount = parseInt(this.dataset.tickCount || '5', 10);
		const tickStepRaw = this.dataset.tickStep;
		const tickStep = tickStepRaw ? parseFloat(tickStepRaw) : undefined;

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
		renderSvg(data, container, this, { type, tickCount, tickStep });

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
