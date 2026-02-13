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

	const colors = [
		'var(--rf-color-info)',
		'var(--rf-color-success)',
		'var(--rf-color-warning)',
		'var(--rf-color-danger)',
		'#7c3aed',
		'#0891b2',
	];

	const svgWidth = 600;
	const svgHeight = 300;
	const padding = { top: 30, right: 20, bottom: 40, left: 50 };
	const chartWidth = svgWidth - padding.left - padding.right;
	const chartHeight = svgHeight - padding.top - padding.bottom;

	const labels = chartData.rows.map(r => r[0] || '');
	const series = chartData.headers.slice(1);
	const values = chartData.rows.map(r => r.slice(1).map(v => parseFloat(v) || 0));

	const allValues = values.flat();
	const maxValue = Math.max(...allValues, 1);

	const barGroupWidth = chartWidth / Math.max(labels.length, 1);
	const barWidth = barGroupWidth / Math.max(series.length + 1, 2);
</script>

<figure class="rf-chart" typeof="Chart">
	{#if title}
		<figcaption class="rf-chart__title">{title}</figcaption>
	{/if}
	<div class="rf-chart__container">
		<svg viewBox="0 0 {svgWidth} {svgHeight}" class="rf-chart__svg">
			<line
				x1={padding.left} y1={padding.top}
				x2={padding.left} y2={svgHeight - padding.bottom}
				stroke="var(--rf-color-border)" stroke-width="1"
			/>
			<line
				x1={padding.left} y1={svgHeight - padding.bottom}
				x2={svgWidth - padding.right} y2={svgHeight - padding.bottom}
				stroke="var(--rf-color-border)" stroke-width="1"
			/>

			{#if chartType === 'bar'}
				{#each labels as label, i}
					{#each series as _, si}
						<rect
							x={padding.left + i * barGroupWidth + si * barWidth + barWidth * 0.25}
							y={padding.top + chartHeight - (values[i][si] / maxValue) * chartHeight}
							width={barWidth * 0.75}
							height={(values[i][si] / maxValue) * chartHeight}
							style="fill: {colors[si % colors.length]}"
							rx="2"
						/>
					{/each}
					<text
						x={padding.left + i * barGroupWidth + barGroupWidth / 2}
						y={svgHeight - padding.bottom + 20}
						text-anchor="middle"
						font-size="12"
						fill="var(--rf-color-muted)"
					>{label}</text>
				{/each}
			{:else if chartType === 'line'}
				{#each series as _, si}
					<polyline
						points={labels.map((_, i) =>
							`${padding.left + i * barGroupWidth + barGroupWidth / 2},${padding.top + chartHeight - (values[i][si] / maxValue) * chartHeight}`
						).join(' ')}
						fill="none"
						style="stroke: {colors[si % colors.length]}"
						stroke-width="2"
					/>
					{#each labels as _, i}
						<circle
							cx={padding.left + i * barGroupWidth + barGroupWidth / 2}
							cy={padding.top + chartHeight - (values[i][si] / maxValue) * chartHeight}
							r="4"
							style="fill: {colors[si % colors.length]}"
						/>
					{/each}
				{/each}
				{#each labels as label, i}
					<text
						x={padding.left + i * barGroupWidth + barGroupWidth / 2}
						y={svgHeight - padding.bottom + 20}
						text-anchor="middle"
						font-size="12"
						fill="var(--rf-color-muted)"
					>{label}</text>
				{/each}
			{/if}
		</svg>
	</div>
	{#if series.length > 1}
		<div class="rf-chart__legend">
			{#each series as name, i}
				<span class="rf-chart__legend-item">
					<span class="rf-chart__legend-color" style="background: {colors[i % colors.length]};"></span>
					{name}
				</span>
			{/each}
		</div>
	{/if}
</figure>
