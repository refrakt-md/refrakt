<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		anchorRect: DOMRect;
		dataName: string;
		text: string;
		onchange: (newText: string) => void;
		onclose: () => void;
	}

	let { anchorRect, dataName, text, onchange, onclose }: Props = $props();

	let popoverEl: HTMLDivElement;
	let inputEl: HTMLInputElement;
	let left = $state(0);
	let top = $state(0);
	let showAbove = $state(true);

	onMount(() => {
		// Position centered above the anchor by default
		const popoverRect = popoverEl.getBoundingClientRect();
		const popoverWidth = popoverRect.width;
		const popoverHeight = popoverRect.height;
		const gap = 8;

		// Horizontal: center on anchor
		let x = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
		// Clamp to viewport
		if (x < gap) x = gap;
		if (x + popoverWidth > window.innerWidth - gap) x = window.innerWidth - popoverWidth - gap;
		left = x;

		// Vertical: above anchor if room, else below
		const aboveY = anchorRect.top - popoverHeight - gap;
		if (aboveY >= gap) {
			top = aboveY;
			showAbove = true;
		} else {
			top = anchorRect.bottom + gap;
			showAbove = false;
		}

		// Focus the input
		inputEl?.focus();
		inputEl?.select();

		// Close handlers
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

		requestAnimationFrame(() => {
			document.addEventListener('mousedown', handleClickOutside);
		});
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function handleInput(e: Event) {
		onchange((e.target as HTMLInputElement).value);
	}
</script>

<div
	class="inline-edit-popover"
	class:above={showAbove}
	class:below={!showAbove}
	bind:this={popoverEl}
	style="left: {left}px; top: {top}px"
>
	<span class="inline-edit-popover__label">{dataName}</span>
	<input
		class="inline-edit-popover__input"
		type="text"
		value={text}
		oninput={handleInput}
		bind:this={inputEl}
	/>
</div>

<style>
	.inline-edit-popover {
		position: fixed;
		z-index: 1100;
		display: flex;
		align-items: center;
		gap: var(--ed-space-2, 0.5rem);
		background: var(--ed-surface-0, #fff);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-lg, 8px);
		box-shadow: var(--ed-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1));
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
		min-width: 240px;
		max-width: 480px;
		animation: inline-edit-enter 120ms ease-out;
	}

	.inline-edit-popover.above {
		transform-origin: bottom center;
	}

	.inline-edit-popover.below {
		transform-origin: top center;
	}

	@keyframes inline-edit-enter {
		from { opacity: 0; transform: scale(0.97) translateY(4px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	.inline-edit-popover__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.inline-edit-popover__input {
		flex: 1;
		min-width: 0;
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-0, #fff);
		outline: none;
		font-family: inherit;
		line-height: 1.6;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.inline-edit-popover__input:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}
</style>
