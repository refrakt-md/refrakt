<script lang="ts">
	import type { TokenDefinition } from './tokens.js';
	import { themeState } from './state/theme.svelte.js';

	let { token }: { token: TokenDefinition } = $props();

	let value = $derived(themeState.currentTokens[token.name]);
	let isOverridden = $derived(themeState.currentOverrides.has(token.name));

	function onInput(e: Event) {
		const target = e.target as HTMLInputElement;
		themeState.updateToken(token.name, target.value);
	}

	function onColorInput(e: Event) {
		const target = e.target as HTMLInputElement;
		themeState.updateToken(token.name, target.value);
	}

	function reset() {
		themeState.resetToken(token.name);
	}
</script>

<div class="token-editor" class:overridden={isOverridden}>
	<div class="token-header">
		<span class="token-name">{token.cssVar}</span>
		{#if isOverridden}
			<button class="reset-btn" onclick={reset} title="Reset to default">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
			</button>
		{/if}
	</div>
	<div class="token-controls">
		{#if token.type === 'color'}
			<input
				type="color"
				value={value.startsWith('#') ? value : '#000000'}
				oninput={onColorInput}
				class="color-picker"
			/>
		{/if}
		<input
			type="text"
			{value}
			oninput={onInput}
			class="text-input"
			class:wide={token.type !== 'color'}
		/>
	</div>
	<div class="token-desc">{token.description}</div>
</div>

<style>
	.token-editor {
		padding: 8px 0;
		border-bottom: 1px solid #eee;
	}
	.token-editor:last-child {
		border-bottom: none;
	}
	.token-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 4px;
	}
	.token-name {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: #555;
	}
	.overridden .token-name {
		color: #0ea5e9;
		font-weight: 600;
	}
	.token-controls {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.color-picker {
		width: 32px;
		height: 28px;
		padding: 1px;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
		flex-shrink: 0;
	}
	.text-input {
		flex: 1;
		padding: 4px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		background: white;
	}
	.text-input.wide {
		width: 100%;
	}
	.text-input:focus {
		outline: none;
		border-color: #0ea5e9;
	}
	.token-desc {
		font-size: 11px;
		color: #999;
		margin-top: 2px;
	}
	.reset-btn {
		background: none;
		border: none;
		color: #999;
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
	}
	.reset-btn:hover {
		color: #ef4444;
	}
</style>
