<script lang="ts">
	import type { Snippet } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';

	interface Props {
		left: Snippet;
		center: Snippet;
		right: Snippet;
	}

	let { left, center, right }: Props = $props();

	let layoutWidth = $state(0);

	const LEFT_WIDTH = 260;

	let gridColumns = $derived.by(() => {
		const available = Math.max(0, layoutWidth - LEFT_WIDTH);
		if (editorState.editorMode === 'code') {
			const half = Math.floor(available / 2);
			return `${LEFT_WIDTH}px ${half}px ${available - half}px`;
		}
		return `${LEFT_WIDTH}px 0px ${available}px`;
	});

	const codeCenterWidth = $derived(
		Math.floor(Math.max(0, layoutWidth - LEFT_WIDTH) / 2)
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
