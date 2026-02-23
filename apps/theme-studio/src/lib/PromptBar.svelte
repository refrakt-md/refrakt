<script lang="ts">
	import { generateState } from './state/generate.svelte.js';

	let prompt = $state('');

	function handleSubmit() {
		const text = prompt.trim();
		if (!text || generateState.isGenerating) return;
		prompt = '';
		generateState.generate(text);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="prompt-bar">
	{#if generateState.status === 'streaming'}
		<div class="streaming-indicator">
			<span class="dot-pulse"></span>
			<span>Generating theme...</span>
			<button class="cancel-btn" onclick={() => generateState.cancel()}>Cancel</button>
		</div>
	{:else if generateState.status === 'error'}
		<div class="error-bar">
			<span>{generateState.error}</span>
			<button class="dismiss-btn" onclick={() => generateState.dismiss()}>Dismiss</button>
		</div>
	{:else}
		<div class="input-row">
			<input
				type="text"
				bind:value={prompt}
				onkeydown={handleKeydown}
				placeholder="Describe a theme... (e.g., 'warm sunset colors with rounded corners')"
				disabled={generateState.isGenerating}
			/>
			<button
				class="generate-btn"
				onclick={handleSubmit}
				disabled={!prompt.trim() || generateState.isGenerating}
			>
				Generate
			</button>
		</div>
	{/if}

	{#if generateState.warnings.length > 0 && generateState.status === 'idle'}
		<div class="warnings">
			{generateState.warnings.length} token{generateState.warnings.length === 1 ? '' : 's'} fell back to defaults
		</div>
	{/if}
</div>

<style>
	.prompt-bar {
		padding: 12px 20px;
		border-top: 1px solid #e5e5e5;
		background: white;
		flex-shrink: 0;
	}

	.input-row {
		display: flex;
		gap: 8px;
	}

	.input-row input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
	}

	.input-row input:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.input-row input:disabled {
		opacity: 0.5;
	}

	.generate-btn {
		padding: 8px 16px;
		background: #0ea5e9;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		font-family: inherit;
	}

	.generate-btn:hover:not(:disabled) {
		background: #0284c7;
	}

	.generate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.streaming-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #666;
		font-size: 14px;
	}

	.dot-pulse {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #0ea5e9;
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.3; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1.2); }
	}

	.cancel-btn {
		margin-left: auto;
		padding: 4px 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 13px;
		font-family: inherit;
	}

	.cancel-btn:hover {
		border-color: #ccc;
		background: #fafafa;
	}

	.error-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #ef4444;
		font-size: 13px;
	}

	.dismiss-btn {
		margin-left: auto;
		padding: 4px 12px;
		border: 1px solid #fecaca;
		border-radius: 6px;
		background: white;
		color: #ef4444;
		cursor: pointer;
		font-size: 13px;
		font-family: inherit;
	}

	.dismiss-btn:hover {
		background: #fef2f2;
	}

	.warnings {
		margin-top: 6px;
		font-size: 11px;
		color: #f59e0b;
	}
</style>
