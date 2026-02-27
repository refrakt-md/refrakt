<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';

	interface Props {
		onsave: () => void;
	}

	let { onsave }: Props = $props();

	let breadcrumbs = $derived(
		editorState.currentPath ? editorState.currentPath.split('/') : []
	);
</script>

<header class="header">
	<h1 class="header__logo"><span class="header__accent">refrakt</span> editor</h1>

	{#if editorState.currentPath}
		<nav class="header__breadcrumbs" aria-label="File path">
			{#each breadcrumbs as segment, i}
				{#if i > 0}
					<span class="header__sep">/</span>
				{/if}
				{#if i === breadcrumbs.length - 1}
					<span class="header__crumb header__crumb--current">
						<svg class="header__doc-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V6L9 1.5Z" />
							<polyline points="9 1.5 9 6 13.5 6" />
						</svg>
						{segment}
					</span>
				{:else}
					<span class="header__crumb">{segment}</span>
				{/if}
			{/each}
			{#if editorState.dirty}
				<span class="header__dot" title="Unsaved changes"></span>
			{/if}
		</nav>
	{/if}

	{#if editorState.error}
		<span class="header__error">{editorState.error}</span>
	{/if}

	<div class="header__spacer"></div>

	{#if editorState.currentPath}
		<button
			class="header__save"
			class:header__save--success={editorState.saveJustCompleted}
			onclick={onsave}
			disabled={!editorState.dirty || editorState.saving}
		>
			{#if editorState.saveJustCompleted}
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
				</svg>
				Saved
			{:else if editorState.saving}
				Saving...
			{:else}
				Save
			{/if}
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
		height: 52px;
		background: var(--ed-surface-0);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(0, 0, 0, 0.04);
		flex-shrink: 0;
		position: relative;
		z-index: 10;
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
		position: relative;
	}

	.header__accent::before {
		content: '';
		position: absolute;
		top: -1px;
		left: -8px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ed-accent);
	}

	/* Breadcrumbs */
	.header__breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		min-width: 0;
		overflow: hidden;
	}

	.header__sep {
		color: var(--ed-border-strong);
		flex-shrink: 0;
	}

	.header__crumb {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header__crumb--current {
		color: var(--ed-text-secondary);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.header__doc-icon {
		flex-shrink: 0;
		opacity: 0.6;
	}

	/* Unsaved dot */
	.header__dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--ed-unsaved);
		display: inline-block;
		flex-shrink: 0;
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
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

	/* Save button */
	.header__save {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2);
		padding: var(--ed-space-1) var(--ed-space-3);
		border: none;
		border-radius: var(--ed-radius-sm);
		background: var(--ed-accent);
		color: #ffffff;
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--ed-transition-fast), transform var(--ed-transition-fast);
		white-space: nowrap;
		box-shadow: var(--ed-shadow-sm);
		height: 30px;
	}

	.header__save:hover:not(:disabled) {
		background: var(--ed-accent-hover);
		transform: translateY(-0.5px);
	}

	.header__save:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.header__save--success {
		background: var(--ed-success);
	}

	.header__save--success:disabled {
		opacity: 1;
	}

	.header__kbd {
		font-size: 10px;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
		font-family: var(--ed-font-sans);
		line-height: 1;
	}


</style>
