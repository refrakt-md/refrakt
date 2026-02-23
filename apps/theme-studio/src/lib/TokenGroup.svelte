<script lang="ts">
	import type { TokenDefinition, TokenCategory } from './tokens.js';
	import { categoryLabels } from './tokens.js';
	import { themeState } from './state/theme.svelte.js';
	import TokenEditor from './TokenEditor.svelte';

	let {
		category,
		tokens,
		defaultOpen = false,
	}: {
		category: TokenCategory;
		tokens: TokenDefinition[];
		defaultOpen?: boolean;
	} = $props();

	let open = $state(defaultOpen);

	let overrideCount = $derived(
		tokens.filter((t) => themeState.currentOverrides.has(t.name)).length,
	);

	/** Color swatches for collapsed preview */
	let swatchTokens = $derived(
		tokens.filter((t) => t.type === 'color').slice(0, 8),
	);
</script>

<div class="token-group">
	<button class="group-header" onclick={() => (open = !open)}>
		<svg
			class="chevron"
			class:open
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M9 18l6-6-6-6" />
		</svg>
		<span class="group-label">{categoryLabels[category]}</span>
		<span class="group-count">{tokens.length}</span>
		{#if overrideCount > 0}
			<span class="override-badge">{overrideCount} edited</span>
		{/if}
	</button>

	{#if !open && swatchTokens.length > 0}
		<div class="swatches">
			{#each swatchTokens as token}
				<div
					class="swatch"
					style:background={themeState.currentTokens[token.name]}
					title={token.cssVar}
				></div>
			{/each}
		</div>
	{/if}

	{#if open}
		<div class="group-body">
			{#each tokens as token (token.name)}
				<TokenEditor {token} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.token-group {
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		background: white;
		margin-bottom: 8px;
		overflow: hidden;
	}
	.group-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: #333;
		text-align: left;
	}
	.group-header:hover {
		background: #fafafa;
	}
	.chevron {
		transition: transform 0.15s;
		flex-shrink: 0;
		color: #999;
	}
	.chevron.open {
		transform: rotate(90deg);
	}
	.group-label {
		flex: 1;
	}
	.group-count {
		font-size: 11px;
		color: #999;
		font-weight: 400;
	}
	.override-badge {
		font-size: 10px;
		background: #e0f2fe;
		color: #0284c7;
		padding: 1px 6px;
		border-radius: 9999px;
		font-weight: 500;
	}
	.swatches {
		display: flex;
		gap: 3px;
		padding: 0 12px 10px;
	}
	.swatch {
		width: 18px;
		height: 18px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}
	.group-body {
		padding: 4px 12px 12px;
		border-top: 1px solid #eee;
	}
</style>
