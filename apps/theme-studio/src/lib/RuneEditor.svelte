<script lang="ts">
	import { themeState } from './state/theme.svelte.js';
	import { generateCssState } from './state/generate-css.svelte.js';
	import { contracts, getRuneNames, formatContractForPrompt } from './contracts.js';
	import type { RuneContract } from './contracts.js';
	import CssEditor from './CssEditor.svelte';

	let { onclose }: { onclose: () => void } = $props();

	let selectedRune = $state('');
	let cssPrompt = $state('');
	const runeNames = getRuneNames();

	let currentContract: RuneContract | undefined = $derived(
		selectedRune ? contracts.runes[selectedRune] : undefined,
	);

	let currentBlock = $derived(currentContract?.block ?? '');

	let cssValue = $derived(
		currentBlock ? (themeState.runeOverrides[currentBlock] ?? '') : '',
	);

	function handleCssChange(css: string) {
		if (currentBlock) {
			themeState.updateRuneOverride(currentBlock, css);
		}
	}

	function handleClear() {
		if (currentBlock) {
			themeState.removeRuneOverride(currentBlock);
		}
	}

	function handleGenerate() {
		if (!cssPrompt.trim() || !selectedRune || !currentContract) return;
		generateCssState.generate(cssPrompt, selectedRune, currentContract);
		cssPrompt = '';
	}

	/** Count of runes that have CSS overrides */
	let overrideCount = $derived(
		Object.values(themeState.runeOverrides).filter((css) => css.trim()).length,
	);
</script>

<div class="rune-editor">
	<div class="editor-header">
		<h3>Rune CSS</h3>
		{#if overrideCount > 0}
			<span class="badge">{overrideCount}</span>
		{/if}
		<button class="close-btn" onclick={onclose} title="Close">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div class="rune-select">
		<select bind:value={selectedRune}>
			<option value="">Select a rune...</option>
			{#each runeNames as name}
				{@const contract = contracts.runes[name]}
				{@const hasOverride = themeState.runeOverrides[contract.block]?.trim()}
				<option value={name}>
					{name} (.rf-{contract.block}){hasOverride ? ' *' : ''}
				</option>
			{/each}
		</select>
	</div>

	{#if currentContract}
		<details class="selector-ref">
			<summary>Available selectors</summary>
			<pre>{formatContractForPrompt(currentContract)}</pre>
		</details>

		<div class="css-input">
			<CssEditor
				value={cssValue}
				onchange={handleCssChange}
				placeholder={`.rf-${currentBlock} {\n  /* your overrides */\n}`}
			/>
		</div>

		<div class="ai-prompt">
			<div class="prompt-row">
				<input
					type="text"
					bind:value={cssPrompt}
					placeholder="Describe the CSS you want..."
					onkeydown={(e) => e.key === 'Enter' && handleGenerate()}
					disabled={generateCssState.isGenerating}
				/>
				<button
					class="generate-btn"
					onclick={handleGenerate}
					disabled={generateCssState.isGenerating || !cssPrompt.trim()}
				>
					{generateCssState.isGenerating ? 'Generating...' : 'Generate'}
				</button>
			</div>
			{#if generateCssState.isGenerating}
				<div class="stream-status">
					Streaming... ({generateCssState.streamedText.length} chars)
				</div>
			{/if}
			{#if generateCssState.status === 'error'}
				<div class="gen-error">
					{generateCssState.error}
					<button onclick={() => generateCssState.dismiss()}>Dismiss</button>
				</div>
			{/if}
		</div>

		<div class="editor-actions">
			{#if cssValue.trim()}
				<button class="clear-btn" onclick={handleClear}>Clear</button>
			{/if}
		</div>
	{:else}
		<div class="empty">Select a rune above to customize its CSS.</div>
	{/if}
</div>

<style>
	.rune-editor {
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

	.rune-select {
		padding: 12px 16px;
		flex-shrink: 0;
	}

	.rune-select select {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		font-size: 13px;
		background: white;
		color: #333;
	}

	.selector-ref {
		margin: 0 16px;
		flex-shrink: 0;
	}

	.selector-ref summary {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
		cursor: pointer;
		padding: 4px 0;
	}

	.selector-ref pre {
		font-size: 11px;
		line-height: 1.5;
		background: #f5f5f5;
		padding: 8px 10px;
		border-radius: 6px;
		overflow-x: auto;
		max-height: 160px;
		overflow-y: auto;
		margin: 4px 0 8px;
		color: #555;
	}

	.css-input {
		flex: 1;
		padding: 0 16px;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.ai-prompt {
		padding: 8px 16px;
		flex-shrink: 0;
	}

	.prompt-row {
		display: flex;
		gap: 6px;
	}

	.prompt-row input {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		font-size: 12px;
		background: white;
		color: #333;
	}

	.prompt-row input:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.generate-btn {
		padding: 6px 12px;
		border: 1px solid #0ea5e9;
		border-radius: 6px;
		background: #0ea5e9;
		color: white;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.generate-btn:hover:not(:disabled) {
		background: #0284c7;
		border-color: #0284c7;
	}

	.generate-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.stream-status {
		font-size: 11px;
		color: #0ea5e9;
		margin-top: 4px;
	}

	.gen-error {
		font-size: 11px;
		color: #ef4444;
		margin-top: 4px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.gen-error button {
		border: none;
		background: none;
		color: #999;
		cursor: pointer;
		font-size: 11px;
		text-decoration: underline;
	}

	.editor-actions {
		padding: 12px 16px;
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.clear-btn {
		padding: 4px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		color: #999;
	}

	.clear-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 13px;
		padding: 24px;
		text-align: center;
	}
</style>
