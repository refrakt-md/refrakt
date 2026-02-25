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
</script>

<div
	class="layout"
	bind:clientWidth={layoutWidth}
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
		background: #f8fafc;
		border-right: 1px solid #e2e8f0;
	}

	.layout__panel--center {
		background: #ffffff;
	}

	.layout__panel--right {
		background: #ffffff;
		border-left: 1px solid #e2e8f0;
	}
</style>
