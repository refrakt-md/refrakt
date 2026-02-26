<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import {
		parseLayoutClient, serializeLayout,
		type ParsedLayout, type ParsedRegion,
	} from '../utils/layout-parser.js';
	import RegionCard from './RegionCard.svelte';
	import MarkdownEditor from './MarkdownEditor.svelte';

	let rawMode = $state(false);
	let layout: ParsedLayout = $state({ regions: [] });

	// Parse the editor content into regions when it changes externally
	// (e.g., file switch or save)
	let lastParsedFrom = '';

	$effect(() => {
		const content = editorState.editorContent;
		if (content !== lastParsedFrom) {
			layout = parseLayoutClient(content);
			lastParsedFrom = content;
		}
	});

	function syncToEditor() {
		const serialized = serializeLayout(layout);
		lastParsedFrom = serialized;
		editorState.editorContent = serialized;
		editorState.bodyContent = serialized;
	}

	function handleRegionChange(idx: number, region: ParsedRegion) {
		layout.regions[idx] = region;
		layout = { ...layout };
		syncToEditor();
	}

	function handleRegionDelete(idx: number) {
		layout.regions.splice(idx, 1);
		layout = { ...layout };
		syncToEditor();
	}

	function handleAddRegion() {
		layout.regions.push({ name: '', mode: 'replace', content: '' });
		layout = { ...layout };
		syncToEditor();
	}
</script>

<div class="layout-editor">
	<div class="layout-editor__header">
		<div class="layout-editor__title-row">
			<svg class="layout-editor__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
				<rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.2"/>
				<path d="M1 5h14M6 5v10" stroke="currentColor" stroke-width="1.2"/>
			</svg>
			<span class="layout-editor__title">Layout</span>
			{#if editorState.currentPath}
				<span class="layout-editor__path">{editorState.currentPath}</span>
			{/if}
		</div>
		<div class="layout-editor__mode-track">
			<button
				class="layout-editor__mode-btn"
				class:active={!rawMode}
				onclick={() => { rawMode = false; }}
			>Visual</button>
			<button
				class="layout-editor__mode-btn"
				class:active={rawMode}
				onclick={() => { rawMode = true; }}
			>Raw</button>
		</div>
	</div>

	{#if rawMode}
		<div class="layout-editor__raw">
			<MarkdownEditor />
		</div>
	{:else}
		<div class="layout-editor__regions">
			{#if layout.regions.length === 0}
				<div class="layout-editor__empty">
					<p>No regions defined. Add a region to get started.</p>
				</div>
			{/if}

			{#each layout.regions as region, idx}
				<RegionCard
					{region}
					onchange={(r) => handleRegionChange(idx, r)}
					ondelete={() => handleRegionDelete(idx)}
				/>
			{/each}

			<button class="layout-editor__add-btn" onclick={handleAddRegion}>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				Add Region
			</button>
		</div>
	{/if}
</div>

<style>
	.layout-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.layout-editor__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--ed-space-2) var(--ed-space-3);
		border-bottom: 1px solid var(--ed-border-default);
		background: var(--ed-surface-1);
		flex-shrink: 0;
	}

	.layout-editor__title-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.layout-editor__icon {
		color: var(--ed-warning);
		flex-shrink: 0;
	}

	.layout-editor__title {
		font-size: var(--ed-text-base);
		font-weight: 600;
		color: var(--ed-text-primary);
	}

	.layout-editor__path {
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.layout-editor__mode-track {
		display: inline-flex;
		background: var(--ed-surface-2);
		border-radius: var(--ed-radius-md);
		padding: 2px;
		gap: 2px;
		flex-shrink: 0;
	}

	.layout-editor__mode-btn {
		font-size: var(--ed-text-xs);
		padding: 0.15rem var(--ed-space-2);
		border: none;
		border-radius: calc(var(--ed-radius-md) - 2px);
		background: transparent;
		color: var(--ed-text-tertiary);
		cursor: pointer;
		font-weight: 500;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.layout-editor__mode-btn:hover:not(.active) {
		color: var(--ed-text-secondary);
	}

	.layout-editor__mode-btn.active {
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		box-shadow: var(--ed-shadow-sm);
	}

	.layout-editor__raw {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.layout-editor__regions {
		flex: 1;
		overflow-y: auto;
		padding: var(--ed-space-3);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		background: var(--ed-surface-1);
	}

	.layout-editor__empty {
		text-align: center;
		padding: 2rem var(--ed-space-4);
		color: var(--ed-text-muted);
		font-size: var(--ed-text-md);
	}

	.layout-editor__empty p {
		margin: 0;
	}

	.layout-editor__add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: var(--ed-space-2) var(--ed-space-4);
		border: 1px dashed var(--ed-border-default);
		border-radius: var(--ed-radius-md);
		background: none;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-base);
		cursor: pointer;
	}

	.layout-editor__add-btn:hover {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}
</style>
