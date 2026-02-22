<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = tag.attributes.typeof;

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	function meta(node: SerializedTag, prop: string): string {
		const child = node.children.find(
			(c): c is SerializedTag => isTag(c) && c.name === 'meta' && c.attributes?.property === prop
		);
		return child?.attributes?.content ?? '';
	}

	function propText(node: SerializedTag, prop: string): string {
		const child = node.children.find(
			(c): c is SerializedTag => isTag(c) && c.attributes?.property === prop
		);
		if (!child) return '';
		return child.children.filter((c): c is string => typeof c === 'string').join('');
	}

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

	function findRef(node: SerializedTag, name: string): SerializedTag | undefined {
		for (const c of node.children) {
			if (isTag(c) && c.attributes?.['data-name'] === name) return c;
		}
		return undefined;
	}

	const isComparison = typeName === 'Comparison';
	const layout = isComparison ? (meta(tag, 'layout') || 'table') : '';
	const verdict = isComparison ? meta(tag, 'verdict') : '';
	const highlightedName = isComparison ? meta(tag, 'highlighted') : '';
	const labelsPosition = isComparison ? (meta(tag, 'labels') || 'left') : '';
	const rowLabelsJson = isComparison ? meta(tag, 'rowLabels') : '[]';
	const rowLabels: string[] = isComparison ? (() => { try { return JSON.parse(rowLabelsJson); } catch { return []; } })() : [];
	const columns = isComparison ? findByType(tag, 'ComparisonColumn') : [];

	const titleTag = isComparison ? tag.children.find(
		(c): c is SerializedTag => isTag(c) && /^h[1-6]$/.test(c.name)
	) : undefined;
	const titleText = titleTag ? titleTag.children.filter((c): c is string => typeof c === 'string').join('') : '';

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

	const isColumn = typeName === 'ComparisonColumn';
	const colName = isColumn ? propText(tag, 'name') : '';
	const colHighlighted = isColumn ? meta(tag, 'highlighted') === 'true' : false;

	const isRow = typeName === 'ComparisonRow';
	const rowLabel = isRow ? propText(tag, 'label') : '';
	const rowType = isRow ? meta(tag, 'rowType') : '';
	const rowBody = isRow ? findRef(tag, 'body') : undefined;
</script>

{#if isComparison}
	<section class="rf-comparison rf-comparison--{layout}">
		{#if titleText}
			<h2 class="rf-comparison__title">{titleText}</h2>
		{/if}

		{#if layout === 'cards'}
			<div class="rf-comparison__cards">
				{#each columnData as col}
					<div class="rf-comparison-card {col.highlighted ? 'rf-comparison-card--highlighted' : ''}">
						{#if col.highlighted}
							<div class="rf-comparison-card__badge">Recommended</div>
						{/if}
						<h3 class="rf-comparison-card__name">{col.name}</h3>
						<ul class="rf-comparison-card__rows">
							{#each col.rows as row}
								{@const rType = meta(row, 'rowType')}
								{@const rLabel = propText(row, 'label')}
								{@const rBody = findRef(row, 'body')}
								{#if rType !== 'empty'}
									<li class="rf-comparison-card__row {rType === 'negative' ? 'rf-comparison-card__row--negative' : ''} {rType === 'callout' ? 'rf-comparison-card__row--callout' : ''}">
										{#if rType === 'check'}
											<span class="rf-comparison__row-icon rf-comparison__row-icon--check" aria-label="Supported">&#10003;</span>
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<Renderer node={rBody.children} />{/if}
										{:else if rType === 'cross'}
											<span class="rf-comparison__row-icon rf-comparison__row-icon--cross" aria-label="Not supported">&#10007;</span>
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<Renderer node={rBody.children} />{/if}
										{:else if rType === 'negative'}
											{#if rLabel}<strong>{rLabel}</strong>{/if}
											{#if rBody}<span class="rf-comparison__negative"><Renderer node={rBody.children} /></span>{/if}
										{:else if rType === 'callout'}
											<div class="rf-comparison__callout-badge">
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
			<div class="rf-comparison__table-wrapper">
				<table class="rf-comparison__table">
					<thead>
						<tr>
							{#if labelsPosition !== 'hidden'}
								<th class="rf-comparison__label-col"></th>
							{/if}
							{#each columnData as col}
								<th class="{col.highlighted ? 'rf-comparison__col-header--highlighted' : ''}">
									{col.name}
									{#if col.highlighted}
										<span class="rf-comparison__recommended-badge">Recommended</span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rowLabels as label, i}
							<tr>
								{#if labelsPosition !== 'hidden'}
									<th class="rf-comparison__row-label" scope="row">{label}</th>
								{/if}
								{#each columnData as col}
									{@const row = col.rows[i]}
									{@const rType = row ? meta(row, 'rowType') : 'empty'}
									{@const rBody = row ? findRef(row, 'body') : undefined}
									<td class="rf-comparison__cell {col.highlighted ? 'rf-comparison__cell--highlighted' : ''} {rType === 'empty' ? 'rf-comparison__cell--empty' : ''}">
										{#if rType === 'check'}
											<span class="rf-comparison__row-icon rf-comparison__row-icon--check" aria-label="Supported">&#10003;</span>
										{:else if rType === 'cross'}
											<span class="rf-comparison__row-icon rf-comparison__row-icon--cross" aria-label="Not supported">&#10007;</span>
										{:else if rType === 'negative'}
											{#if rBody}
												<span class="rf-comparison__negative"><Renderer node={rBody.children} /></span>
											{/if}
										{:else if rType === 'empty'}
											<span class="rf-comparison__cell--empty" aria-label="Not applicable">&mdash;</span>
										{:else if rType === 'callout'}
											{#if rBody}
												<span class="rf-comparison__callout-badge"><Renderer node={rBody.children} /></span>
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
		{/if}

		{#if verdict}
			<p class="rf-comparison__verdict">{verdict}</p>
		{/if}
	</section>
{:else if isColumn}
	<div class="rf-comparison-column {colHighlighted ? 'rf-comparison-column--highlighted' : ''}">
		<h3>{colName}</h3>
		{@render children()}
	</div>
{:else if isRow}
	<div class="rf-comparison-row rf-comparison-row--{rowType}">
		{#if rowLabel}<strong>{rowLabel}</strong>{/if}
		{@render children()}
	</div>
{/if}
