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

	/** Map labels to inline SVG icon paths */
	function getIcon(label: string): string | null {
		switch (label) {
			case 'Rename': return 'M12.5 3.5l-9 9L2 16l3.5-1.5 9-9zM10.5 5.5l2 2';
			case 'Duplicate': return 'M5 3h6l3 3v7H5zM3 6v9h8';
			case 'Delete': return 'M3 5h12M6 5V3h6v2M5 5v9h8V5';
			case 'Publish':
			case 'Set as Draft': return 'M2 8h5v6H2zM9 4h5v10H9z';
			default: return null;
		}
	}

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
		{@const icon = getIcon(item.label)}
		<button
			class="context-menu__item"
			class:danger={item.danger}
			onclick={() => handleItemClick(item.action)}
		>
			{#if icon}
				<svg class="context-menu__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
					<path d={icon} />
				</svg>
			{/if}
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
		min-width: 160px;
		animation: ctx-enter 120ms ease-out;
		transform-origin: top left;
	}

	@keyframes ctx-enter {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}

	.context-menu__item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: var(--ed-space-2) var(--ed-space-3);
		font-size: var(--ed-text-sm);
		color: var(--ed-text-primary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		border-radius: var(--ed-radius-sm);
		transition: background var(--ed-transition-fast);
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

	.context-menu__icon {
		flex-shrink: 0;
		opacity: 0.6;
	}

	.context-menu__item.danger .context-menu__icon {
		opacity: 0.8;
	}
</style>
