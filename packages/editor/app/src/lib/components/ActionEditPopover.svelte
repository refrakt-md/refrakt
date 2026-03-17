<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		anchorRect: DOMRect;
		text: string;
		href: string;
		onchange: (newText: string, newHref: string) => void;
		onremove: () => void;
		onclose: () => void;
	}

	let { anchorRect, text, href, onchange, onremove, onclose }: Props = $props();

	let popoverEl: HTMLDivElement;
	let textInput: HTMLInputElement;
	let left = $state(0);
	let top = $state(0);
	let showAbove = $state(true);

	let editText = $state(text);
	let editHref = $state(href);

	onMount(() => {
		// Position centered above the anchor by default
		const popoverRect = popoverEl.getBoundingClientRect();
		const popoverWidth = popoverRect.width;
		const popoverHeight = popoverRect.height;
		const gap = 8;

		// Horizontal: center on anchor
		let x = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
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

		// Focus the text input
		textInput?.focus();
		textInput?.select();

		// Close handlers
		function handleClickOutside(e: MouseEvent) {
			if (popoverEl && !popoverEl.contains(e.target as Node)) {
				applyAndClose();
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

	function applyAndClose() {
		if (editText !== text || editHref !== href) {
			onchange(editText, editHref);
		}
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			applyAndClose();
		}
	}
</script>

<div
	class="action-edit-popover"
	class:above={showAbove}
	class:below={!showAbove}
	bind:this={popoverEl}
	style="left: {left}px; top: {top}px"
>
	<div class="action-edit-popover__header">
		<span class="action-edit-popover__label">action</span>
		<button class="action-edit-popover__close" onclick={onclose} aria-label="Close">&times;</button>
	</div>

	<div class="action-edit-popover__row">
		<label class="action-edit-popover__field-label">Text</label>
		<input
			class="action-edit-popover__input"
			type="text"
			bind:value={editText}
			bind:this={textInput}
			onkeydown={handleKeydown}
		/>
	</div>
	<div class="action-edit-popover__row">
		<label class="action-edit-popover__field-label">URL</label>
		<input
			class="action-edit-popover__input"
			type="text"
			bind:value={editHref}
			onkeydown={handleKeydown}
			placeholder="https://..."
		/>
	</div>
	<div class="action-edit-popover__actions">
		<button class="action-edit-popover__btn action-edit-popover__btn--apply" onclick={applyAndClose}>Apply</button>
		<button class="action-edit-popover__btn action-edit-popover__btn--remove" onclick={onremove}>Remove</button>
	</div>
</div>

<style>
	.action-edit-popover {
		position: fixed;
		z-index: 1100;
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-1, 0.25rem);
		background: var(--ed-surface-0, #fff);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-lg, 8px);
		box-shadow: var(--ed-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1));
		padding: var(--ed-space-2, 0.5rem);
		min-width: 280px;
		max-width: 420px;
		animation: action-edit-enter 120ms ease-out;
	}

	.action-edit-popover.above {
		transform-origin: bottom center;
	}

	.action-edit-popover.below {
		transform-origin: top center;
	}

	@keyframes action-edit-enter {
		from { opacity: 0; transform: scale(0.97) translateY(4px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ── Header ──────────────────────────────────────────── */

	.action-edit-popover__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--ed-space-1, 0.25rem);
	}

	.action-edit-popover__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.action-edit-popover__close {
		background: none;
		border: none;
		font-size: 18px;
		line-height: 1;
		color: var(--ed-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 4px;
	}

	.action-edit-popover__close:hover {
		color: var(--ed-text-primary, #1a1a2e);
	}

	/* ── Rows ────────────────────────────────────────────── */

	.action-edit-popover__row {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2, 0.5rem);
	}

	.action-edit-popover__field-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		width: 32px;
		flex-shrink: 0;
	}

	.action-edit-popover__input {
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
		line-height: 1.4;
	}

	.action-edit-popover__input:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	/* ── Actions ─────────────────────────────────────────── */

	.action-edit-popover__actions {
		display: flex;
		gap: var(--ed-space-2, 0.5rem);
		margin-top: var(--ed-space-1, 0.25rem);
	}

	.action-edit-popover__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--ed-space-2);
		height: 28px;
		padding: 0 var(--ed-space-3);
		border: 1px solid var(--ed-text-secondary);
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), border-color var(--ed-transition-fast);
		white-space: nowrap;
	}

	.action-edit-popover__btn:hover:not(.action-edit-popover__btn--apply):not(:disabled) {
		border-color: var(--ed-text-primary);
		color: var(--ed-text-primary);
	}

	.action-edit-popover__btn--apply {
		background: var(--ed-text-primary);
		color: #ffffff;
		border-color: var(--ed-text-primary);
	}

	.action-edit-popover__btn--apply:hover:not(:disabled) {
		background: var(--ed-text-secondary);
		border-color: var(--ed-text-secondary);
	}
</style>
