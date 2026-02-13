<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Bento';

	// For Bento container
	const metas = isGroup ? tag.children.filter((c: any) => c?.name === 'meta') : [];
	const gap = isGroup ? metas[0]?.attributes?.content || '1rem' : '1rem';
	const columns = isGroup ? parseInt(metas[1]?.attributes?.content || '4', 10) : 4;

	// For BentoCell
	const cellName = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';
	const cellSize = !isGroup
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'size')?.attributes?.content || 'small'
		: 'small';
</script>

{#if isGroup}
	<section class="bento" style="--bento-gap: {gap}; --bento-columns: {columns};">
		{@render children()}
	</section>
{:else}
	<div class="bento-cell bento-cell-{cellSize}">
		{#if cellName}
			<h3 class="bento-cell-title">{cellName}</h3>
		{/if}
		<div class="bento-cell-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.bento {
		margin: 1.5rem 0;
	}

	.bento :global(div[data-name="grid"]) {
		display: grid;
		grid-template-columns: repeat(var(--bento-columns, 4), 1fr);
		gap: var(--bento-gap, 1rem);
	}

	.bento-cell {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		padding: 1.25rem;
		background: var(--color-surface, #fafafa);
		overflow: hidden;
	}

	.bento-cell-large {
		grid-column: span 2;
		grid-row: span 2;
	}

	.bento-cell-medium {
		grid-column: span 2;
	}

	.bento-cell-small {
		grid-column: span 1;
	}

	.bento-cell-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
	}

	.bento-cell-body :global(span[property]),
	.bento-cell-body :global(meta) {
		display: none;
	}

	.bento-cell-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.bento-cell :global(img) {
		width: 100%;
		height: auto;
		border-radius: var(--radius-sm, 0.25rem);
		margin-bottom: 0.75rem;
	}

	@media (max-width: 768px) {
		.bento :global(div[data-name="grid"]) {
			grid-template-columns: repeat(2, 1fr);
		}
		.bento-cell-large {
			grid-column: span 2;
			grid-row: span 1;
		}
		.bento-cell-medium {
			grid-column: span 2;
		}
	}

	@media (max-width: 480px) {
		.bento :global(div[data-name="grid"]) {
			grid-template-columns: 1fr;
		}
		.bento-cell-large,
		.bento-cell-medium {
			grid-column: span 1;
		}
	}
</style>
