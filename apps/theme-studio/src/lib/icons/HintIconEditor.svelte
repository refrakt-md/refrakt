<script lang="ts">
	import { themeState } from '../state/theme.svelte.js';
	import { luminaConfig } from '@refrakt-md/lumina/transform';
	import IconPicker from './IconPicker.svelte';
	import SvgUpload from './SvgUpload.svelte';

	const HINT_VARIANTS = ['note', 'warning', 'caution', 'check'] as const;
	const VARIANT_COLORS: Record<string, string> = {
		note: '#0ea5e9',
		warning: '#f59e0b',
		caution: '#ef4444',
		check: '#22c55e',
	};

	const defaultHintIcons = luminaConfig.icons.hint ?? {};

	let editingVariant: string | null = $state(null);
	let editMode: 'pick' | 'upload' = $state('pick');

	function getCurrentIcon(variant: string): string {
		return themeState.iconOverrides['hint']?.[variant] ?? defaultHintIcons[variant] ?? '';
	}

	function isOverridden(variant: string): boolean {
		return !!themeState.iconOverrides['hint']?.[variant];
	}

	function handleIconPicked(_name: string, svg: string) {
		if (editingVariant) {
			themeState.updateIcon('hint', editingVariant, svg);
			editingVariant = null;
		}
	}

	function handleUpload(svg: string) {
		if (editingVariant) {
			themeState.updateIcon('hint', editingVariant, svg);
			editingVariant = null;
		}
	}

	function handleReset(variant: string) {
		themeState.removeIcon('hint', variant);
	}

	function startEditing(variant: string) {
		editingVariant = variant;
		editMode = 'pick';
	}
</script>

<div class="hint-editor">
	<p class="description">
		Replace the icons used for hint callout variants. Changes update
		the CSS <code>mask-image</code> rules live in the preview.
	</p>

	<div class="variant-list">
		{#each HINT_VARIANTS as variant (variant)}
			{@const svg = getCurrentIcon(variant)}
			{@const overridden = isOverridden(variant)}
			<div class="variant-row" class:overridden>
				<div
					class="variant-icon"
					style="color: {VARIANT_COLORS[variant]}"
				>
					{@html svg}
				</div>
				<div class="variant-info">
					<span class="variant-name">{variant}</span>
					{#if overridden}
						<span class="override-badge">custom</span>
					{/if}
				</div>
				<div class="variant-actions">
					<button
						class="change-btn"
						class:active={editingVariant === variant}
						onclick={() =>
							editingVariant === variant
								? (editingVariant = null)
								: startEditing(variant)}
					>
						{editingVariant === variant ? 'Close' : 'Change'}
					</button>
					{#if overridden}
						<button
							class="reset-btn"
							onclick={() => handleReset(variant)}
						>
							Reset
						</button>
					{/if}
				</div>
			</div>

			{#if editingVariant === variant}
				<div class="edit-panel">
					<div class="edit-tabs">
						<button
							class="edit-tab"
							class:active={editMode === 'pick'}
							onclick={() => (editMode = 'pick')}
						>
							Pick from library
						</button>
						<button
							class="edit-tab"
							class:active={editMode === 'upload'}
							onclick={() => (editMode = 'upload')}
						>
							Upload SVG
						</button>
					</div>
					{#if editMode === 'pick'}
						<IconPicker
							onselect={handleIconPicked}
							oncancel={() => (editingVariant = null)}
						/>
					{:else}
						<SvgUpload
							onupload={handleUpload}
							oncancel={() => (editingVariant = null)}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.hint-editor {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.description {
		font-size: 12px;
		color: #777;
		line-height: 1.5;
		margin: 0;
	}

	.description code {
		font-size: 11px;
		background: #f0f0f0;
		padding: 1px 4px;
		border-radius: 3px;
	}

	.variant-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.variant-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
	}

	.variant-row.overridden {
		border-color: #bfdbfe;
		background: #f8fbff;
	}

	.variant-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
	}

	.variant-icon :global(svg) {
		width: 20px;
		height: 20px;
	}

	.variant-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.variant-name {
		font-size: 13px;
		font-weight: 600;
		color: #333;
		text-transform: capitalize;
	}

	.override-badge {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 1px 5px;
		border-radius: 8px;
		background: #dbeafe;
		color: #2563eb;
	}

	.variant-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.change-btn {
		padding: 3px 8px;
		border: 1px solid #e5e5e5;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 11px;
		color: #555;
	}

	.change-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.change-btn.active {
		border-color: #0ea5e9;
		color: #0ea5e9;
		background: #f0f9ff;
	}

	.reset-btn {
		padding: 3px 8px;
		border: 1px solid #e5e5e5;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 11px;
		color: #999;
	}

	.reset-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.edit-panel {
		padding: 8px;
		margin-bottom: 4px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.edit-tabs {
		display: flex;
		gap: 2px;
	}

	.edit-tab {
		padding: 4px 8px;
		border: 1px solid #e5e5e5;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 11px;
		color: #777;
	}

	.edit-tab:hover {
		border-color: #ccc;
	}

	.edit-tab.active {
		border-color: #0ea5e9;
		color: #0ea5e9;
		background: #f0f9ff;
	}
</style>
