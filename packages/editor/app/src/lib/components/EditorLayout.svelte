<script lang="ts">
	import type { Snippet } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';
	import ResizeHandle from './ResizeHandle.svelte';

	interface Props {
		left: Snippet;
		center: Snippet;
		right: Snippet;
		hideRight?: boolean;
	}

	let { left, center, right, hideRight = false }: Props = $props();

	let leftWidth = $state(260);
	let rightWidth = $state(400);
	let layoutWidth = $state(0);
	let initialized = false;

	const MIN_PANEL = 180;

	$effect(() => {
		if (layoutWidth > 0 && !initialized) {
			initialized = true;
			const available = layoutWidth - leftWidth - 8;
			if (available > MIN_PANEL * 2) {
				rightWidth = Math.floor(available / 2);
			}
		}
	});

	function handleLeftResize(delta: number) {
		leftWidth = Math.max(MIN_PANEL, leftWidth + delta);
	}

	function handleRightResize(delta: number) {
		rightWidth = Math.max(MIN_PANEL, rightWidth - delta);
	}

	let gridColumns = $derived(
		editorState.editorMode === 'preview' || hideRight
			? `${leftWidth}px 4px 1fr`
			: `${leftWidth}px 4px 1fr 4px ${rightWidth}px`
	);
</script>

<div
	class="layout"
	bind:clientWidth={layoutWidth}
	style="grid-template-columns: {gridColumns}"
>
	<div class="layout__panel layout__panel--left">
		{@render left()}
	</div>
	<ResizeHandle onresize={handleLeftResize} />
	{#if editorState.editorMode === 'preview'}
		<div class="layout__panel layout__panel--center layout__panel--full-preview">
			{@render right()}
		</div>
	{:else if hideRight}
		<div class="layout__panel layout__panel--center">
			{@render center()}
		</div>
	{:else}
		<div class="layout__panel layout__panel--center">
			{@render center()}
		</div>
		<ResizeHandle onresize={handleRightResize} />
		<div class="layout__panel layout__panel--right">
			{@render right()}
		</div>
	{/if}
</div>

<style>
	.layout {
		display: grid;
		flex: 1;
		overflow: hidden;
	}

	.layout__panel {
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.layout__panel--left {
		background: var(--ed-surface-1);
	}

	.layout__panel--center {
		background: var(--ed-surface-0);
	}

	.layout__panel--right {
		background: var(--ed-surface-1);
	}

	.layout__panel--full-preview {
		background: var(--ed-surface-1);
	}
</style>
