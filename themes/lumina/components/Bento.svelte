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
		? tag.attributes['data-size'] || 'small'
		: 'small';
</script>

{#if isGroup}
	<section class="rf-bento">
		<div class="rf-bento__grid" style:grid-template-columns="repeat({columns}, 1fr)" style:gap={gap}>
			{#if gridEl}
				<Renderer node={gridEl.children} />
			{/if}
		</div>
	</section>
{:else}
	<div class="rf-bento-cell rf-bento-cell--{cellSize}">
		{#if cellName}
			<h3 class="rf-bento-cell__title">{cellName}</h3>
		{/if}
		<div class="rf-bento-cell__body">
			{@render children()}
		</div>
	</div>
{/if}
