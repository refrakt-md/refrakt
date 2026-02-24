<script lang="ts">
	import type { Snippet } from 'svelte';
	import ResizeHandle from './ResizeHandle.svelte';

	interface Props {
		left: Snippet;
		center: Snippet;
		right: Snippet;
	}

	let { left, center, right }: Props = $props();

	let leftWidth = $state(260);
	let rightWidth = $state(400);

	const MIN_PANEL = 180;

	function handleLeftResize(delta: number) {
		leftWidth = Math.max(MIN_PANEL, leftWidth + delta);
	}

	function handleRightResize(delta: number) {
		rightWidth = Math.max(MIN_PANEL, rightWidth - delta);
	}
</script>

<div
	class="layout"
	style="grid-template-columns: {leftWidth}px 4px 1fr 4px {rightWidth}px"
>
	<div class="layout__panel layout__panel--left">
		{@render left()}
	</div>
	<ResizeHandle onresize={handleLeftResize} />
	<div class="layout__panel layout__panel--center">
		{@render center()}
	</div>
	<ResizeHandle onresize={handleRightResize} />
	<div class="layout__panel layout__panel--right">
		{@render right()}
	</div>
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
		background: #161822;
	}

	.layout__panel--center {
		background: #12141c;
	}

	.layout__panel--right {
		background: #ffffff;
	}
</style>
