<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import { fetchPreviewHtml, fetchPreviewData } from '../api/client.js';

	let { onnavigate }: { onnavigate?: (path: string) => void } = $props();

	let previewHtml = $state('');
	let previewIframe: HTMLIFrameElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;
	let pageMap: Map<string, string> = new Map(); // url → file path

	// Viewport presets
	const VIEWPORT_WIDTHS: Record<string, number | null> = {
		desktop: null,
		tablet: 768,
		mobile: 375,
	};

	const constrained = $derived(editorState.viewport !== 'desktop');
	const viewportWidth = $derived(VIEWPORT_WIDTHS[editorState.viewport]);

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
{:else}
	<div class="preview__viewport" class:preview__viewport--constrained={constrained}>
		{#if editorState.previewRuntimeAvailable}
			<iframe
				bind:this={previewIframe}
				title="Preview"
				src="/preview/"
				class="preview__iframe"
				class:preview__iframe--constrained={constrained}
				style={constrained ? `width: ${viewportWidth}px; max-width: 100%;` : ''}
			></iframe>
		{:else}
			<iframe
				title="Preview"
				srcdoc={previewHtml}
				class="preview__iframe"
				class:preview__iframe--constrained={constrained}
				style={constrained ? `width: ${viewportWidth}px; max-width: 100%;` : ''}
			></iframe>
		{/if}
	</div>
{/if}

<style>
	.preview__viewport {
		flex: 1;
		overflow: hidden;
	}

	.preview__viewport--constrained {
		display: flex;
		justify-content: center;
		padding: var(--ed-space-4);
	}

	.preview__iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: var(--ed-surface-0);
	}

	.preview__iframe--constrained {
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-lg);
		box-shadow: var(--ed-shadow-sm);
	}

	.preview__empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: var(--ed-surface-1);
	}

	.preview__empty-text {
		color: var(--ed-text-muted);
		font-size: var(--ed-text-md);
	}
</style>
