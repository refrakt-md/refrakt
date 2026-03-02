<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	interface Props {
		anchorRect: { x: number; y: number; width: number; height: number };
		onclose: () => void;
		children: Snippet;
	}

	let { anchorRect, onclose, children }: Props = $props();

	let popoverEl: HTMLDivElement;

	// Position to the right of the anchor, aligned at the top
	let left = $state(anchorRect.x + anchorRect.width + 8);
	let top = $state(anchorRect.y);

	onMount(() => {
		if (popoverEl) {
			const rect = popoverEl.getBoundingClientRect();
			// Adjust if overflowing right edge
			if (rect.right > window.innerWidth - 8) {
				left = anchorRect.x - rect.width - 8;
			}
			// Adjust if overflowing bottom edge
			if (rect.bottom > window.innerHeight - 8) {
				top = window.innerHeight - rect.height - 8;
			}
			// Ensure it doesn't go above the viewport
			if (top < 8) {
				top = 8;
			}
		}

		function handleClickOutside(e: MouseEvent) {
			if (popoverEl && !popoverEl.contains(e.target as Node)) {
				onclose();
			}
		}

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onclose();
			}
		}

		// Delay to avoid catching the triggering click
		requestAnimationFrame(() => {
			document.addEventListener('click', handleClickOutside);
		});
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div
	class="popover"
	bind:this={popoverEl}
	style="left: {left}px; top: {top}px"
>
	{@render children()}
</div>

<style>
	.popover {
		position: fixed;
		z-index: 1000;
		background: var(--ed-surface-0);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-lg);
		box-shadow: var(--ed-shadow-xl);
		padding: 0;
		animation: popover-enter 150ms ease-out;
		transform-origin: top left;
	}

	@keyframes popover-enter {
		from { opacity: 0; transform: scale(0.96) translateY(-4px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}
</style>
