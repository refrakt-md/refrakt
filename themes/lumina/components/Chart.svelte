<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const chartType = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'type')?.attributes?.content || 'bar';
	const title = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'title')?.attributes?.content || '';
	const stacked = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'stacked')?.attributes?.content === 'true';

	const dataJson = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.['data-name'] === 'data')?.attributes?.content || '{}';
	let chartData: { headers: string[]; rows: string[][] } = { headers: [], rows: [] };
	try {
		chartData = JSON.parse(dataJson);
	} catch {}

	const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

	// Simple SVG bar chart
	const svgWidth = 600;
	const svgHeight = 300;
	const padding = { top: 30, right: 20, bottom: 40, left: 50 };
	const chartWidth = svgWidth - padding.left - padding.right;
	const chartHeight = svgHeight - padding.top - padding.bottom;

	// Parse numeric values
	const labels = chartData.rows.map(r => r[0] || '');
	const series = chartData.headers.slice(1);
	const values = chartData.rows.map(r => r.slice(1).map(v => parseFloat(v) || 0));

	const allValues = values.flat();
	const maxValue = Math.max(...allValues, 1);

	const barGroupWidth = chartWidth / Math.max(labels.length, 1);
	const barWidth = barGroupWidth / Math.max(series.length + 1, 2);
</script>

<figure class="chart" typeof="Chart">
	{#if title}
		<figcaption class="chart-title">{title}</figcaption>
	{/if}
	<div class="chart-container">
		<svg viewBox="0 0 {svgWidth} {svgHeight}" class="chart-svg">
			<!-- Y axis -->
			<line
				x1={padding.left} y1={padding.top}
				x2={padding.left} y2={svgHeight - padding.bottom}
				stroke="var(--color-border)" stroke-width="1"
			/>
			<!-- X axis -->
			<line
				x1={padding.left} y1={svgHeight - padding.bottom}
				x2={svgWidth - padding.right} y2={svgHeight - padding.bottom}
				stroke="var(--color-border)" stroke-width="1"
			/>

			{#if chartType === 'bar'}
				{#each labels as label, i}
					{#each series as _, si}
						<rect
							x={padding.left + i * barGroupWidth + si * barWidth + barWidth * 0.25}
							y={padding.top + chartHeight - (values[i][si] / maxValue) * chartHeight}
							width={barWidth * 0.75}
							height={(values[i][si] / maxValue) * chartHeight}
							fill={colors[si % colors.length]}
							rx="2"
						/>
					{/each}
					<text
						x={padding.left + i * barGroupWidth + barGroupWidth / 2}
						y={svgHeight - padding.bottom + 20}
						text-anchor="middle"
						font-size="12"
						fill="var(--color-muted)"
					>{label}</text>
				{/each}
			{:else if chartType === 'line'}
				{#each series as _, si}
					<polyline
						points={labels.map((_, i) =>
							`${padding.left + i * barGroupWidth + barGroupWidth / 2},${padding.top + chartHeight - (values[i][si] / maxValue) * chartHeight}`
						).join(' ')}
						fill="none"
						stroke={colors[si % colors.length]}
						stroke-width="2"
					/>
					{#each labels as _, i}
						<circle
							cx={padding.left + i * barGroupWidth + barGroupWidth / 2}
							cy={padding.top + chartHeight - (values[i][si] / maxValue) * chartHeight}
							r="4"
							fill={colors[si % colors.length]}
						/>
					{/each}
				{/each}
				{#each labels as label, i}
					<text
						x={padding.left + i * barGroupWidth + barGroupWidth / 2}
						y={svgHeight - padding.bottom + 20}
						text-anchor="middle"
						font-size="12"
						fill="var(--color-muted)"
					>{label}</text>
				{/each}
			{/if}
		</svg>
	</div>
	{#if series.length > 1}
		<div class="chart-legend">
			{#each series as name, i}
				<span class="chart-legend-item">
					<span class="chart-legend-color" style="background: {colors[i % colors.length]};"></span>
					{name}
				</span>
			{/each}
		</div>
	{/if}
</figure>

<style>
	.chart {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin: 1.5rem 0;
	}

	.chart-title {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.chart-container {
		width: 100%;
	}

	.chart-svg {
		width: 100%;
		height: auto;
	}

	.chart-legend {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.chart-legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.chart-legend-color {
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}
</style>
