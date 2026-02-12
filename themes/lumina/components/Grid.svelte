<script lang="ts">
	import type { SerializedTag, RendererNode } from '@refrakt-md/svelte';
	import { Renderer } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	function isTag(n: RendererNode): n is SerializedTag {
		return n !== null && typeof n === 'object' && !Array.isArray(n) && (n as any).$$mdtype === 'Tag';
	}

	// Find the grid layout container produced by the transform
	const layoutDiv = $derived(tag.children.find(
		(c): c is SerializedTag => isTag(c) && c.attributes?.['data-layout'] === 'grid'
	));
	const columns = $derived(layoutDiv?.attributes?.['data-columns']);
	const flow = $derived(layoutDiv?.attributes?.['data-flow']);
	const gridItems = $derived(layoutDiv?.children?.filter((c): c is SerializedTag => isTag(c)) ?? []);
</script>

{#if gridItems.length > 0}
	<div
		class="grid"
		style:grid-template-columns={columns ? `repeat(${columns}, 1fr)` : undefined}
		style:grid-auto-flow={flow || undefined}
	>
		{#each gridItems as item}
			{@const colspan = Number(item.attributes?.['data-colspan']) || 1}
			{@const rowspan = Number(item.attributes?.['data-rowspan']) || 1}
			<div
				class="grid-item"
				style:grid-column={colspan > 1 ? `span ${colspan}` : undefined}
				style:grid-row={rowspan > 1 ? `span ${rowspan}` : undefined}
			>
				<Renderer node={item.children} />
			</div>
		{/each}
	</div>
{:else}
	<div class="grid">
		{@render children()}
	</div>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin: 1.5rem 0;
	}
	.grid-item :global(p:first-child) {
		margin-top: 0;
	}
	.grid-item :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
