<script lang="ts">
	import type { ParsedRegion } from '../utils/layout-parser.js';
	import { containsNav } from '../utils/layout-parser.js';
	import NavEditor from './NavEditor.svelte';

	interface Props {
		region: ParsedRegion;
		onchange: (region: ParsedRegion) => void;
		ondelete: () => void;
	}

	let { region, onchange, ondelete }: Props = $props();

	let showNavEditor = $state(false);
	let hasNav = $derived(containsNav(region.content));

	function handleNameChange(e: Event) {
		const input = e.target as HTMLInputElement;
		onchange({ ...region, name: input.value });
	}

	function handleModeChange(mode: ParsedRegion['mode']) {
		onchange({ ...region, mode });
	}

	function handleContentChange(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		onchange({ ...region, content: textarea.value });
	}

	function handleNavChange(newContent: string) {
		onchange({ ...region, content: newContent });
	}

	function handleDeleteClick() {
		if (region.content.trim()) {
			if (!confirm(`Delete region "${region.name}"? Its content will be lost.`)) return;
		}
		ondelete();
	}

	// Auto-resize textarea
	function autoResize(textarea: HTMLTextAreaElement) {
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}

	function handleTextareaInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		autoResize(textarea);
		handleContentChange(e);
	}
</script>

<div class="region-card">
	<div class="region-card__header">
		<div class="region-card__name-row">
			<input
				class="region-card__name"
				type="text"
				value={region.name}
				oninput={handleNameChange}
				placeholder="Region name"
			/>
			<div class="region-card__mode">
				{#each ['replace', 'prepend', 'append'] as mode}
					<button
						class="region-card__mode-btn"
						class:active={region.mode === mode}
						onclick={() => handleModeChange(mode as ParsedRegion['mode'])}
					>
						{mode}
					</button>
				{/each}
			</div>
		</div>
		<div class="region-card__actions">
			{#if hasNav}
				<button
					class="region-card__toggle-btn"
					class:active={showNavEditor}
					onclick={() => { showNavEditor = !showNavEditor; }}
				>
					{showNavEditor ? 'Text' : 'Visual'}
				</button>
			{/if}
			<button
				class="region-card__delete-btn"
				onclick={handleDeleteClick}
				title="Delete region"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
	</div>

	<div class="region-card__body">
		{#if hasNav && showNavEditor}
			<NavEditor content={region.content} onchange={handleNavChange} />
		{:else}
			<textarea
				class="region-card__textarea"
				value={region.content}
				oninput={handleTextareaInput}
				placeholder="Region content..."
				rows="4"
				use:autoResize
			></textarea>
		{/if}
	</div>
</div>

<style>
	.region-card {
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		background: #ffffff;
		overflow: hidden;
	}

	.region-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
		gap: 0.5rem;
	}

	.region-card__name-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.region-card__name {
		font-size: 0.8rem;
		font-weight: 600;
		color: #1a1a2e;
		border: 1px solid transparent;
		border-radius: 3px;
		padding: 0.15rem 0.35rem;
		background: transparent;
		outline: none;
		min-width: 80px;
		max-width: 160px;
	}

	.region-card__name:focus {
		border-color: #0ea5e9;
		background: #ffffff;
	}

	.region-card__mode {
		display: flex;
		gap: 1px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.region-card__mode-btn {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border: none;
		background: #f1f5f9;
		color: #64748b;
		cursor: pointer;
		text-transform: capitalize;
	}

	.region-card__mode-btn:hover {
		background: #e2e8f0;
	}

	.region-card__mode-btn.active {
		background: #0ea5e9;
		color: #ffffff;
	}

	.region-card__actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.region-card__toggle-btn {
		font-size: 0.65rem;
		padding: 0.15rem 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 3px;
		background: #ffffff;
		color: #64748b;
		cursor: pointer;
	}

	.region-card__toggle-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.region-card__toggle-btn.active {
		background: #0ea5e9;
		color: #ffffff;
		border-color: #0ea5e9;
	}

	.region-card__delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		background: none;
		color: #94a3b8;
		cursor: pointer;
		border-radius: 3px;
	}

	.region-card__delete-btn:hover {
		background: #fef2f2;
		color: #ef4444;
	}

	.region-card__body {
		padding: 0;
	}

	.region-card__textarea {
		width: 100%;
		min-height: 80px;
		padding: 0.75rem;
		border: none;
		outline: none;
		resize: none;
		font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		color: #1a1a2e;
		background: transparent;
	}

	.region-card__textarea::placeholder {
		color: #94a3b8;
	}
</style>
