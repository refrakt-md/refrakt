<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = tag.attributes.typeof;

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	// Read a meta property from a tag's children
	function meta(node: SerializedTag, prop: string): string {
		const child = node.children.find(
			(c): c is SerializedTag => isTag(c) && c.name === 'meta' && c.attributes?.property === prop
		);
		return child?.attributes?.content ?? '';
	}

	// Read text content from a named property span
	function propText(node: SerializedTag, prop: string): string {
		const child = node.children.find(
			(c): c is SerializedTag => isTag(c) && c.attributes?.property === prop
		);
		if (!child) return '';
		return child.children.filter((c): c is string => typeof c === 'string').join('');
	}

	// Find all children with a specific typeof
	function findByType(node: SerializedTag, type: string): SerializedTag[] {
		const results: SerializedTag[] = [];
		function walk(children: RendererNode[]) {
			for (const c of children) {
				if (isTag(c)) {
					if (c.attributes?.typeof === type) {
						results.push(c);
					} else {
						walk(c.children);
					}
				} else if (Array.isArray(c)) {
					walk(c);
				}
			}
		}
		walk(node.children);
		return results;
	}

	// Find a ref (data-name) within a tag
	function findRef(node: SerializedTag, name: string): SerializedTag | undefined {
		for (const c of node.children) {
			if (isTag(c) && c.attributes?.['data-name'] === name) return c;
		}
		return undefined;
	}

	// --- Comparison (parent) ---
	const isComparison = typeName === 'Comparison';
	const layout = isComparison ? (meta(tag, 'layout') || 'table') : '';
	const verdict = isComparison ? meta(tag, 'verdict') : '';
	const highlightedName = isComparison ? meta(tag, 'highlighted') : '';
	const labelsPosition = isComparison ? (meta(tag, 'labels') || 'left') : '';
	const rowLabelsJson = isComparison ? meta(tag, 'rowLabels') : '[]';
	const rowLabels: string[] = isComparison ? (() => { try { return JSON.parse(rowLabelsJson); } catch { return []; } })() : [];
	const columns = isComparison ? findByType(tag, 'ComparisonColumn') : [];

	// Title from h2 child
	const titleTag = isComparison ? tag.children.find(
		(c): c is SerializedTag => isTag(c) && /^h[1-6]$/.test(c.name)
	) : undefined;
	const titleText = titleTag ? titleTag.children.filter((c): c is string => typeof c === 'string').join('') : '';

	// Build column data for table layout
	interface ColumnData {
		name: string;
		highlighted: boolean;
		rows: SerializedTag[];
	}

	const columnData: ColumnData[] = isComparison ? columns.map(col => ({
		name: propText(col, 'name'),
		highlighted: meta(col, 'highlighted') === 'true',
		rows: findByType(col, 'ComparisonRow'),
	})) : [];

	// --- ComparisonColumn ---
	const isColumn = typeName === 'ComparisonColumn';
	const colName = isColumn ? propText(tag, 'name') : '';
	const colHighlighted = isColumn ? meta(tag, 'highlighted') === 'true' : false;
	const colRows = isColumn ? findByType(tag, 'ComparisonRow') : [];

	// --- ComparisonRow ---
	const isRow = typeName === 'ComparisonRow';
	const rowLabel = isRow ? propText(tag, 'label') : '';
	const rowType = isRow ? meta(tag, 'rowType') : '';
	const rowBody = isRow ? findRef(tag, 'body') : undefined;
</script>

{#if isComparison}
	<section class="comparison comparison-{layout}">
		{#if titleText}
			<h2 class="comparison-title">{titleText}</h2>
		{/if}

		{#if layout === 'cards'}
			<div class="comparison-cards">
				{#each columnData as col}
					<div class="comparison-card" class:highlighted={col.highlighted}>
						{#if col.highlighted}
							<div class="comparison-badge">Recommended</div>
						{/if}
						<h3 class="comparison-card-name">{col.name}</h3>
						<ul class="comparison-card-rows">
							{#each col.rows as row}
								{@const rType = meta(row, 'rowType')}
								{@const rLabel = propText(row, 'label')}
								{@const rBody = findRef(row, 'body')}
								{#if rType !== 'empty'}
									<li class="comparison-card-row row-{rType}">
										{#if rType === 'check'}
											<span class="row-icon check" aria-label="Supported">&#10003;</span>
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<Renderer node={rBody.children} />{/if}
										{:else if rType === 'cross'}
											<span class="row-icon cross" aria-label="Not supported">&#10007;</span>
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<Renderer node={rBody.children} />{/if}
										{:else if rType === 'negative'}
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<span class="negative-content"><Renderer node={rBody.children} /></span>{/if}
										{:else if rType === 'callout'}
											<div class="callout-badge">
												{#if rBody}<Renderer node={rBody.children} />{/if}
											</div>
										{:else}
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<Renderer node={rBody.children} />{/if}
										{/if}
									</li>
								{/if}
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Table layout (default) -->
			<div class="comparison-table-wrapper">
				<table class="comparison-table">
					<thead>
						<tr>
							{#if labelsPosition !== 'hidden'}
								<th class="label-col"></th>
							{/if}
							{#each columnData as col}
								<th class="col-header" class:highlighted={col.highlighted}>
									{col.name}
									{#if col.highlighted}
										<span class="recommended-badge">Recommended</span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rowLabels as label, i}
							<tr>
								{#if labelsPosition !== 'hidden'}
									<th class="row-label" scope="row">{label}</th>
								{/if}
								{#each columnData as col}
									{@const row = col.rows[i]}
									{@const rType = row ? meta(row, 'rowType') : 'empty'}
									{@const rBody = row ? findRef(row, 'body') : undefined}
									<td class="cell" class:highlighted={col.highlighted} class:cell-empty={rType === 'empty'}>
										{#if rType === 'check'}
											<span class="row-icon check" aria-label="Supported">&#10003;</span>
										{:else if rType === 'cross'}
											<span class="row-icon cross" aria-label="Not supported">&#10007;</span>
										{:else if rType === 'negative'}
											{#if rBody}
												<span class="negative-content"><Renderer node={rBody.children} /></span>
											{/if}
										{:else if rType === 'empty'}
											<span class="empty-cell" aria-label="Not applicable">&mdash;</span>
										{:else if rType === 'callout'}
											{#if rBody}
												<span class="callout-badge"><Renderer node={rBody.children} /></span>
											{/if}
										{:else}
											{#if rBody}
												<Renderer node={rBody.children} />
											{/if}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Secondary/unlabeled rows per column (below table) -->
			{#each columnData as col}
				{@const secondaryRows = col.rows.slice(rowLabels.length)}
				{#if secondaryRows.some(r => meta(r, 'rowType') !== 'empty')}
					<!-- These are handled visually within cards; in table they appear as additional features -->
				{/if}
			{/each}
		{/if}

		{#if verdict}
			<p class="comparison-verdict">{verdict}</p>
		{/if}
	</section>
{:else if isColumn}
	<div class="comparison-column" class:highlighted={colHighlighted}>
		<h3>{colName}</h3>
		{@render children()}
	</div>
{:else if isRow}
	<div class="comparison-row row-{rowType}">
		{#if rowLabel}<strong>{rowLabel}</strong>{/if}
		{@render children()}
	</div>
{/if}

<style>
	/* ---- Comparison Container ---- */
	.comparison {
		margin: 2rem 0;
	}

	.comparison-title {
		text-align: center;
		margin: 0 0 1.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
	}

	/* Hide meta/span property elements */
	.comparison :global(meta),
	.comparison :global(span[property]) {
		display: none;
	}

	/* ---- Table Layout ---- */
	.comparison-table-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: 0 -1rem;
		padding: 0 1rem;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	.comparison-table thead {
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.comparison-table th,
	.comparison-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.comparison-table thead th {
		background: var(--color-bg, #fff);
		font-weight: 700;
		font-size: 1rem;
		color: var(--color-text);
		border-bottom: 2px solid var(--color-border, #d1d5db);
		vertical-align: bottom;
	}

	.col-header.highlighted {
		background: color-mix(in srgb, var(--color-primary, #2563eb) 5%, var(--color-bg, #fff));
		border-bottom-color: var(--color-primary, #2563eb);
	}

	.recommended-badge {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-primary, #2563eb);
		margin-top: 0.25rem;
	}

	.label-col {
		width: 1%;
		white-space: nowrap;
	}

	.row-label {
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
		background: var(--color-bg, #fff);
	}

	.cell {
		color: var(--color-muted, #4b5563);
		vertical-align: middle;
	}

	.cell.highlighted {
		background: color-mix(in srgb, var(--color-primary, #2563eb) 3%, transparent);
	}

	.cell :global(p) {
		margin: 0;
	}

	.cell :global(strong) {
		display: none;
	}

	.cell :global(em) {
		font-style: italic;
		color: var(--color-muted, #6b7280);
	}

	/* Hide the " — " separator after bold labels */
	.cell :global(p) {
		font-size: 0.875rem;
	}

	.cell-empty {
		color: var(--color-muted, #9ca3af);
	}

	/* Row icons */
	.row-icon {
		font-weight: 700;
		font-size: 1.125rem;
	}

	.row-icon.check {
		color: var(--color-success, #16a34a);
	}

	.row-icon.cross {
		color: var(--color-danger, #dc2626);
	}

	/* Negative/strikethrough content */
	.negative-content {
		color: var(--color-danger, #dc2626);
		opacity: 0.85;
	}

	.negative-content :global(del),
	.negative-content :global(s) {
		text-decoration: line-through;
	}

	.empty-cell {
		color: var(--color-muted, #9ca3af);
	}

	/* Callout badge */
	.callout-badge {
		display: inline-block;
		background: color-mix(in srgb, var(--color-primary, #2563eb) 10%, transparent);
		color: var(--color-primary, #2563eb);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
	}

	.callout-badge :global(p) {
		margin: 0;
		font-size: inherit;
	}

	/* ---- Cards Layout ---- */
	.comparison-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		align-items: start;
	}

	.comparison-card {
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: var(--radius-md, 0.5rem);
		padding: 1.5rem;
		background: var(--color-bg, #fff);
		position: relative;
		transition: box-shadow 200ms ease, transform 200ms ease;
	}

	.comparison-card:hover {
		box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
	}

	.comparison-card.highlighted {
		border-color: var(--color-primary, #2563eb);
		box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
		transform: scale(1.02);
	}

	.comparison-badge {
		position: absolute;
		top: -0.625rem;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-primary, #2563eb);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.75rem;
		border-radius: 999px;
		white-space: nowrap;
	}

	.comparison-card-name {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.comparison-card-rows {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.comparison-card-row {
		padding: 0.5rem 0;
		font-size: 0.875rem;
		color: var(--color-muted, #4b5563);
		border-bottom: 1px solid var(--color-border, #f3f4f6);
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.comparison-card-row:last-child {
		border-bottom: none;
	}

	.comparison-card-row strong {
		color: var(--color-text);
		white-space: nowrap;
	}

	.comparison-card-row :global(p) {
		margin: 0;
		display: inline;
	}

	.comparison-card-row.row-negative {
		opacity: 0.7;
	}

	.comparison-card-row.row-callout {
		border-bottom: none;
		padding: 0.75rem 0 0.25rem;
	}

	/* ---- Verdict ---- */
	.comparison-verdict {
		text-align: center;
		font-size: 0.9375rem;
		color: var(--color-muted, #6b7280);
		font-style: italic;
		margin: 1.5rem 0 0;
		max-width: 48rem;
		margin-inline: auto;
	}

	/* ---- Fallback column/row rendering ---- */
	.comparison-column {
		margin-bottom: 1rem;
	}

	.comparison-column.highlighted {
		border-left: 3px solid var(--color-primary, #2563eb);
		padding-left: 1rem;
	}

	.comparison-row {
		padding: 0.25rem 0;
	}

	/* ---- Responsive ---- */
	@media (max-width: 640px) {
		.comparison-cards {
			grid-template-columns: 1fr;
		}

		.comparison-card.highlighted {
			transform: none;
		}

		.comparison-table {
			font-size: 0.8125rem;
		}

		.comparison-table th,
		.comparison-table td {
			padding: 0.5rem 0.625rem;
		}
	}
</style>
