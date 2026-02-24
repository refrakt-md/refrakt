<script lang="ts">
	import { themeState } from './state/theme.svelte.js';
	import HintIconEditor from './icons/HintIconEditor.svelte';
	import GlobalIconBrowser from './icons/GlobalIconBrowser.svelte';

	let { onclose }: { onclose: () => void } = $props();
	let mode: 'hint' | 'global' = $state('hint');

	let overrideCount = $derived(() => {
		let count = 0;
		for (const group of Object.values(themeState.iconOverrides)) {
			count += Object.keys(group).length;
		}
		return count;
	});
</script>

<div class="icon-panel">
	<div class="editor-header">
		<h3>Icons</h3>
		{#if overrideCount() > 0}
			<span class="badge">{overrideCount()}</span>
		{/if}
		<button class="close-btn" onclick={onclose} title="Close">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div class="mode-tabs">
		<button
			class="mode-tab"
			class:active={mode === 'hint'}
			onclick={() => (mode = 'hint')}
		>
			Hint Icons
		</button>
		<button
			class="mode-tab"
			class:active={mode === 'global'}
			onclick={() => (mode = 'global')}
		>
			Global Library
		</button>
	</div>

	<div class="panel-content">
		{#if mode === 'hint'}
			<HintIconEditor />
		{:else}
			<GlobalIconBrowser />
		{/if}
	</div>
</div>

<style>
	.icon-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.editor-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-bottom: 1px solid #e5e5e5;
		flex-shrink: 0;
	}

	.editor-header h3 {
		font-size: 14px;
		font-weight: 700;
		margin: 0;
		color: #1a1a2e;
	}

	.badge {
		font-size: 11px;
		font-weight: 600;
		background: #0ea5e9;
		color: white;
		padding: 1px 6px;
		border-radius: 10px;
	}

	.close-btn {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: none;
		cursor: pointer;
		color: #999;
		border-radius: 4px;
	}

	.close-btn:hover {
		background: #f0f0f0;
		color: #333;
	}

	.mode-tabs {
		display: flex;
		gap: 0;
		padding: 0 16px;
		border-bottom: 1px solid #e5e5e5;
		flex-shrink: 0;
	}

	.mode-tab {
		padding: 8px 12px;
		border: none;
		background: none;
		font-size: 12px;
		font-weight: 600;
		color: #999;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
	}

	.mode-tab:hover {
		color: #555;
	}

	.mode-tab.active {
		color: #1a1a2e;
		border-bottom-color: #0ea5e9;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 12px 16px;
	}
</style>
