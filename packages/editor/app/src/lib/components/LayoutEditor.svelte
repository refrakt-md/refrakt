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
		<button
			class="layout-editor__mode-toggle"
			class:active={rawMode}
			onclick={() => { rawMode = !rawMode; }}
		>
			{rawMode ? 'Visual' : 'Raw'}
		</button>
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
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
		flex-shrink: 0;
	}

	.layout-editor__title-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.layout-editor__icon {
		color: #d97706;
		flex-shrink: 0;
	}

	.layout-editor__title {
		font-size: 0.8rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.layout-editor__path {
		font-size: 0.7rem;
		color: #94a3b8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.layout-editor__mode-toggle {
		font-size: 0.7rem;
		padding: 0.2rem 0.6rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		background: #ffffff;
		color: #64748b;
		cursor: pointer;
		flex-shrink: 0;
	}

	.layout-editor__mode-toggle:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.layout-editor__mode-toggle.active {
		background: #0ea5e9;
		color: #ffffff;
		border-color: #0ea5e9;
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
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: #f8fafc;
	}

	.layout-editor__empty {
		text-align: center;
		padding: 2rem 1rem;
		color: #94a3b8;
		font-size: 0.85rem;
	}

	.layout-editor__empty p {
		margin: 0;
	}

	.layout-editor__add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.5rem 1rem;
		border: 1px dashed #e2e8f0;
		border-radius: 6px;
		background: none;
		color: #94a3b8;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.layout-editor__add-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}
</style>
