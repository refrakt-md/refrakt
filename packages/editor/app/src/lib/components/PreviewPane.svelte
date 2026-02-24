<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import { fetchPreviewHtml } from '../api/client.js';

	let previewHtml = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		const path = editorState.currentPath;
		const content = editorState.editorContent;
		if (!path || !content) {
			previewHtml = '';
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				previewHtml = await fetchPreviewHtml(path, content);
			} catch {
				// Ignore preview errors during typing
			}
		}, 400);

		return () => clearTimeout(debounceTimer);
	});
</script>

{#if editorState.currentPath}
	<iframe title="Preview" srcdoc={previewHtml}></iframe>
{:else}
	<div class="preview__empty">
		<span class="preview__empty-text">Select a page to preview</span>
	</div>
{/if}

<style>
	iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: #ffffff;
	}

	.preview__empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: #ffffff;
	}

	.preview__empty-text {
		color: #94a3b8;
		font-size: 0.9rem;
	}
</style>
