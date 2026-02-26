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
		background: transparent;
	}

	.region-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--ed-space-2) 0;
		background: transparent;
		border-bottom: 1px solid var(--ed-border-default);
		gap: var(--ed-space-2);
	}

	.region-card__name-row {
		display: flex;
		align-items: center;
		gap: var(--ed-space-3);
		flex: 1;
		min-width: 0;
	}

	.region-card__name {
		font-size: var(--ed-text-base);
		font-weight: 600;
		color: var(--ed-text-primary);
		border: 1px solid transparent;
		border-radius: var(--ed-radius-sm);
		padding: 0.15rem 0.35rem;
		background: transparent;
		outline: none;
		min-width: 80px;
		max-width: 160px;
	}

	.region-card__name:focus {
		border-color: var(--ed-accent);
		background: var(--ed-surface-0);
	}

	.region-card__mode {
		display: flex;
		gap: 1px;
		background: var(--ed-surface-3);
		border-radius: var(--ed-radius-sm);
		overflow: hidden;
		flex-shrink: 0;
	}

	.region-card__mode-btn {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border: none;
		background: var(--ed-surface-2);
		color: var(--ed-text-tertiary);
		cursor: pointer;
		text-transform: capitalize;
	}

	.region-card__mode-btn:hover {
		background: var(--ed-surface-3);
	}

	.region-card__mode-btn.active {
		background: var(--ed-accent);
		color: #ffffff;
	}

	.region-card__actions {
		display: flex;
		align-items: center;
		gap: var(--ed-space-1);
		flex-shrink: 0;
	}

	.region-card__toggle-btn {
		font-size: 0.65rem;
		padding: 0.15rem var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
		cursor: pointer;
	}

	.region-card__toggle-btn:hover {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	.region-card__toggle-btn.active {
		background: var(--ed-accent);
		color: #ffffff;
		border-color: var(--ed-accent);
	}

	.region-card__delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		background: none;
		color: var(--ed-text-muted);
		cursor: pointer;
		border-radius: var(--ed-radius-sm);
	}

	.region-card__delete-btn:hover {
		background: var(--ed-danger-subtle);
		color: var(--ed-danger);
	}

	.region-card__body {
		padding: 0;
	}

	.region-card__textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--ed-space-3);
		border: none;
		outline: none;
		resize: none;
		font-family: var(--ed-font-mono);
		font-size: var(--ed-text-base);
		line-height: 1.5;
		color: var(--ed-text-primary);
		background: transparent;
	}

	.region-card__textarea::placeholder {
		color: var(--ed-text-muted);
	}
</style>
