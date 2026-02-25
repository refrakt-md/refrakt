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
		gap: 1rem;
		padding: 0 1.25rem;
		height: 48px;
		background: #ffffff;
		border-bottom: 1px solid #e2e8f0;
		flex-shrink: 0;
	}

	.header__logo {
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		color: #64748b;
		white-space: nowrap;
	}

	.header__accent {
		color: #0ea5e9;
	}

	.header__file {
		font-size: 0.8rem;
		color: #64748b;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.header__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f59e0b;
		display: inline-block;
	}

	.header__error {
		font-size: 0.75rem;
		color: #b91c1c;
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
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		background: #ffffff;
		color: #1a1a2e;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.header__save:hover:not(:disabled) {
		background: #f1f5f9;
	}

	.header__save:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.header__kbd {
		font-size: 0.65rem;
		padding: 0.1rem 0.3rem;
		border: 1px solid #e2e8f0;
		border-radius: 3px;
		background: #f8fafc;
		color: #64748b;
		font-family: system-ui;
	}
</style>
