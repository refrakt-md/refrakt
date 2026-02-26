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
>
	<div class="resize-handle__grip">
		<span class="resize-handle__dot"></span>
		<span class="resize-handle__dot"></span>
		<span class="resize-handle__dot"></span>
	</div>
</div>

<style>
	.resize-handle {
		width: 8px;
		cursor: col-resize;
		background: transparent;
		transition: background var(--ed-transition-fast), width var(--ed-transition-fast);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.resize-handle__grip {
		display: flex;
		flex-direction: column;
		gap: 3px;
		opacity: 0;
		transition: opacity var(--ed-transition-fast);
	}

	.resize-handle:hover .resize-handle__grip {
		opacity: 1;
	}

	.resize-handle__dot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--ed-text-muted);
	}

	.resize-handle:hover {
		background: var(--ed-accent-subtle);
		width: 10px;
	}

	.resize-handle.active {
		background: color-mix(in srgb, var(--ed-accent) 20%, transparent);
		width: 10px;
	}

	.resize-handle.active .resize-handle__grip {
		opacity: 1;
	}

	.resize-handle.active .resize-handle__dot {
		background: var(--ed-accent);
	}
</style>
