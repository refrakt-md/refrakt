<script lang="ts">
	import { onMount } from 'svelte';

	interface MenuItem {
		label: string;
		action: () => void;
		danger?: boolean;
	}

	interface Props {
		x: number;
		y: number;
		items: MenuItem[];
		onclose: () => void;
	}

	let { x, y, items, onclose }: Props = $props();

	let menuEl: HTMLDivElement;

	// Adjust position if menu overflows viewport
	let adjustedX = $state(x);
	let adjustedY = $state(y);

	onMount(() => {
		if (menuEl) {
			const rect = menuEl.getBoundingClientRect();
			if (rect.right > window.innerWidth) {
				adjustedX = window.innerWidth - rect.width - 4;
			}
			if (rect.bottom > window.innerHeight) {
				adjustedY = window.innerHeight - rect.height - 4;
			}
		}

		function handleClickOutside(e: MouseEvent) {
			if (menuEl && !menuEl.contains(e.target as Node)) {
				onclose();
			}
		}

		// Delay to avoid catching the same right-click event
		requestAnimationFrame(() => {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('contextmenu', handleClickOutside);
		});

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('contextmenu', handleClickOutside);
		};
	});

	function handleItemClick(action: () => void) {
		action();
		onclose();
	}
</script>

<div
	class="context-menu"
	bind:this={menuEl}
	style="left: {adjustedX}px; top: {adjustedY}px"
>
	{#each items as item}
		<button
			class="context-menu__item"
			class:danger={item.danger}
			onclick={() => handleItemClick(item.action)}
		>
			{item.label}
		</button>
	{/each}
</div>

<style>
	.context-menu {
		position: fixed;
		z-index: 1000;
		background: var(--ed-surface-0);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-md);
		box-shadow: var(--ed-shadow-lg);
		padding: var(--ed-space-1);
		min-width: 140px;
	}

	.context-menu__item {
		display: block;
		width: 100%;
		padding: 0.35rem 0.6rem;
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		border-radius: var(--ed-radius-sm);
	}

	.context-menu__item:hover {
		background: var(--ed-surface-2);
	}

	.context-menu__item.danger {
		color: var(--ed-danger);
	}

	.context-menu__item.danger:hover {
		background: var(--ed-danger-subtle);
	}
</style>
