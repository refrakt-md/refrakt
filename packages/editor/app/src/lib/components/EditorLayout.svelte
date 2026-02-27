<script lang="ts">
	import type { Snippet } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';
	import ResizeHandle from './ResizeHandle.svelte';

	interface Props {
		left: Snippet;
		center: Snippet;
		right: Snippet;
	}

	let { left, center, right }: Props = $props();

	let leftWidth = $state(260);
	let layoutWidth = $state(0);

	const MIN_PANEL = 180;

	function handleLeftResize(delta: number) {
		leftWidth = Math.max(MIN_PANEL, leftWidth + delta);
	}

	// Fixed content width for the center panel — prevents text reflow during transition
	let gridColumns = $derived.by(() => {
		const available = Math.max(0, layoutWidth - leftWidth - 4);
		if (editorState.editorMode === 'code') {
			const half = Math.floor(available / 2);
			return `${leftWidth}px 4px ${half}px ${available - half}px`;
		}
		// Preview and Blocks: center collapsed, right fills
		return `${leftWidth}px 4px 0px ${available}px`;
	});

	// min-width for center inner — prevents text reflow during Blocks↔Code transition
	const codeCenterWidth = $derived(
		Math.floor(Math.max(0, layoutWidth - leftWidth - 4) / 2)
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
	<div class="layout__panel layout__panel--center">
		<div class="layout__center-inner" class:slide-out={editorState.editorMode !== 'code'} style="min-width: {codeCenterWidth}px">
			{@render center()}
		</div>
	</div>
	<div class="layout__panel layout__panel--right" class:panel-editing={editorState.editPanelOpen}>
		{@render right()}
	</div>
</div>

<style>
	.layout {
		display: grid;
		flex: 1;
		overflow: hidden;
		transition: grid-template-columns var(--ed-transition-slow);
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

	.layout__center-inner {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		transition: transform var(--ed-transition-slow);
	}

	.layout__center-inner.slide-out {
		transform: translateX(-100%);
	}

	.layout__panel--right {
		background: var(--ed-surface-1);
		align-items: center;
		transition: padding-right var(--ed-transition-slow);
	}

	.layout__panel--right.panel-editing {
		padding-right: 480px;
	}
</style>
