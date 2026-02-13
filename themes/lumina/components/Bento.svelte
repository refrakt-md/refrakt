<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(c: RendererNode): c is SerializedTag {
		return typeof c === 'object' && c !== null && 'name' in c;
	}

	const isGroup = tag.attributes.typeof === 'Bento';

	// For Bento container
	const metas = isGroup ? tag.children.filter((c: any) => c?.name === 'meta') : [];
	const gap = isGroup ? metas[0]?.attributes?.content || '1rem' : '1rem';
	const columns = isGroup ? parseInt(metas[1]?.attributes?.content || '4', 10) : 4;

	// Find the grid container in tag.children
	const gridEl = isGroup
		? tag.children.find((c): c is SerializedTag => isTag(c) && c.attributes?.['data-name'] === 'grid')
		: undefined;

	// For BentoCell
	const cellName = !isGroup
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';
	const cellSize = !isGroup
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'size')?.attributes?.content || 'small'
		: 'small';
</script>

{#if isGroup}
	<section class="bento">
		<div class="bento-grid" style:grid-template-columns="repeat({columns}, 1fr)" style:gap={gap}>
			{#if gridEl}
				<Renderer node={gridEl.children} />
			{/if}
		</div>
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

	.bento-grid {
		display: grid;
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
		.bento-grid {
			grid-template-columns: repeat(2, 1fr) !important;
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
		.bento-grid {
			grid-template-columns: 1fr !important;
		}
		.bento-cell-large,
		.bento-cell-medium {
			grid-column: span 1;
		}
	}
</style>
