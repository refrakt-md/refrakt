<script lang="ts">
	import { onMount } from 'svelte';

	interface IconEntry {
		name: string;
		qualifiedName: string;
		group: string;
		svg: string;
	}

	interface Props {
		/** All icons from themeConfig.icons — Record<group, Record<name, svgString>> */
		icons: Record<string, Record<string, string>>;
		/** Current icon name (e.g., "rocket" or "hint/warning") */
		currentIcon: string;
		onchange: (newIconName: string) => void;
		onclose: () => void;
	}

	let { icons, currentIcon, onchange, onclose }: Props = $props();

	let searchInput: HTMLInputElement;
	let selectedIcon = $state(currentIcon);
	let search = $state('');

	const allIcons = $derived.by(() => {
		const entries: IconEntry[] = [];
		for (const [group, groupIcons] of Object.entries(icons)) {
			for (const [name, svg] of Object.entries(groupIcons)) {
				const qualifiedName = group === 'global' ? name : `${group}/${name}`;
				entries.push({ name, qualifiedName, group, svg });
			}
		}
		return entries;
	});

	const filtered = $derived(
		search
			? allIcons.filter(icon =>
				icon.name.toLowerCase().includes(search.toLowerCase()) ||
				icon.qualifiedName.toLowerCase().includes(search.toLowerCase())
			)
			: allIcons
	);

	const groupedFiltered = $derived.by(() => {
		const map = new Map<string, IconEntry[]>();
		for (const icon of filtered) {
			const list = map.get(icon.group) ?? [];
			list.push(icon);
			map.set(icon.group, list);
		}
		return map;
	});

	onMount(() => {
		searchInput?.focus();

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function selectIcon(icon: IconEntry) {
		selectedIcon = icon.qualifiedName;
	}

	function handleApply() {
		if (selectedIcon) {
			onchange(selectedIcon);
		}
	}
</script>

<div
	class="icon-picker-backdrop"
	onclick={handleBackdropClick}
	onkeydown={() => {}}
	role="dialog"
	aria-modal="true"
	aria-label="Select icon"
>
	<div class="icon-picker-modal">
		<!-- Header -->
		<div class="icon-picker-modal__header">
			<span class="icon-picker-modal__label">icon</span>
			<button class="icon-picker-modal__close" onclick={onclose} aria-label="Close">&times;</button>
		</div>

		<!-- Search -->
		<div class="icon-picker-modal__search">
			<input
				class="icon-picker-modal__search-input"
				type="text"
				placeholder="Search icons..."
				bind:value={search}
				bind:this={searchInput}
			/>
		</div>

		<!-- Icon grid -->
		<div class="icon-picker-modal__grid-area">
			{#if allIcons.length === 0}
				<div class="icon-picker-modal__empty">No icons available.</div>
			{:else if filtered.length === 0}
				<div class="icon-picker-modal__empty">No icons match "{search}"</div>
			{:else}
				{#each [...groupedFiltered] as [group, groupIcons] (group)}
					<div class="icon-picker-modal__group">
						<div class="icon-picker-modal__group-label">{group}</div>
						<div class="icon-picker-modal__grid">
							{#each groupIcons as icon (icon.qualifiedName)}
								<button
									class="icon-picker-modal__icon"
									class:selected={selectedIcon === icon.qualifiedName}
									onclick={() => selectIcon(icon)}
									title={icon.qualifiedName}
								>
									<span class="icon-picker-modal__icon-svg">{@html icon.svg}</span>
									<span class="icon-picker-modal__icon-name">{icon.name}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		<div class="icon-picker-modal__footer">
			<button
				class="icon-picker-modal__btn icon-picker-modal__btn--apply"
				onclick={handleApply}
				disabled={!selectedIcon}
			>Apply</button>
			<button
				class="icon-picker-modal__btn icon-picker-modal__btn--cancel"
				onclick={onclose}
			>Cancel</button>
		</div>
	</div>
</div>

<style>
	/* ── Backdrop ─────────────────────────────────────────── */

	.icon-picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
		animation: icon-picker-backdrop-in 120ms ease-out;
	}

	@keyframes icon-picker-backdrop-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* ── Modal ────────────────────────────────────────────── */

	.icon-picker-modal {
		z-index: 1101;
		display: flex;
		flex-direction: column;
		width: 90vw;
		max-width: 580px;
		max-height: 80vh;
		background: var(--ed-surface-0, #fff);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-lg, 8px);
		box-shadow: var(--ed-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1));
		animation: icon-picker-enter 120ms ease-out;
		overflow: hidden;
	}

	@keyframes icon-picker-enter {
		from { opacity: 0; transform: scale(0.97) translateY(8px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ── Header ──────────────────────────────────────────── */

	.icon-picker-modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
		border-bottom: 1px solid var(--ed-border-default, #e2e8f0);
	}

	.icon-picker-modal__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.icon-picker-modal__close {
		background: none;
		border: none;
		font-size: 18px;
		line-height: 1;
		color: var(--ed-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 4px;
	}

	.icon-picker-modal__close:hover {
		color: var(--ed-text-primary, #1a1a2e);
	}

	/* ── Search ──────────────────────────────────────────── */

	.icon-picker-modal__search {
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
	}

	.icon-picker-modal__search-input {
		width: 100%;
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-0, #fff);
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
	}

	.icon-picker-modal__search-input:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	/* ── Grid area ───────────────────────────────────────── */

	.icon-picker-modal__grid-area {
		flex: 1;
		overflow-y: auto;
		padding: 0 var(--ed-space-3, 0.75rem);
		min-height: 120px;
		max-height: 360px;
	}

	.icon-picker-modal__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 120px;
		color: var(--ed-text-muted, #94a3b8);
		font-size: var(--ed-text-sm, 13px);
	}

	/* ── Group ───────────────────────────────────────────── */

	.icon-picker-modal__group {
		margin-bottom: var(--ed-space-2, 0.5rem);
	}

	.icon-picker-modal__group-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: var(--ed-space-1, 0.25rem) 0;
		margin-bottom: var(--ed-space-1, 0.25rem);
	}

	.icon-picker-modal__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 6px;
	}

	/* ── Icon button ─────────────────────────────────────── */

	.icon-picker-modal__icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 8px 4px 6px;
		border: 2px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		background: var(--ed-surface-0, #fff);
		cursor: pointer;
		transition: border-color 100ms, background 100ms;
	}

	.icon-picker-modal__icon:hover {
		border-color: var(--ed-text-muted, #94a3b8);
		background: var(--ed-surface-1, #f8fafc);
	}

	.icon-picker-modal__icon.selected {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.3));
		background: var(--ed-accent-muted, rgba(59, 130, 246, 0.06));
	}

	.icon-picker-modal__icon-svg {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		color: var(--ed-text-secondary, #475569);
	}

	.icon-picker-modal__icon-svg :global(svg) {
		width: 100%;
		height: 100%;
	}

	.icon-picker-modal__icon-name {
		font-size: 9px;
		color: var(--ed-text-muted, #94a3b8);
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
		line-height: 1.2;
	}

	/* ── Footer ──────────────────────────────────────────── */

	.icon-picker-modal__footer {
		display: flex;
		gap: var(--ed-space-2, 0.5rem);
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
		border-top: 1px solid var(--ed-border-default, #e2e8f0);
	}

	.icon-picker-modal__btn {
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

	.icon-picker-modal__btn:hover:not(.icon-picker-modal__btn--apply):not(:disabled) {
		border-color: var(--ed-text-primary);
		color: var(--ed-text-primary);
	}

	.icon-picker-modal__btn--apply {
		background: var(--ed-text-primary);
		color: #ffffff;
		border-color: var(--ed-text-primary);
	}

	.icon-picker-modal__btn--apply:hover:not(:disabled) {
		background: var(--ed-text-secondary);
		border-color: var(--ed-text-secondary);
	}

	.icon-picker-modal__btn--apply:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
