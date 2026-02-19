<script lang="ts">
	import { onMount } from 'svelte';
	import { getBlockIcon, type ContentBlock } from './blocks.js';

	interface Props {
		blocks: ContentBlock[];
		messageIndex: number;
		onpin: (e: CustomEvent<{ blockIds: string[] }>) => void;
		onclose: () => void;
	}

	let { blocks, messageIndex, onpin, onclose }: Props = $props();
	let selected = $state(new Set<string>());
	let popoverEl: HTMLElement;

	let allSelected = $derived(selected.size === blocks.length && blocks.length > 0);

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selected = next;
	}

	function toggleAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			selected = new Set(blocks.map((b) => b.id));
		}
	}

	function handlePin() {
		if (selected.size === 0) return;
		onpin(new CustomEvent('pin', { detail: { blockIds: [...selected] } }));
		selected = new Set();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (popoverEl && !popoverEl.contains(e.target as Node)) {
			onclose();
		}
	}

	onMount(() => {
		// Delay listener to avoid catching the opening click
		const timer = setTimeout(() => {
			document.addEventListener('click', handleClickOutside, true);
		}, 10);
		document.addEventListener('keydown', handleKeydown);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="block-outline" bind:this={popoverEl} role="dialog" aria-label="Block outline for message {messageIndex + 1}">
	<div class="outline-header">
		<span class="outline-count">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
		<button class="outline-toggle-all" onclick={toggleAll}>
			{allSelected ? 'Deselect all' : 'Select all'}
		</button>
	</div>

	<ul class="outline-list">
		{#each blocks as block}
			<li class="outline-item">
				<label class="outline-label">
					<input
						type="checkbox"
						checked={selected.has(block.id)}
						onchange={() => toggle(block.id)}
						aria-label={block.label}
					/>
					<span class="outline-icon" data-type={block.type}>{getBlockIcon(block.type)}</span>
					<span class="outline-text">{block.label}</span>
				</label>
			</li>
		{/each}
	</ul>

	<div class="outline-footer">
		<button
			class="outline-pin-btn"
			disabled={selected.size === 0}
			onclick={handlePin}
		>
			Pin {selected.size > 0 ? selected.size : ''} selected
		</button>
	</div>
</div>

<style>
	.block-outline {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 0.25rem;
		width: 280px;
		max-height: 400px;
		background: var(--rf-color-surface, #ffffff);
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
		z-index: 10000;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.outline-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.outline-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--rf-color-text-muted, #64748b);
	}

	.outline-toggle-all {
		font-size: 0.6875rem;
		color: var(--rf-color-primary, #0ea5e9);
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		padding: 0;
	}

	.outline-toggle-all:hover {
		text-decoration: underline;
	}

	.outline-list {
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		overflow-y: auto;
		flex: 1;
	}

	.outline-item {
		margin: 0;
		padding: 0;
	}

	.outline-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		cursor: pointer;
		font-size: 0.8125rem;
		transition: background 0.1s;
	}

	.outline-label:hover {
		background: var(--rf-color-surface-alt, #f8fafc);
	}

	.outline-label input[type='checkbox'] {
		margin: 0;
		flex-shrink: 0;
	}

	.outline-icon {
		flex-shrink: 0;
		width: 1.25rem;
		text-align: center;
		font-size: 0.75rem;
		color: var(--rf-color-text-muted, #94a3b8);
	}

	.outline-icon[data-type='rune'] {
		color: var(--rf-color-primary, #0ea5e9);
	}

	.outline-icon[data-type='heading'] {
		font-weight: 700;
		color: var(--rf-color-text, #1e293b);
	}

	.outline-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--rf-color-text, #1e293b);
	}

	.outline-footer {
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.outline-pin-btn {
		width: 100%;
		padding: 0.375rem 0.75rem;
		background: var(--rf-color-primary, #0ea5e9);
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, opacity 0.15s;
	}

	.outline-pin-btn:hover:not(:disabled) {
		background: var(--rf-color-primary-600, #0284c7);
	}

	.outline-pin-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
