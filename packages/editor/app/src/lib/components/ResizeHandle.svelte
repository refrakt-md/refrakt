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
		width: 8px;
		cursor: col-resize;
		background: color-mix(in srgb, var(--ed-border-default) 20%, transparent);
		transition: background var(--ed-transition-fast);
		flex-shrink: 0;
	}

	.resize-handle:hover,
	.resize-handle.active {
		background: var(--ed-border-default);
	}
</style>
