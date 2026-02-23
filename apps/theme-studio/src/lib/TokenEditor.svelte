<script lang="ts">
	import type { TokenDefinition } from './tokens.js';
	import { themeState } from './state/theme.svelte.js';
	import ColorEditor from './editors/ColorEditor.svelte';
	import FontEditor from './editors/FontEditor.svelte';
	import RadiusEditor from './editors/RadiusEditor.svelte';
	import ShadowEditor from './editors/ShadowEditor.svelte';

	let { token }: { token: TokenDefinition } = $props();

	let value = $derived(themeState.currentTokens[token.name]);
	let isOverridden = $derived(themeState.currentOverrides.has(token.name));

	function update(v: string) {
		themeState.updateToken(token.name, v);
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
			<ColorEditor {value} onchange={update} />
		{:else if token.type === 'font'}
			<FontEditor {value} onchange={update} category={token.name === 'font-mono' ? 'mono' : 'sans'} />
		{:else if token.type === 'size'}
			<RadiusEditor {value} onchange={update} tokenName={token.name} />
		{:else if token.type === 'shadow'}
			<ShadowEditor {value} onchange={update} />
		{/if}
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
		margin-bottom: 2px;
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
