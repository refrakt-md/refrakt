<script lang="ts">
	import { themeState } from '../state/theme.svelte.js';
	import { luminaConfig } from '@refrakt-md/lumina/transform';
	import SvgUpload from './SvgUpload.svelte';

	let search = $state('');
	let showUpload = $state(false);
	let iconName = $state('');

	const builtinIcons = luminaConfig.icons.global ?? {};

	let allIcons = $derived(() => {
		const customs = themeState.iconOverrides['global'] ?? {};
		return { ...builtinIcons, ...customs };
	});

	let customNames = $derived(
		new Set(Object.keys(themeState.iconOverrides['global'] ?? {})),
	);

	let filteredIcons = $derived(
		Object.entries(allIcons()).filter(([name]) =>
			name.toLowerCase().includes(search.toLowerCase()),
		),
	);

	let customCount = $derived(customNames.size);

	function handleUpload(svg: string) {
		const name = iconName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
		if (!name) return;
		themeState.updateIcon('global', name, svg);
		showUpload = false;
		iconName = '';
	}

	function removeCustomIcon(name: string) {
		themeState.removeIcon('global', name);
	}
</script>

<div class="global-browser">
	<p class="description">
		Browse the {Object.keys(builtinIcons).length} built-in Lucide icons.
		Upload custom icons to add to the global registry.
	</p>

	<div class="toolbar">
		<input
			type="text"
			class="search"
			bind:value={search}
			placeholder="Search icons..."
		/>
		<button
			class="upload-btn"
			class:active={showUpload}
			onclick={() => (showUpload = !showUpload)}
		>
			{showUpload ? 'Close' : 'Upload'}
		</button>
	</div>

	{#if showUpload}
		<div class="upload-section">
			<div class="name-field">
				<label for="icon-name">Icon name</label>
				<input
					id="icon-name"
					type="text"
					bind:value={iconName}
					placeholder="e.g. brand-logo"
				/>
			</div>
			<SvgUpload
				onupload={handleUpload}
				oncancel={() => (showUpload = false)}
			/>
		</div>
	{/if}

	{#if customCount > 0}
		<div class="custom-section">
			<span class="section-label">Custom icons ({customCount})</span>
			<div class="icon-grid compact">
				{#each Object.entries(themeState.iconOverrides['global'] ?? {}) as [name, svg] (name)}
					<div class="icon-cell custom" title="{name} (custom)">
						<span class="icon-preview">{@html svg}</span>
						<span class="icon-label">{name}</span>
						<button
							class="remove-btn"
							title="Remove custom icon"
							onclick={() => removeCustomIcon(name)}
						>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="section-label">Library ({filteredIcons.length})</div>
	<div class="icon-grid">
		{#each filteredIcons as [name, svg] (name)}
			<div
				class="icon-cell"
				class:custom={customNames.has(name)}
				title={name}
			>
				<span class="icon-preview">{@html svg}</span>
				<span class="icon-label">{name}</span>
			</div>
		{/each}
		{#if filteredIcons.length === 0}
			<div class="no-results">No icons match "{search}"</div>
		{/if}
	</div>
</div>

<style>
	.global-browser {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.description {
		font-size: 12px;
		color: #777;
		line-height: 1.5;
		margin: 0;
	}

	.toolbar {
		display: flex;
		gap: 6px;
	}

	.search {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		font-size: 12px;
		background: white;
		color: #333;
	}

	.search:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.upload-btn {
		padding: 6px 12px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		font-weight: 600;
		color: #555;
		white-space: nowrap;
	}

	.upload-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.upload-btn.active {
		border-color: #0ea5e9;
		color: #0ea5e9;
		background: #f0f9ff;
	}

	.upload-section {
		padding: 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.name-field {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.name-field label {
		font-size: 11px;
		font-weight: 600;
		color: #999;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.name-field input {
		padding: 5px 8px;
		border: 1px solid #e5e5e5;
		border-radius: 4px;
		font-size: 12px;
		color: #333;
		background: white;
	}

	.name-field input:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.custom-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		color: #999;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 2px;
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		padding: 4px;
	}

	.icon-grid.compact {
		max-height: 120px;
	}

	.icon-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 2px;
		border: 1px solid transparent;
		border-radius: 4px;
	}

	.icon-cell.custom {
		background: #f0f9ff;
		border-color: #bfdbfe;
	}

	.icon-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		color: #555;
	}

	.icon-preview :global(svg) {
		width: 20px;
		height: 20px;
	}

	.icon-label {
		font-size: 8px;
		color: #999;
		text-align: center;
		line-height: 1.1;
		max-width: 56px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove-btn {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 14px;
		height: 14px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: #ef4444;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
	}

	.icon-cell.custom:hover .remove-btn {
		opacity: 1;
	}

	.no-results {
		grid-column: 1 / -1;
		text-align: center;
		color: #999;
		font-size: 12px;
		padding: 16px;
	}
</style>
