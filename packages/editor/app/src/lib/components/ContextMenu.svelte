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
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
		padding: 0.25rem;
		min-width: 140px;
	}

	.context-menu__item {
		display: block;
		width: 100%;
		padding: 0.35rem 0.6rem;
		font-size: 0.8rem;
		color: #1a1a2e;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		border-radius: 4px;
	}

	.context-menu__item:hover {
		background: #f1f5f9;
	}

	.context-menu__item.danger {
		color: #ef4444;
	}

	.context-menu__item.danger:hover {
		background: #fef2f2;
	}
</style>
