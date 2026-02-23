<script lang="ts">
	import { getTokensByCategory } from '$lib/tokens.js';
	import { themeState } from '$lib/state/theme.svelte.js';
	import TokenGroup from '$lib/TokenGroup.svelte';
	import PreviewPanel from '$lib/PreviewPanel.svelte';
	import PromptBar from '$lib/PromptBar.svelte';
	import ExportPanel from '$lib/ExportPanel.svelte';

	const tokenGroups = getTokensByCategory();
	const categories = [...tokenGroups.entries()];

	let showExport = $state(false);
</script>

<div class="studio">
	<header class="studio-header">
		<div class="header-left">
			<h1 class="logo">Theme Studio</h1>
		</div>
		<div class="header-center">
			<input
				type="text"
				class="theme-name"
				bind:value={themeState.name}
				placeholder="Theme name"
			/>
		</div>
		<div class="header-right">
			<button
				class="mode-toggle"
				onclick={() => themeState.toggleMode()}
				title="Toggle light/dark mode"
			>
				{#if themeState.mode === 'light'}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="5" />
						<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
					</svg>
					<span>Light</span>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
					<span>Dark</span>
				{/if}
			</button>
			<button class="export-btn" onclick={() => (showExport = true)}>
				Export
			</button>
			<button class="reset-all-btn" onclick={() => themeState.resetAll()}>
				Reset All
			</button>
		</div>
	</header>

	<div class="studio-body">
		<aside class="sidebar">
			{#each categories as [category, tokens], i (category)}
				<TokenGroup {category} {tokens} defaultOpen={i === 0} />
			{/each}
		</aside>

		<main class="preview">
			<PreviewPanel />
		</main>
	</div>

	<PromptBar />
</div>

{#if showExport}
	<ExportPanel onclose={() => (showExport = false)} />
{/if}

<style>
	.studio {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.studio-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 20px;
		background: white;
		border-bottom: 1px solid #e5e5e5;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.logo {
		font-size: 16px;
		font-weight: 700;
		margin: 0;
		color: #1a1a2e;
	}

	.header-center {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.theme-name {
		font-size: 14px;
		font-weight: 600;
		padding: 6px 12px;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		text-align: center;
		color: #333;
		min-width: 200px;
	}

	.theme-name:hover {
		border-color: #e5e5e5;
	}

	.theme-name:focus {
		outline: none;
		border-color: #0ea5e9;
		background: white;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mode-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 13px;
		color: #555;
	}

	.mode-toggle:hover {
		border-color: #ccc;
		background: #fafafa;
	}

	.export-btn {
		padding: 6px 12px;
		border: 1px solid #0ea5e9;
		border-radius: 6px;
		background: #0ea5e9;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: white;
	}

	.export-btn:hover {
		background: #0284c7;
		border-color: #0284c7;
	}

	.reset-all-btn {
		padding: 6px 12px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 13px;
		color: #999;
	}

	.reset-all-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.studio-body {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		width: 340px;
		flex-shrink: 0;
		overflow-y: auto;
		padding: 16px;
		border-right: 1px solid #e5e5e5;
		background: #fafafa;
	}

	.preview {
		flex: 1;
		display: flex;
		padding: 16px;
		overflow: hidden;
	}
</style>
