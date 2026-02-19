<script lang="ts">
	import type { ContentBlock } from './blocks.js';
	import type { PageStore } from './page.svelte.js';
	import BlockOutline from './BlockOutline.svelte';

	interface Props {
		blocks: ContentBlock[];
		messageIndex: number;
		messageContent: string;
		pageStore: PageStore;
	}

	let { blocks, messageIndex, messageContent, pageStore }: Props = $props();
	let outlineOpen = $state(false);
	let toolbarEl: HTMLElement;

	let runeCount = $derived(blocks.filter((b) => b.type === 'rune').length);

	let summary = $derived.by(() => {
		const parts: string[] = [];
		if (runeCount > 0) parts.push(`${runeCount} rune${runeCount !== 1 ? 's' : ''}`);
		const other = blocks.length - runeCount;
		if (other > 0) parts.push(`${other} block${other !== 1 ? 's' : ''}`);
		return parts.join(', ');
	});

	function toggleOutline() {
		outlineOpen = !outlineOpen;
	}

	function handlePinAll() {
		if (blocks.length === 0) return;
		pageStore.pinBlocks(
			messageIndex,
			blocks.map((b) => b.id),
			blocks,
			messageContent,
		);
	}

	function handlePinSelected(e: CustomEvent<{ blockIds: string[] }>) {
		const selected = blocks.filter((b) => e.detail.blockIds.includes(b.id));
		if (selected.length > 0) {
			pageStore.pinBlocks(
				messageIndex,
				selected.map((b) => b.id),
				selected,
				messageContent,
			);
		}
		outlineOpen = false;
	}

	function handleClose() {
		outlineOpen = false;
	}
</script>

{#if blocks.length > 0}
	<div class="message-toolbar" bind:this={toolbarEl}>
		<button
			class="toolbar-btn"
			onclick={toggleOutline}
			aria-expanded={outlineOpen}
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
				<path d="M2 3h12M2 6.5h8M2 10h10M2 13.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
			<span class="toolbar-label">{summary}</span>
			<svg class="toolbar-chevron" class:toolbar-chevron--open={outlineOpen} width="10" height="10" viewBox="0 0 16 16" fill="none">
				<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>

		<button
			class="toolbar-btn toolbar-btn--pin"
			onclick={handlePinAll}
			title="Pin all blocks to page"
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
				<path d="M8 1.5v9M4.5 7l3.5 3.5L11.5 7M3 13.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<span class="toolbar-label">Pin all</span>
		</button>

		{#if outlineOpen}
			<BlockOutline
				{blocks}
				{messageIndex}
				onpin={handlePinSelected}
				onclose={handleClose}
			/>
		{/if}
	</div>
{/if}

<style>
	.message-toolbar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
		margin-bottom: 0.5rem;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		font-size: 0.75rem;
		line-height: 1;
		font-family: inherit;
		transition: background 0.1s, color 0.1s;
	}

	.toolbar-btn:hover {
		background: var(--rf-color-surface-alt, #f8fafc);
		color: var(--rf-color-text, #1e293b);
	}

	.toolbar-label {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.toolbar-chevron {
		transition: transform 0.15s ease;
	}

	.toolbar-chevron--open {
		transform: rotate(180deg);
	}

	.toolbar-btn--pin {
		color: var(--rf-color-text-muted, #94a3b8);
	}

	.toolbar-btn--pin:hover {
		color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-primary-50, #f0f9ff);
	}
</style>
