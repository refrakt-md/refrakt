<script lang="ts">
	import ChatBlockEditor from './ChatBlockEditor.svelte';
	import type { PageStore } from './page.svelte.js';

	interface Props {
		pageStore: PageStore;
	}

	let { pageStore }: Props = $props();
</script>

<aside class="page-panel">
	<div class="page-panel__header">
		<h2 class="page-panel__title">Page</h2>
		{#if pageStore.page.body.trim()}
			<button class="page-panel__export" onclick={() => pageStore.exportPage()} title="Export as Markdoc">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M3 12v1.5h10V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		{/if}
		<button class="page-panel__close" onclick={() => pageStore.close()} title="Close page panel">
			&times;
		</button>
	</div>

	{#if !pageStore.page.body.trim()}
		<div class="page-panel__empty">
			<p>Pin blocks from AI responses to build your page.</p>
		</div>
	{:else}
		<div class="page-panel__meta">
			<input
				type="text"
				class="page-panel__meta-input"
				placeholder="Page title"
				value={pageStore.page.title}
				oninput={(e) => pageStore.updateMeta(e.currentTarget.value, pageStore.page.description)}
			/>
			<textarea
				class="page-panel__meta-textarea"
				placeholder="Description (optional)"
				rows="2"
				value={pageStore.page.description}
				oninput={(e) => pageStore.updateMeta(pageStore.page.title, e.currentTarget.value)}
			></textarea>
		</div>

		<div class="page-panel__editor">
			<ChatBlockEditor {pageStore} />
		</div>
	{/if}
</aside>

<style>
	.page-panel {
		flex: 1;
		min-width: 480px;
		max-width: 1280px;
		background: #ffffff;
		border-left: 1px solid var(--rf-color-border, #e2e8f0);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	@media (min-width: 1200px) {
		.page-panel {
			margin: 1.5rem;
			margin-left: auto;
			border-left: none;
			border: 1px solid var(--rf-color-border, #e2e8f0);
			border-radius: 1rem;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
		}
	}

	.page-panel__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.page-panel__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.page-panel__export {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
	}

	.page-panel__export:hover {
		color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-border, #e2e8f0);
	}

	.page-panel__close {
		margin-left: auto;
		background: transparent;
		border: none;
		font-size: 1.25rem;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		line-height: 1;
	}

	.page-panel__close:hover {
		color: var(--rf-color-text, #1e293b);
		background: var(--rf-color-border, #e2e8f0);
	}

	.page-panel__empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		text-align: center;
		color: var(--rf-color-text-muted, #94a3b8);
		font-size: 0.875rem;
	}

	.page-panel__meta {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.page-panel__meta-input,
	.page-panel__meta-textarea {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-family: inherit;
		background: transparent;
		color: inherit;
		resize: none;
	}

	.page-panel__meta-input:focus,
	.page-panel__meta-textarea:focus {
		outline: none;
		border-color: var(--rf-color-primary, #0ea5e9);
	}

	.page-panel__meta-input {
		font-weight: 600;
	}

	.page-panel__editor {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	@media (max-width: 768px) {
		.page-panel {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			min-width: 0;
			z-index: 100;
		}
	}
</style>
