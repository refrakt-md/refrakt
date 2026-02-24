<script lang="ts">
	interface Props {
		onresize: (deltaX: number) => void;
	}

	let { onresize }: Props = $props();

	let dragging = $state(false);
	let startX = 0;

	function handlePointerDown(e: PointerEvent) {
		dragging = true;
		startX = e.clientX;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';

		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		const delta = e.clientX - startX;
		startX = e.clientX;
		onresize(delta);
	}

	function handlePointerUp() {
		dragging = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}
</script>

<div
	class="resize-handle"
	class:active={dragging}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	role="separator"
	aria-orientation="vertical"
></div>

<style>
	.resize-handle {
		width: 4px;
		cursor: col-resize;
		background: #e2e8f0;
		transition: background 0.15s;
		flex-shrink: 0;
	}

	.resize-handle:hover,
	.resize-handle.active {
		background: #0ea5e9;
	}
</style>
