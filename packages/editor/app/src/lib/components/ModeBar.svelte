<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';

	const isPreview = $derived(editorState.editorMode === 'preview');
	const isEdit = $derived(editorState.editorMode === 'blocks' || editorState.editorMode === 'code');
</script>

<div class="mode-bar">
	<div class="mode-bar__center">
		<button
			class="mode-bar__toggle"
			class:active={isPreview}
			onclick={() => { editorState.editorMode = 'preview'; }}
		>Preview</button>
		<button
			class="mode-bar__toggle"
			class:active={isEdit}
			onclick={() => { editorState.editorMode = 'blocks'; }}
		>Edit</button>
	</div>

	<div class="mode-bar__right">
		{#if isPreview}
			<div class="mode-bar__track">
				<button
					class="mode-bar__device"
					class:active={editorState.viewport === 'desktop'}
					onclick={() => editorState.viewport = 'desktop'}
					title="Desktop"
				>
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="1.5" y="2" width="13" height="9" rx="1" />
						<line x1="5.5" y1="14" x2="10.5" y2="14" />
						<line x1="8" y1="11" x2="8" y2="14" />
					</svg>
				</button>
				<button
					class="mode-bar__device"
					class:active={editorState.viewport === 'tablet'}
					onclick={() => editorState.viewport = 'tablet'}
					title="Tablet"
				>
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="1.5" width="10" height="13" rx="1.5" />
						<line x1="7" y1="12.5" x2="9" y2="12.5" />
					</svg>
				</button>
				<button
					class="mode-bar__device"
					class:active={editorState.viewport === 'mobile'}
					onclick={() => editorState.viewport = 'mobile'}
					title="Mobile"
				>
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="4" y="1.5" width="8" height="13" rx="2" />
						<line x1="7" y1="12.5" x2="9" y2="12.5" />
					</svg>
				</button>
			</div>
		{:else if isEdit}
			<div class="mode-bar__track">
				<button
					class="mode-bar__sub-btn"
					class:active={editorState.editorMode === 'code'}
					onclick={() => { editorState.editorMode = 'code'; }}
				>Code</button>
				<button
					class="mode-bar__sub-btn"
					class:active={editorState.editorMode === 'blocks'}
					onclick={() => { editorState.editorMode = 'blocks'; }}
				>Blocks</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.mode-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 36px;
		padding: 0 var(--ed-space-5);
		flex-shrink: 0;
		position: relative;
	}

	/* ── Center toggle (Preview | Edit) ─────────────────── */

	.mode-bar__center {
		display: inline-flex;
		gap: var(--ed-space-1);
	}

	.mode-bar__toggle {
		padding: var(--ed-space-1) var(--ed-space-3);
		border: none;
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: color var(--ed-transition-fast), background var(--ed-transition-fast);
		white-space: nowrap;
	}

	.mode-bar__toggle:hover:not(.active) {
		color: var(--ed-text-secondary);
	}

	.mode-bar__toggle.active {
		color: var(--ed-text-primary);
		background: var(--ed-surface-2);
	}

	/* ── Right-side controls ─────────────────────────────── */

	.mode-bar__right {
		position: absolute;
		right: var(--ed-space-5);
		top: 50%;
		transform: translateY(-50%);
	}

	.mode-bar__track {
		display: inline-flex;
		background: var(--ed-surface-2);
		border-radius: var(--ed-radius-md);
		padding: 2px;
		gap: 2px;
	}

	/* ── Viewport device buttons ─────────────────────────── */

	.mode-bar__device {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 24px;
		border: none;
		border-radius: calc(var(--ed-radius-md) - 2px);
		background: transparent;
		color: var(--ed-text-muted);
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.mode-bar__device:hover:not(.active) {
		color: var(--ed-text-tertiary);
	}

	.mode-bar__device.active {
		background: var(--ed-surface-0);
		color: var(--ed-accent);
		box-shadow: var(--ed-shadow-sm);
	}

	/* ── Code / Blocks sub-toggle ────────────────────────── */

	.mode-bar__sub-btn {
		padding: var(--ed-space-1) var(--ed-space-3);
		border: none;
		border-radius: calc(var(--ed-radius-md) - 2px);
		background: transparent;
		color: var(--ed-text-tertiary);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
		white-space: nowrap;
	}

	.mode-bar__sub-btn:hover:not(.active) {
		color: var(--ed-text-secondary);
	}

	.mode-bar__sub-btn.active {
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		box-shadow: var(--ed-shadow-sm);
	}
</style>
