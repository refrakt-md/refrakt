<script lang="ts">
	import { themeState } from './state/theme.svelte.js';
	import {
		generateBaseCss,
		generateDarkCss,
		buildThemeZip,
		downloadBlob,
		toPackageName,
	} from './export.js';

	let { onclose }: { onclose: () => void } = $props();

	let activeTab: 'css' | 'download' = $state('css');
	let cssSection: 'base' | 'dark' | 'full' = $state('base');
	let copiedSection: string | null = $state(null);
	let downloading = $state(false);

	let baseCss = $derived(generateBaseCss(themeState.tokens.light));
	let darkCss = $derived(generateDarkCss(themeState.tokens.dark));
	let fullCss = $derived(`${baseCss}\n\n${darkCss}`);
	let pkgName = $derived(toPackageName(themeState.name));

	let displayedCss = $derived(
		cssSection === 'base' ? baseCss : cssSection === 'dark' ? darkCss : fullCss,
	);

	async function copyToClipboard(text: string, section: string) {
		await navigator.clipboard.writeText(text);
		copiedSection = section;
		setTimeout(() => (copiedSection = null), 2000);
	}

	async function handleDownload() {
		downloading = true;
		try {
			const blob = await buildThemeZip({
				name: themeState.name,
				description: themeState.description,
				lightTokens: themeState.tokens.light,
				darkTokens: themeState.tokens.dark,
			});
			downloadBlob(blob, `${pkgName}.zip`);
		} finally {
			downloading = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('export-backdrop')) {
			onclose();
		}
	}
</script>

<div class="export-backdrop" onclick={handleBackdropClick} role="presentation">
	<div class="export-modal">
		<div class="modal-header">
			<h2>Export Theme</h2>
			<button class="close-btn" onclick={onclose}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
		</div>

		<div class="tab-bar">
			<button class="tab" class:active={activeTab === 'css'} onclick={() => (activeTab = 'css')}>
				CSS
			</button>
			<button
				class="tab"
				class:active={activeTab === 'download'}
				onclick={() => (activeTab = 'download')}
			>
				Download
			</button>
		</div>

		{#if activeTab === 'css'}
			<div class="css-panel">
				<div class="css-tabs">
					<button
						class="css-tab"
						class:active={cssSection === 'base'}
						onclick={() => (cssSection = 'base')}
					>
						base.css
					</button>
					<button
						class="css-tab"
						class:active={cssSection === 'dark'}
						onclick={() => (cssSection = 'dark')}
					>
						dark.css
					</button>
					<button
						class="css-tab"
						class:active={cssSection === 'full'}
						onclick={() => (cssSection = 'full')}
					>
						Full
					</button>
					<button
						class="copy-btn"
						onclick={() => copyToClipboard(displayedCss, cssSection)}
					>
						{copiedSection === cssSection ? 'Copied!' : 'Copy'}
					</button>
				</div>
				<pre class="css-code"><code>{displayedCss}</code></pre>
			</div>
		{:else}
			<div class="download-panel">
				<div class="field">
					<label for="theme-name">Theme name</label>
					<input id="theme-name" type="text" bind:value={themeState.name} />
				</div>

				<div class="field">
					<label>Package name</label>
					<div class="pkg-name">{pkgName}</div>
				</div>

				<div class="file-tree">
					<div class="tree-label">Package contents</div>
					<div class="tree">
						<div class="tree-item">{pkgName}/</div>
						<div class="tree-item indent">package.json</div>
						<div class="tree-item indent">manifest.json</div>
						<div class="tree-item indent">index.css</div>
						<div class="tree-item indent">base.css</div>
						<div class="tree-item indent">tokens/</div>
						<div class="tree-item indent2">base.css</div>
						<div class="tree-item indent2">dark.css</div>
						<div class="tree-item indent">svelte/</div>
						<div class="tree-item indent2">tokens.css</div>
					</div>
				</div>

				<button class="download-btn" onclick={handleDownload} disabled={downloading}>
					{downloading ? 'Generating...' : 'Download ZIP'}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.export-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.export-modal {
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		width: 640px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e5e5e5;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: #1a1a2e;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: none;
		border-radius: 6px;
		cursor: pointer;
		color: #999;
	}

	.close-btn:hover {
		background: #f5f5f5;
		color: #333;
	}

	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 1px solid #e5e5e5;
		padding: 0 20px;
	}

	.tab {
		padding: 10px 16px;
		border: none;
		background: none;
		font-size: 13px;
		font-weight: 600;
		color: #999;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
	}

	.tab:hover {
		color: #555;
	}

	.tab.active {
		color: #1a1a2e;
		border-bottom-color: #0ea5e9;
	}

	/* CSS Panel */
	.css-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.css-tabs {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 12px 20px 0;
	}

	.css-tab {
		padding: 4px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		color: #777;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.css-tab:hover {
		border-color: #ccc;
		background: #fafafa;
	}

	.css-tab.active {
		border-color: #0ea5e9;
		color: #0ea5e9;
		background: #f0f9ff;
	}

	.copy-btn {
		margin-left: auto;
		padding: 4px 12px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		color: #555;
	}

	.copy-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.css-code {
		flex: 1;
		overflow: auto;
		margin: 12px 20px 20px;
		padding: 16px;
		background: #f8f8f8;
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 12px;
		line-height: 1.6;
		color: #333;
		white-space: pre;
		tab-size: 2;
	}

	/* Download Panel */
	.download-panel {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field label {
		font-size: 12px;
		font-weight: 600;
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.field input {
		padding: 8px 12px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		font-size: 14px;
		color: #333;
	}

	.field input:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.pkg-name {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 14px;
		color: #0ea5e9;
		padding: 8px 12px;
		background: #f0f9ff;
		border-radius: 6px;
	}

	.file-tree {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tree-label {
		font-size: 12px;
		font-weight: 600;
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.tree {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 12px;
		color: #555;
		background: #f8f8f8;
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		padding: 12px 16px;
		line-height: 1.8;
	}

	.tree-item {
		white-space: nowrap;
	}

	.tree-item.indent {
		padding-left: 16px;
	}

	.tree-item.indent2 {
		padding-left: 32px;
	}

	.download-btn {
		padding: 10px 20px;
		border: none;
		border-radius: 8px;
		background: #0ea5e9;
		color: white;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		align-self: flex-start;
	}

	.download-btn:hover {
		background: #0284c7;
	}

	.download-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
