<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import { fetchPreviewHtml, fetchPreviewData } from '../api/client.js';

	let { onnavigate }: { onnavigate?: (path: string) => void } = $props();

	let previewHtml = $state('');
	let previewIframe: HTMLIFrameElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;
	let pageMap: Map<string, string> = new Map(); // url → file path

	// Listen for messages from the preview runtime iframe
	$effect(() => {
		function onMessage(e: MessageEvent) {
			if (e.data?.type === 'preview-ready') {
				editorState.previewRuntimeReady = true;
			} else if (e.data?.type === 'preview-navigate') {
				const href = e.data.href as string;
				const filePath = pageMap.get(href);
				if (filePath && onnavigate) onnavigate(filePath);
			}
		}
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	// Determine which mode to use
	const useRuntime = $derived(
		editorState.previewRuntimeAvailable && editorState.previewRuntimeReady,
	);

	// Main preview effect — debounces content changes
	$effect(() => {
		const path = editorState.currentPath;
		const content = editorState.editorContent;
		// Read useRuntime to re-trigger when mode changes
		const runtime = useRuntime;
		if (!path || !content) {
			previewHtml = '';
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				if (runtime) {
					// Svelte preview runtime — send data via postMessage
					const data = await fetchPreviewData(path, content) as any;
					if (data.pages) {
						pageMap = new Map(data.pages.map((p: any) => [p.url, p.path]));
					}
					previewIframe?.contentWindow?.postMessage(
						{ type: 'preview-update', page: data },
						'*',
					);
				} else {
					// HTML fallback — use srcdoc
					previewHtml = await fetchPreviewHtml(path, content);
				}
			} catch {
				// Ignore preview errors during typing
			}
		}, 400);

		return () => clearTimeout(debounceTimer);
	});
</script>

{#if !editorState.currentPath}
	<div class="preview__empty">
		<span class="preview__empty-text">Select a page to preview</span>
	</div>
{:else if editorState.previewRuntimeAvailable}
	<iframe
		bind:this={previewIframe}
		title="Preview"
		src="/preview/"
		class="preview__iframe"
	></iframe>
{:else}
	<iframe title="Preview" srcdoc={previewHtml} class="preview__iframe"></iframe>
{/if}

<style>
	.preview__iframe {
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
