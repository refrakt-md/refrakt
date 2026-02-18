<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';
	import type { RendererNode } from '@refrakt-md/types';
	import type { InProgressBlock } from './block-scanner.js';
	import FallbackRenderer from './FallbackRenderer.svelte';
	import RuneSkeleton from './RuneSkeleton.svelte';

	let {
		node,
		inProgressBlocks = [],
	}: {
		node: RendererNode;
		inProgressBlocks?: InProgressBlock[];
	} = $props();

	function handleError(error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error('[refrakt-chat] Component crash, falling back to static rendering:', msg);
	}
</script>

<svelte:boundary onerror={handleError}>
	<Renderer {node} />
	{#snippet failed(error, reset)}
		<FallbackRenderer {node} />
	{/snippet}
</svelte:boundary>

{#if inProgressBlocks.length > 0}
	<RuneSkeleton blocks={inProgressBlocks} />
{/if}
