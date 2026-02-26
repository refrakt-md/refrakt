<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';

	interface Props {
		onsave: () => void;
	}

	let { onsave }: Props = $props();
</script>

<header class="header">
	<h1 class="header__logo"><span class="header__accent">refrakt</span> editor</h1>

	{#if editorState.currentPath}
		<span class="header__file">
			{editorState.currentPath}
			{#if editorState.dirty}
				<span class="header__dot" title="Unsaved changes"></span>
			{/if}
		</span>
	{/if}

	{#if editorState.error}
		<span class="header__error">{editorState.error}</span>
	{/if}

	<div class="header__spacer"></div>

	{#if editorState.currentPath}
		<div class="header__viewports">
			<button
				class="header__device"
				class:header__device--active={editorState.viewport === 'desktop'}
				onclick={() => editorState.viewport = 'desktop'}
				title="Desktop"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<rect x="1.5" y="2" width="13" height="9" rx="1" />
					<line x1="5.5" y1="14" x2="10.5" y2="14" />
					<line x1="8" y1="11" x2="8" y2="14" />
				</svg>
			</button>
			<button
				class="header__device"
				class:header__device--active={editorState.viewport === 'tablet'}
				onclick={() => editorState.viewport = 'tablet'}
				title="Tablet"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="1.5" width="10" height="13" rx="1.5" />
					<line x1="7" y1="12.5" x2="9" y2="12.5" />
				</svg>
			</button>
			<button
				class="header__device"
				class:header__device--active={editorState.viewport === 'mobile'}
				onclick={() => editorState.viewport = 'mobile'}
				title="Mobile"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<rect x="4" y="1.5" width="8" height="13" rx="2" />
					<line x1="7" y1="12.5" x2="9" y2="12.5" />
				</svg>
			</button>
		</div>

		<button
			class="header__save"
			onclick={onsave}
			disabled={!editorState.dirty || editorState.saving}
		>
			{editorState.saving ? 'Saving...' : 'Save'}
			<kbd class="header__kbd">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}S</kbd>
		</button>
	{/if}
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		gap: var(--ed-space-4);
		padding: 0 var(--ed-space-5);
		height: 64px;
		background: var(--ed-surface-1);
		border-bottom: 1px solid var(--ed-border-default);
		flex-shrink: 0;
	}

	.header__logo {
		font-size: var(--ed-text-md);
		font-weight: 600;
		letter-spacing: 0.05em;
		color: var(--ed-text-tertiary);
		white-space: nowrap;
	}

	.header__accent {
		color: var(--ed-accent);
	}

	.header__file {
		font-size: var(--ed-text-base);
		color: var(--ed-text-tertiary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.header__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--ed-unsaved);
		display: inline-block;
	}

	.header__error {
		font-size: var(--ed-text-sm);
		color: var(--ed-danger-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 300px;
	}

	.header__spacer {
		flex: 1;
	}

	.header__save {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2);
		padding: var(--ed-space-2) var(--ed-space-4);
		border: 1px solid var(--ed-accent);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-accent);
		color: #ffffff;
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--ed-transition-fast);
		white-space: nowrap;
		box-shadow: var(--ed-shadow-sm);
	}

	.header__save:hover:not(:disabled) {
		background: var(--ed-accent-hover);
	}

	.header__save:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.header__kbd {
		font-size: var(--ed-text-xs);
		padding: 0.1rem 0.3rem;
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-1);
		color: var(--ed-text-tertiary);
		font-family: var(--ed-font-sans);
	}

	.header__viewports {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.header__device {
		display: flex;
		align-items: center;
		padding: var(--ed-space-1);
		border: none;
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-muted);
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.header__device:hover {
		background: var(--ed-surface-3);
		color: var(--ed-text-tertiary);
	}

	.header__device--active {
		background: var(--ed-surface-3);
		color: var(--ed-accent);
	}

	.header__device--active:hover {
		color: var(--ed-accent);
	}
</style>
